import { expect } from "chai";
import { BIDDING_PERIOD, deployFixture, ethers, networkHelpers, VOTING_PERIOD } from "./helpers.js";

const { time } = networkHelpers;

const CID = "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
const TOPIC = ethers.encodeBytes32String("mantenimiento");
const TREASURY = ethers.parseEther("10");

// IssueStatus / IssuePhase as numbers (ethers returns enums as bigint).
const Status = { Open: 0n, Awarded: 1n, Executed: 2n, ClosedWithoutAward: 3n };
const Phase = { Bidding: 0n, Voting: 1n, VotingEnded: 2n, Closed: 3n };

/** alice and bob are eligible members, carol is a supplier, the treasury holds 10 ETH. */
async function communityFixture() {
  const f = await deployFixture();
  await f.gov.registerMember(f.alice.address, 1);
  await f.gov.registerMember(f.bob.address, 1);
  await f.gov.registerSupplier(f.carol.address);
  await f.registrar.sendTransaction({ to: f.gov, value: TREASURY });
  return f;
}

/** communityFixture + alice's issue #1 with a 4 ETH ceiling. */
async function withIssueFixture() {
  const f = await communityFixture();
  await f.gov.connect(f.alice).createIssue(CID, TOPIC, ethers.parseEther("4"));
  const createdAt = BigInt(await time.latest());
  return { ...f, issueId: 1n, createdAt };
}

