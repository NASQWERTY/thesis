import { expect } from "chai";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import { BIDDING_PERIOD, CID, DOC, ethers, networkHelpers, Phase, Status, TOPIC, VOTING_PERIOD } from "./helpers.js";

const { time } = networkHelpers;
const R = 0n; // REJECT_ALL in a ballot
const CEILING = ethers.parseEther("4");

// CloseReason as numbers.
const Reason = { None: 0n, NoBids: 1n, NoQuorum: 2n, NoUniqueWinner: 3n, RejectAllWon: 4n };

/**
 * Six members of weight 1 (m[0]..m[5], total 6: quorum 3, a delegate can receive one delegation)
 * and three suppliers; the treasury holds 10 ETH. No issue yet: each test sets up the registry
 * first, since the issue's snapshot freezes it.
 */
async function closeFixture() {
  const signers = await ethers.getSigners();
  const [registrar] = signers;
  const m = signers.slice(1, 7);
  const s = signers.slice(7, 10);
  const gov = await ethers.deployContract("CommunityGovernance", [50, BIDDING_PERIOD, VOTING_PERIOD]);
  for (const member of m) await gov.registerMember(member.address, 1);
  for (const supplier of s) await gov.registerSupplier(supplier.address);
  await registrar.sendTransaction({ to: gov, value: ethers.parseEther("10") });
  return { gov, registrar, m, s };
}

type Gov = Awaited<ReturnType<typeof closeFixture>>["gov"];

/** m[0] raises issue #1 (4 ETH); one bid per given supplier (3, 2, 1 ETH…); moves to voting. */
async function openVoting(gov: Gov, proposer: HardhatEthersSigner, suppliers: HardhatEthersSigner[]) {
  await gov.connect(proposer).createIssue(CID, TOPIC, CEILING);
  const createdAt = BigInt(await time.latest());
  const bidIds: bigint[] = [];
  for (const [i, supplier] of suppliers.entries()) {
    await gov.connect(supplier).submitBid(1n, ethers.parseEther(String(3 - i)), DOC);
    bidIds.push(BigInt(i + 1));
  }
  const votingEnd = createdAt + BigInt(BIDDING_PERIOD + VOTING_PERIOD);
  await time.increaseTo(createdAt + BigInt(BIDDING_PERIOD));
  return { issueId: 1n, bidIds, votingEnd };
}

/** Each [voter, ranking] pair casts its ballot. */
async function vote(gov: Gov, issueId: bigint, ballots: [HardhatEthersSigner, bigint[]][]) {
  for (const [voter, ranking] of ballots) await gov.connect(voter).castBallot(issueId, ranking);
}

