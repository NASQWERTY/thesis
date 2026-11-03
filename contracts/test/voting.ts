import { expect } from "chai";
import { BIDDING_PERIOD, CID, networkHelpers, TOPIC, votingFixture, withIssueFixture } from "./helpers.js";

const { time } = networkHelpers;
const REJECT_ALL = 0n;

describe("HU-007 voting", function () {
  describe("castBallot", function () {
    it("stores a complete ranking and emits BallotCast", async function () {
      const { gov, alice, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
      const ranking = [erinBid, REJECT_ALL, carolBid];

      await expect(gov.connect(alice).castBallot(issueId, ranking))
        .to.emit(gov, "BallotCast")
        .withArgs(issueId, alice.address);

      const ballot = await gov.getBallot(issueId, alice.address);
      expect(ballot.cast).to.equal(true);
      expect(ballot.ranking).to.deep.equal(ranking);
    });

    it("accepts any order, with REJECT_ALL in any position", async function () {
      const { gov, alice, bob, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
      await expect(gov.connect(alice).castBallot(issueId, [REJECT_ALL, carolBid, erinBid])).to.emit(gov, "BallotCast");
      await expect(gov.connect(bob).castBallot(issueId, [carolBid, erinBid, REJECT_ALL])).to.emit(gov, "BallotCast");
    });

    it("on an issue without bids, the only ballot is [REJECT_ALL]", async function () {
      const { gov, alice, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
      await time.increaseTo(createdAt + BigInt(BIDDING_PERIOD));
      await expect(gov.connect(alice).castBallot(issueId, [REJECT_ALL])).to.emit(gov, "BallotCast");
    });

    it("lets a member who became ineligible after the snapshot vote (the snapshot rules)", async function () {
      const { gov, bob, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
      await gov.setEligibility(bob.address, false);
      await expect(gov.connect(bob).castBallot(issueId, [carolBid, erinBid, REJECT_ALL])).to.emit(gov, "BallotCast");
    });

    it("accepts a ballot in the first and in the last second of the voting period", async function () {
      const { gov, alice, bob, issueId, carolBid, erinBid, votingStart, votingEnd } =
        await networkHelpers.loadFixture(votingFixture);
      // votingFixture already moved the chain to votingStart; the next block is one second later.
      expect(BigInt(await time.latest())).to.equal(votingStart);
      await expect(gov.connect(alice).castBallot(issueId, [carolBid, erinBid, REJECT_ALL])).to.emit(gov, "BallotCast");

      await time.setNextBlockTimestamp(votingEnd - 1n);
      await expect(gov.connect(bob).castBallot(issueId, [carolBid, erinBid, REJECT_ALL])).to.emit(gov, "BallotCast");
    });

    it("returns an empty ballot for someone who did not vote", async function () {
      const { gov, alice, issueId } = await networkHelpers.loadFixture(votingFixture);
      const ballot = await gov.getBallot(issueId, alice.address);
      expect(ballot.cast).to.equal(false);
      expect(ballot.ranking).to.deep.equal([]);
    });

    describe("rejections", function () {
      it("rejects a member who was not eligible at the issue's creation", async function () {
        const { gov, alice, bob, dave, carol } = await networkHelpers.loadFixture(withIssueFixture);
        // Issue #2 is created by dave while bob is disabled (moroso).
        await gov.registerMember(dave.address, 1);
        await gov.setEligibility(bob.address, false);
        await gov.connect(dave).createIssue(CID, TOPIC, 1n);
        await gov.setEligibility(bob.address, true); // enabled again, but after the snapshot
        await gov.connect(carol).submitBid(2n, 1n, CID); // bid #1
        await time.increaseTo((await gov.issues(2n)).createdAt + BigInt(BIDDING_PERIOD));

        await expect(gov.connect(bob).castBallot(2n, [1n, REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "NotEligibleAtSnapshot")
          .withArgs(2n, bob.address);
        // alice was eligible at that snapshot: she can vote.
        await expect(gov.connect(alice).castBallot(2n, [REJECT_ALL, 1n])).to.emit(gov, "BallotCast");
      });

      it("rejects a member registered after the issue's creation", async function () {
        const { gov, dave, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
        await gov.registerMember(dave.address, 1);
        await expect(gov.connect(dave).castBallot(issueId, [carolBid, erinBid, REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "NotEligibleAtSnapshot")
          .withArgs(issueId, dave.address);
      });

      it("rejects a supplier", async function () {
        const { gov, carol, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
        await expect(gov.connect(carol).castBallot(issueId, [carolBid, erinBid, REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "NotEligibleAtSnapshot")
          .withArgs(issueId, carol.address);
      });

      it("rejects a second ballot on the same issue; the first one stays", async function () {
        const { gov, alice, issueId, carolBid, erinBid } = await networkHelpers.loadFixture(votingFixture);
        await gov.connect(alice).castBallot(issueId, [carolBid, erinBid, REJECT_ALL]);

        await expect(gov.connect(alice).castBallot(issueId, [REJECT_ALL, erinBid, carolBid]))
          .to.be.revertedWithCustomError(gov, "AlreadyVoted")
          .withArgs(issueId, alice.address);
        expect((await gov.getBallot(issueId, alice.address)).ranking).to.deep.equal([carolBid, erinBid, REJECT_ALL]);
      });

      it("rejects a ballot during the bidding phase", async function () {
        const { gov, alice, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(alice).castBallot(issueId, [REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "NotInVotingPhase")
          .withArgs(issueId);
      });

      it("rejects a ballot once the voting period is over", async function () {
        const { gov, alice, issueId, carolBid, erinBid, votingEnd } = await networkHelpers.loadFixture(votingFixture);
        await time.setNextBlockTimestamp(votingEnd);
        await expect(gov.connect(alice).castBallot(issueId, [carolBid, erinBid, REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "NotInVotingPhase")
          .withArgs(issueId);
      });

      it("rejects an issue that does not exist", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(votingFixture);
        await expect(gov.connect(alice).castBallot(9n, [REJECT_ALL]))
          .to.be.revertedWithCustomError(gov, "IssueNotFound")
          .withArgs(9n);
      });

      describe("incomplete or malformed ranking", function () {
        const cases: [string, (b: { carolBid: bigint; erinBid: bigint }) => bigint[]][] = [
          ["a candidate is missing", (b) => [b.carolBid, REJECT_ALL]],
          ["REJECT_ALL is missing", (b) => [b.carolBid, b.erinBid]],
          ["a candidate is repeated", (b) => [b.carolBid, b.carolBid, REJECT_ALL]],
          ["an unknown bid id", (b) => [b.carolBid, b.erinBid, 9n]],
          ["too many entries", (b) => [b.carolBid, b.erinBid, REJECT_ALL, REJECT_ALL]],
          ["it is empty", () => []],
        ];
        for (const [name, build] of cases) {
          it(`rejects it when ${name}`, async function () {
            const f = await networkHelpers.loadFixture(votingFixture);
            await expect(f.gov.connect(f.alice).castBallot(f.issueId, build(f)))
              .to.be.revertedWithCustomError(f.gov, "InvalidRanking")
              .withArgs(f.issueId);
          });
        }

        it("rejects a bid that belongs to another issue", async function () {
          const { gov, alice, bob, carol, issueId, carolBid } = await networkHelpers.loadFixture(votingFixture);
          await gov.connect(bob).createIssue(CID, TOPIC, 1n);
          await gov.connect(carol).submitBid(2n, 1n, CID); // bid #3, on issue 2

          await expect(gov.connect(alice).castBallot(issueId, [carolBid, 3n, REJECT_ALL]))
            .to.be.revertedWithCustomError(gov, "InvalidRanking")
            .withArgs(issueId);
        });
      });
    });
  });
});