describe("HU-003 issue creation", function () {
  describe("createIssue", function () {
    it("creates the issue and emits IssueCreated", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
      const ceiling = ethers.parseEther("4");

      // staticCall simulates the call to read its return value without sending a transaction.
      expect(await gov.connect(alice).createIssue.staticCall(CID, TOPIC, ceiling)).to.equal(1n);
      await expect(gov.connect(alice).createIssue(CID, TOPIC, ceiling))
        .to.emit(gov, "IssueCreated")
        .withArgs(1n, alice.address, ceiling);

      const now = BigInt(await time.latest());
      const issue = await gov.issues(1n);
      expect(issue.proposer).to.equal(alice.address);
      expect(issue.descriptionCid).to.equal(CID); // the IPFS hash is recorded on-chain
      expect(issue.topic).to.equal(TOPIC);
      expect(issue.ceiling).to.equal(ceiling);
      expect(issue.createdAt).to.equal(now);
      expect(issue.snapshot).to.equal(now - 1n);
      expect(issue.status).to.equal(Status.Open);
      expect(issue.winningBidId).to.equal(0n);
      expect(await gov.nextIssueId()).to.equal(2n);
    });

    it("reserves the ceiling from the treasury", async function () {
      const { gov } = await networkHelpers.loadFixture(withIssueFixture);
      expect(await gov.reservedBalance()).to.equal(ethers.parseEther("4"));
      expect(await gov.availableBalance()).to.equal(ethers.parseEther("6"));
      // The ETH does not move: it stays in the contract, only committed.
      expect(await ethers.provider.getBalance(gov)).to.equal(TREASURY);
    });

    it("marks the issue as the proposer's open issue", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(withIssueFixture);
      expect(await gov.activeIssueOf(alice.address)).to.equal(1n);
      expect(await gov.activeIssueOf(bob.address)).to.equal(0n);
    });

    it("numbers issues consecutively across proposers", async function () {
      const { gov, bob } = await networkHelpers.loadFixture(withIssueFixture);
      await expect(gov.connect(bob).createIssue(CID, TOPIC, ethers.parseEther("1")))
        .to.emit(gov, "IssueCreated")
        .withArgs(2n, bob.address, ethers.parseEther("1"));
      expect(await gov.reservedBalance()).to.equal(ethers.parseEther("5"));
    });

    it("accepts a ceiling equal to the whole unreserved balance", async function () {
      const { gov, bob } = await networkHelpers.loadFixture(withIssueFixture);
      await gov.connect(bob).createIssue(CID, TOPIC, ethers.parseEther("6"));
      expect(await gov.availableBalance()).to.equal(0n);
    });

    describe("snapshot", function () {
      it("later registry changes do not alter the weights at the snapshot", async function () {
        const { gov, alice, dave, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        const { snapshot } = await gov.issues(issueId);

        await gov.setWeight(alice.address, 5);
        await gov.registerMember(dave.address, 1);

        expect(await gov.weightAt(alice.address, snapshot)).to.equal(1n);
        expect(await gov.weightAt(dave.address, snapshot)).to.equal(0n);
        expect(await gov.totalWeightAt(snapshot)).to.equal(2n);
      });

      it("excludes a registry change mined in the same block as the creation", async function () {
        const { gov, alice, bob } = await networkHelpers.loadFixture(communityFixture);

        // Put both transactions in one block: same timestamp for both.
        await ethers.provider.send("evm_setAutomine", [false]);
        await gov.setWeight(bob.address, 7);
        await gov.connect(alice).createIssue(CID, TOPIC, ethers.parseEther("1"));
        await networkHelpers.mine();
        await ethers.provider.send("evm_setAutomine", [true]);

        const { snapshot, createdAt } = await gov.issues(1n);
        expect(await gov.weightAt(bob.address, createdAt)).to.equal(7n); // the change happened...
        expect(await gov.weightAt(bob.address, snapshot)).to.equal(1n); // ...but not for this issue
      });
    });

    describe("rejections", function () {
      it("rejects an address that is not in the registry", async function () {
        const { gov, dave } = await networkHelpers.loadFixture(communityFixture);
        await expect(gov.connect(dave).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "NotRegistered")
          .withArgs(dave.address);
      });

      it("rejects a supplier", async function () {
        const { gov, carol } = await networkHelpers.loadFixture(communityFixture);
        await expect(gov.connect(carol).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "NotRegistered")
          .withArgs(carol.address);
      });

      it("rejects a removed member", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
        await gov.removeMember(alice.address);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "NotRegistered")
          .withArgs(alice.address);
      });

      it("rejects an ineligible member (moroso)", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
        await gov.setEligibility(alice.address, false);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "NotEligible")
          .withArgs(alice.address);
      });

      it("accepts a member enabled again", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
        await gov.setEligibility(alice.address, false);
        await gov.setEligibility(alice.address, true);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 1n)).to.emit(gov, "IssueCreated");
      });

      it("rejects a zero ceiling", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 0n)).to.be.revertedWithCustomError(gov, "ZeroCeiling");
      });

      it("rejects an empty description CID", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(communityFixture);
        await expect(gov.connect(alice).createIssue("", TOPIC, 1n)).to.be.revertedWithCustomError(gov, "EmptyCid");
      });

      it("rejects a ceiling above the unreserved balance", async function () {
        const { gov, bob } = await networkHelpers.loadFixture(withIssueFixture);
        const available = ethers.parseEther("6");
        await expect(gov.connect(bob).createIssue(CID, TOPIC, available + 1n))
          .to.be.revertedWithCustomError(gov, "InsufficientFunds")
          .withArgs(available, available + 1n);
      });

      it("rejects any ceiling when the treasury is empty", async function () {
        const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
        await gov.registerMember(alice.address, 1);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "InsufficientFunds")
          .withArgs(0n, 1n);
      });

      it("rejects a second issue while the proposer has one open", async function () {
        const { gov, alice, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(alice).createIssue(CID, TOPIC, 1n))
          .to.be.revertedWithCustomError(gov, "ActiveIssueExists")
          .withArgs(issueId);
      });
    });
  });

  describe("phaseOf", function () {
    it("is Bidding from creation until the bidding period ends", async function () {
      const { gov, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
      expect(await gov.phaseOf(issueId)).to.equal(Phase.Bidding);

      await time.increaseTo(createdAt + BigInt(BIDDING_PERIOD) - 1n);
      expect(await gov.phaseOf(issueId)).to.equal(Phase.Bidding);
    });

    it("is Voting from the end of bidding until the voting period ends", async function () {
      const { gov, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
      const biddingEnd = createdAt + BigInt(BIDDING_PERIOD);

      await time.increaseTo(biddingEnd);
      expect(await gov.phaseOf(issueId)).to.equal(Phase.Voting);

      await time.increaseTo(biddingEnd + BigInt(VOTING_PERIOD) - 1n);
      expect(await gov.phaseOf(issueId)).to.equal(Phase.Voting);
    });

    it("is VotingEnded once the voting period is over and nobody closed the issue", async function () {
      const { gov, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
      await time.increaseTo(createdAt + BigInt(BIDDING_PERIOD + VOTING_PERIOD));
      expect(await gov.phaseOf(issueId)).to.equal(Phase.VotingEnded);
    });

    it("rejects an issue that does not exist", async function () {
      const { gov } = await networkHelpers.loadFixture(withIssueFixture);
      await expect(gov.phaseOf(2n)).to.be.revertedWithCustomError(gov, "IssueNotFound").withArgs(2n);
      await expect(gov.phaseOf(0n)).to.be.revertedWithCustomError(gov, "IssueNotFound").withArgs(0n);
    });
  });

  describe("invariants", function () {
    it("reservedBalance never exceeds the contract balance", async function () {
      const { gov, alice, bob, dave } = await networkHelpers.loadFixture(communityFixture);
      await gov.registerMember(dave.address, 1);
      await gov.connect(alice).createIssue(CID, TOPIC, ethers.parseEther("3"));
      await gov.connect(bob).createIssue(CID, TOPIC, ethers.parseEther("5"));
      await expect(gov.connect(dave).createIssue(CID, TOPIC, ethers.parseEther("3"))).to.be.revertedWithCustomError(
        gov,
        "InsufficientFunds",
      );

      expect(await gov.reservedBalance()).to.be.at.most(await ethers.provider.getBalance(gov));
    });
  });
});