describe("HU-008 close and award", function () {
  describe("closeIssue", function () {
    it("awards the winning bid: status, winningBidId, event, reservation kept until the transfer", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0], s[1]]);
      const [A, B] = bidIds;
      await vote(gov, issueId, [
        [m[0], [A, B, R]],
        [m[1], [A, R, B]],
        [m[2], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);

      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, A);

      const issue = await gov.issues(issueId);
      expect(issue.status).to.equal(Status.Awarded);
      expect(issue.winningBidId).to.equal(A);
      expect(issue.closeReason).to.equal(Reason.None);
      expect(await gov.reservedBalance()).to.equal(CEILING);
      expect(await gov.phaseOf(issueId)).to.equal(Phase.Closed);
    });

    it("can be called by anyone, not only members", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], R]],
        [m[1], [bidIds[0], R]],
        [m[2], [bidIds[0], R]],
      ]);
      await time.increaseTo(votingEnd);
      // A supplier, who is not in the registry.
      await expect(gov.connect(s[2]).closeIssue(issueId)).to.emit(gov, "IssueAwarded");
    });

    it("frees the proposer to raise another issue", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await time.increaseTo(votingEnd);
      await gov.closeIssue(issueId);

      expect(await gov.activeIssueOf(m[0].address)).to.equal(0n);
      await expect(gov.connect(m[0]).createIssue(CID, TOPIC, CEILING)).to.emit(gov, "IssueCreated");
    });

    it("closes before the deadline once all the eligible weight at the snapshot has voted", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds } = await openVoting(gov, m[0], [s[0]]);
      await vote(
        gov,
        issueId,
        m.map((member) => [member, [bidIds[0], R]]),
      );
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, bidIds[0]);
    });

    it("counts delegated weight as expressed for the early close", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.connect(m[5]).delegateTo(m[4].address);
      const { issueId, bidIds } = await openVoting(gov, m[0], [s[0]]);
      // Five ballots, but m[5]'s weight comes through m[4]: 6 of 6.
      await vote(
        gov,
        issueId,
        m.slice(0, 5).map((member) => [member, [bidIds[0], R]]),
      );
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded");
    });

    describe("rejections", function () {
      it("rejects closing during the bidding phase", async function () {
        const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
        await gov.connect(m[0]).createIssue(CID, TOPIC, CEILING);
        await gov.connect(s[0]).submitBid(1n, ethers.parseEther("3"), DOC);
        await expect(gov.closeIssue(1n)).to.be.revertedWithCustomError(gov, "VotingNotOver").withArgs(1n);
      });

      it("rejects closing during voting when not everyone has voted", async function () {
        const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
        const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
        await vote(
          gov,
          issueId,
          m.slice(0, 5).map((member) => [member, [bidIds[0], R]]),
        );
        await expect(gov.closeIssue(issueId)).to.be.revertedWithCustomError(gov, "VotingNotOver").withArgs(issueId);

        // In the last second of the voting period it is still early.
        await time.setNextBlockTimestamp(votingEnd - 1n);
        await expect(gov.closeIssue(issueId)).to.be.revertedWithCustomError(gov, "VotingNotOver");
      });

      it("rejects closing an issue twice, awarded or not", async function () {
        const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
        const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
        await vote(gov, issueId, [
          [m[0], [bidIds[0], R]],
          [m[1], [bidIds[0], R]],
          [m[2], [bidIds[0], R]],
        ]);
        await time.increaseTo(votingEnd);
        await gov.closeIssue(issueId);
        await expect(gov.closeIssue(issueId)).to.be.revertedWithCustomError(gov, "IssueNotOpen").withArgs(issueId);

        await gov.connect(m[1]).createIssue(CID, TOPIC, CEILING);
        await time.increase(BIDDING_PERIOD + VOTING_PERIOD);
        await gov.closeIssue(2n);
        await expect(gov.closeIssue(2n)).to.be.revertedWithCustomError(gov, "IssueNotOpen").withArgs(2n);
      });

      it("rejects an unknown issue", async function () {
        const { gov } = await networkHelpers.loadFixture(closeFixture);
        await expect(gov.closeIssue(7n)).to.be.revertedWithCustomError(gov, "IssueNotFound").withArgs(7n);
      });
    });
  });

  describe("closing without award releases the reservation and records the reason", function () {
    async function expectClosedWithoutAward(gov: Gov, issueId: bigint, reason: bigint) {
      const reservedBefore = await gov.reservedBalance();
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueClosedWithoutAward").withArgs(issueId, reason);
      const issue = await gov.issues(issueId);
      expect(issue.status).to.equal(Status.ClosedWithoutAward);
      expect(issue.closeReason).to.equal(reason);
      expect(issue.winningBidId).to.equal(0n);
      expect(await gov.reservedBalance()).to.equal(reservedBefore - CEILING);
      expect(await gov.activeIssueOf(issue.proposer)).to.equal(0n);
    }

    it("no bids → NoBids, even if everyone voted", async function () {
      const { gov, m } = await networkHelpers.loadFixture(closeFixture);
      const { issueId } = await openVoting(gov, m[0], []);
      await vote(
        gov,
        issueId,
        m.map((member) => [member, [R]]),
      );
      await expectClosedWithoutAward(gov, issueId, Reason.NoBids);
    });

    it("no quorum → NoQuorum (2 of 6 expressed, 3 needed)", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], R]],
        [m[1], [bidIds[0], R]],
      ]);
      await time.increaseTo(votingEnd);
      await expectClosedWithoutAward(gov, issueId, Reason.NoQuorum);
    });

    it("no ballots at all → NoQuorum", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await time.increaseTo(votingEnd);
      await expectClosedWithoutAward(gov, issueId, Reason.NoQuorum);
    });

    it("no unique winner (tie) → NoUniqueWinner", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0], s[1]]);
      const [A, B] = bidIds;
      await vote(gov, issueId, [
        [m[0], [A, B, R]],
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
        [m[3], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expectClosedWithoutAward(gov, issueId, Reason.NoUniqueWinner);
    });

    it("REJECT_ALL wins → RejectAllWon", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0], s[1]]);
      const [A, B] = bidIds;
      await vote(gov, issueId, [
        [m[0], [R, A, B]],
        [m[1], [R, B, A]],
        [m[2], [A, B, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expectClosedWithoutAward(gov, issueId, Reason.RejectAllWon);
    });
  });

  describe("quorum (ADR-0023)", function () {
    it("is reached with exactly 50 % of the weight at the snapshot", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], R]],
        [m[1], [bidIds[0], R]],
        [m[2], [bidIds[0], R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded");
    });

    it("rounds up: with a total of 7, 3 is not enough and 4 is", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.setWeight(m[5].address, 2); // total 7
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], R]],
        [m[1], [bidIds[0], R]],
        [m[2], [bidIds[0], R]],
      ]);
      const snapshot = await networkHelpers.takeSnapshot();
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueClosedWithoutAward").withArgs(issueId, Reason.NoQuorum);

      await snapshot.restore();
      await vote(gov, issueId, [[m[3], [bidIds[0], R]]]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded");
    });

    it("uses the total at the snapshot, not the current one", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], R]],
        [m[1], [bidIds[0], R]],
      ]);
      // After the snapshot the registry shrinks to 4: 2 would now be 50 %, but not of the snapshot's 6.
      await gov.removeMember(m[4].address);
      await gov.removeMember(m[5].address);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueClosedWithoutAward").withArgs(issueId, Reason.NoQuorum);
    });
  });

  describe("weight resolution at the snapshot", function () {
    it("counts a voter's weight plus that of their delegators who did not vote", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      // m[1] carries m[0]'s weight: A 2–1 B, and 3 of 6 expressed reach the quorum.
      await vote(gov, issueId, [
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, A);
    });

    it("counts a delegator who voted only for themself (override)", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      // Without the override m[1] would weigh 2 and A would tie B; with it, B wins 2–1.
      await vote(gov, issueId, [
        [m[0], [B, A, R]],
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, B);
    });

    it("loses the weight of a delegator whose delegate did not vote", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0]]);
      // m[2] and m[3]: 2 of 6; m[0]'s weight would make 3, but m[1] did not vote.
      await vote(gov, issueId, [
        [m[2], [bidIds[0], R]],
        [m[3], [bidIds[0], R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueClosedWithoutAward").withArgs(issueId, Reason.NoQuorum);
    });

    it("gives no effect to a delegation whose delegate was not eligible at the snapshot", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      await gov.setEligibility(m[1].address, false); // total 5, quorum 3
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0]]);
      await expect(gov.connect(m[1]).castBallot(issueId, [bidIds[0], R]))
        .to.be.revertedWithCustomError(gov, "NotEligibleAtSnapshot");
      await vote(gov, issueId, [
        [m[2], [bidIds[0], R]],
        [m[3], [bidIds[0], R]],
      ]);
      const snapshot = await networkHelpers.takeSnapshot();
      await time.increaseTo(votingEnd);
      // m[0] did not vote: the weight stays with them and is lost.
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueClosedWithoutAward").withArgs(issueId, Reason.NoQuorum);

      // m[0] votes: the weight is theirs, 3 of 5.
      await snapshot.restore();
      await vote(gov, issueId, [[m[0], [bidIds[0], R]]]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded");
    });

    it("ignores a delegation made after the snapshot", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      await gov.connect(m[0]).delegateTo(m[1].address);
      // If it counted, A would tie B 2–2.
      await vote(gov, issueId, [
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
        [m[3], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, B);
    });

    it("ignores weight changes after the snapshot", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      await gov.setWeight(m[1].address, 5);
      await vote(gov, issueId, [
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
        [m[3], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, B);
    });

    it("counts a member removed after the snapshot who voted", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      await gov.removeMember(m[1].address);
      await vote(gov, issueId, [
        [m[0], [A, B, R]],
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, A);
    });

    it("weighs each ballot by the voter's weight at the snapshot", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.setWeight(m[1].address, 3); // total 8, quorum 4
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[2], [s[0], s[1]]);
      const [A, B] = bidIds;
      await vote(gov, issueId, [
        [m[1], [A, B, R]],
        [m[2], [B, A, R]],
        [m[3], [B, A, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, A);
    });

    it("decides the cycle of ADR-0022 (weights 4/3/2 over three bids) for A", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      await gov.setWeight(m[0].address, 4);
      await gov.setWeight(m[1].address, 3);
      await gov.setWeight(m[2].address, 2); // total 12, quorum 6, 9 expressed
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[3], [s[0], s[1], s[2]]);
      const [A, B, C] = bidIds;
      await vote(gov, issueId, [
        [m[0], [A, B, C, R]],
        [m[1], [B, C, A, R]],
        [m[2], [C, A, B, R]],
      ]);
      await time.increaseTo(votingEnd);
      await expect(gov.closeIssue(issueId)).to.emit(gov, "IssueAwarded").withArgs(issueId, A);
    });
  });

  describe("scale", function () {
    it("closes with 48 members, 16 delegations and 5 bids well within a block's gas", async function () {
      const { gov, registrar, m, s } = await networkHelpers.loadFixture(closeFixture);
      const extra = Array.from({ length: 42 }, () => ethers.Wallet.createRandom(ethers.provider));
      for (const w of extra) {
        await registrar.sendTransaction({ to: w.address, value: ethers.parseEther("1") });
        await gov.registerMember(w.address, 1);
      }
      const all = [...m, ...extra]; // 48 members, total 48: a delegate controls at most 16
      for (let i = 0; i < 16; i++) await gov.connect(all[32 + i]).delegateTo(all[i].address);
      const signers = await ethers.getSigners();
      const suppliers = [...s, signers[10], signers[11]];
      await gov.registerSupplier(signers[10].address);
      await gov.registerSupplier(signers[11].address);

      await gov.connect(all[0]).createIssue(CID, TOPIC, CEILING);
      const createdAt = BigInt(await time.latest());
      for (const supplier of suppliers) await gov.connect(supplier).submitBid(1n, ethers.parseEther("1"), DOC);
      await time.increaseTo(createdAt + BigInt(BIDDING_PERIOD));
      // 32 ballots (the 16 delegators do not vote), rotating preferences.
      for (let i = 0; i < 32; i++) {
        const ranking = [1n, 2n, 3n, 4n, 5n, R];
        await gov.connect(all[i]).castBallot(1n, [...ranking.slice(i % 6), ...ranking.slice(0, i % 6)]);
      }
      await time.increase(VOTING_PERIOD);

      const receipt = await (await gov.closeIssue(1n)).wait();
      expect(receipt!.gasUsed).to.be.below(10_000_000n);
      console.log(`      closeIssue gas with 48 members, 32 ballots, 5 bids: ${receipt!.gasUsed}`);
    });
  });

  describe("invariants", function () {
    it("every reservation ends released or kept only for an awarded issue", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      // #1 awarded, #2 without bids, #3 without quorum, all open at once.
      await gov.connect(m[0]).createIssue(CID, TOPIC, ethers.parseEther("3"));
      await gov.connect(m[1]).createIssue(CID, TOPIC, ethers.parseEther("2"));
      await gov.connect(m[2]).createIssue(CID, TOPIC, ethers.parseEther("1"));
      await gov.connect(s[0]).submitBid(1n, ethers.parseEther("1"), DOC);
      await gov.connect(s[0]).submitBid(3n, ethers.parseEther("1"), DOC);
      expect(await gov.reservedBalance()).to.equal(ethers.parseEther("6"));

      await time.increase(BIDDING_PERIOD);
      for (const member of m.slice(0, 3)) await gov.connect(member).castBallot(1n, [1n, R]);
      await time.increase(VOTING_PERIOD);
      for (const id of [1n, 2n, 3n]) await gov.closeIssue(id);

      expect(await gov.reservedBalance()).to.equal(ethers.parseEther("3"));
      expect(await gov.reservedBalance()).to.be.at.most(await ethers.provider.getBalance(gov));
      expect(await gov.availableBalance()).to.equal(ethers.parseEther("7"));
    });

    it("the outcome does not depend on who closes", async function () {
      const outcomes: bigint[] = [];
      for (const caller of [0, 3, 8]) {
        const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
        const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0], s[1]]);
        const [A, B] = bidIds;
        await vote(gov, issueId, [
          [m[0], [B, A, R]],
          [m[1], [B, R, A]],
          [m[2], [A, B, R]],
        ]);
        await time.increaseTo(votingEnd);
        await gov.connect((await ethers.getSigners())[caller]).closeIssue(issueId);
        outcomes.push((await gov.issues(issueId)).winningBidId);
      }
      expect(outcomes).to.deep.equal([2n, 2n, 2n]);
    });

    it("no ballots are accepted after the close", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      const { issueId, bidIds } = await openVoting(gov, m[0], [s[0]]);
      await vote(
        gov,
        issueId,
        m.map((member) => [member, [bidIds[0], R]]),
      );
      await gov.closeIssue(issueId); // early: everyone voted
      await expect(gov.connect(m[0]).castBallot(issueId, [bidIds[0], R])).to.be.revertedWithCustomError(
        gov,
        "NotInVotingPhase",
      );
    });

    it("a tie never awards and no award happens without quorum", async function () {
      const { gov, m, s } = await networkHelpers.loadFixture(closeFixture);
      // Unanimous for A, but only 2 of 6: no award even with a clear winner.
      const { issueId, bidIds, votingEnd } = await openVoting(gov, m[0], [s[0], s[1]]);
      await vote(gov, issueId, [
        [m[0], [bidIds[0], bidIds[1], R]],
        [m[1], [bidIds[0], bidIds[1], R]],
      ]);
      await time.increaseTo(votingEnd);
      await gov.closeIssue(issueId);
      expect((await gov.issues(issueId)).status).to.equal(Status.ClosedWithoutAward);
    });
  });
});
