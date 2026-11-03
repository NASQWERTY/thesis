import { expect } from "chai";
import {
  BIDDING_PERIOD,
  CID,
  ethers,
  networkHelpers,
  Status,
  TOPIC,
  TREASURY,
  VOTING_PERIOD,
  votingFixture,
  withIssueFixture,
} from "./helpers.js";

const { time } = networkHelpers;
const R = 0n; // REJECT_ALL in a ballot

/** votingFixture + both members rank erin's bid #2 (2 ETH) first; issue #1 (4 ETH) closed and awarded. */
async function awardedFixture() {
  const f = await votingFixture();
  await f.gov.connect(f.alice).castBallot(f.issueId, [f.erinBid, f.carolBid, R]);
  await f.gov.connect(f.bob).castBallot(f.issueId, [f.erinBid, R, f.carolBid]);
  await f.gov.closeIssue(f.issueId); // early: all the weight voted
  return { ...f, amount: ethers.parseEther("2"), released: ethers.parseEther("2") };
}

/** withIssueFixture + a contract supplier as the only bidder, awarded. */
async function contractSupplierFixture(name: "RejectingSupplier" | "ReentrantSupplier") {
  const f = await withIssueFixture();
  const supplier = await ethers.deployContract(name);
  await f.gov.registerSupplier(supplier);
  await supplier.bid(f.gov, f.issueId, ethers.parseEther("1"));
  await time.increaseTo(f.createdAt + BigInt(BIDDING_PERIOD));
  await f.gov.connect(f.alice).castBallot(f.issueId, [1n, R]);
  await f.gov.connect(f.bob).castBallot(f.issueId, [1n, R]);
  await f.gov.closeIssue(f.issueId);
  return { ...f, supplier };
}

const rejectingSupplierFixture = () => contractSupplierFixture("RejectingSupplier");
const reentrantSupplierFixture = () => contractSupplierFixture("ReentrantSupplier");

describe("HU-009 transfer to the supplier", function () {
  describe("executeTransfer", function () {
    it("pays the awarded supplier the bid amount", async function () {
      const { gov, erin, issueId, amount } = await networkHelpers.loadFixture(awardedFixture);
      await expect(gov.executeTransfer(issueId)).to.changeEtherBalances(ethers, [gov, erin], [-amount, amount]);
    });

    it("emits TransferExecuted with the supplier, the amount and the released rest", async function () {
      const { gov, erin, issueId, amount, released } = await networkHelpers.loadFixture(awardedFixture);
      await expect(gov.executeTransfer(issueId))
        .to.emit(gov, "TransferExecuted")
        .withArgs(issueId, erin.address, amount, released);
    });

    it("marks the issue Executed and releases the whole ceiling from the reservation", async function () {
      const { gov, issueId, ceiling, amount } = await networkHelpers.loadFixture(awardedFixture);
      expect(await gov.reservedBalance()).to.equal(ceiling);
      expect(await gov.availableBalance()).to.equal(TREASURY - ceiling);

      await gov.executeTransfer(issueId);

      expect((await gov.issues(issueId)).status).to.equal(Status.Executed);
      expect(await gov.reservedBalance()).to.equal(0n);
      // Paid 2 of the 4 reserved: the other 2 are free balance again.
      expect(await gov.availableBalance()).to.equal(TREASURY - amount);
    });

    it("can be called by anyone, not only members", async function () {
      const { gov, carol, issueId } = await networkHelpers.loadFixture(awardedFixture);
      // carol is a supplier whose bid lost.
      await expect(gov.connect(carol).executeTransfer(issueId)).to.emit(gov, "TransferExecuted");
    });

    describe("rejections", function () {
      it("rejects an open issue", async function () {
        const { gov, issueId } = await networkHelpers.loadFixture(votingFixture);
        await expect(gov.executeTransfer(issueId)).to.be.revertedWithCustomError(gov, "NotAwarded").withArgs(issueId);
      });

      it("rejects an issue closed without award", async function () {
        const { gov, issueId, votingEnd } = await networkHelpers.loadFixture(votingFixture);
        await time.increaseTo(votingEnd); // nobody voted: no quorum
        await gov.closeIssue(issueId);
        await expect(gov.executeTransfer(issueId)).to.be.revertedWithCustomError(gov, "NotAwarded").withArgs(issueId);
      });

      it("rejects a transfer already executed", async function () {
        const { gov, issueId } = await networkHelpers.loadFixture(awardedFixture);
        await gov.executeTransfer(issueId);
        await expect(gov.executeTransfer(issueId))
          .to.be.revertedWithCustomError(gov, "AlreadyExecuted")
          .withArgs(issueId);
      });

      it("rejects an unknown issue", async function () {
        const { gov } = await networkHelpers.loadFixture(awardedFixture);
        await expect(gov.executeTransfer(9n)).to.be.revertedWithCustomError(gov, "IssueNotFound").withArgs(9n);
      });

      it("reverts everything when the supplier does not accept the payment", async function () {
        const { gov, issueId, supplier } = await networkHelpers.loadFixture(rejectingSupplierFixture);
        await expect(gov.executeTransfer(issueId))
          .to.be.revertedWithCustomError(gov, "TransferFailed")
          .withArgs(await supplier.getAddress(), ethers.parseEther("1"));
        // Nothing changed: still awarded and reserved, so it can be retried.
        expect((await gov.issues(issueId)).status).to.equal(Status.Awarded);
        expect(await gov.reservedBalance()).to.equal(ethers.parseEther("4"));
      });
    });

    it("pays once even if the supplier tries to re-enter while being paid", async function () {
      const { gov, issueId, supplier } = await networkHelpers.loadFixture(reentrantSupplierFixture);
      await expect(gov.executeTransfer(issueId)).to.changeEtherBalances(
        ethers,
        [gov, supplier],
        [-ethers.parseEther("1"), ethers.parseEther("1")],
      );
      expect(await supplier.reentered()).to.equal(false);
      expect((await gov.issues(issueId)).status).to.equal(Status.Executed);
    });
  });

  describe("invariants", function () {
    it("pays only the awarded bid's registered supplier, at most the ceiling", async function () {
      const { gov, issueId, erin, ceiling } = await networkHelpers.loadFixture(awardedFixture);
      const receipt = await (await gov.executeTransfer(issueId)).wait();
      const event = receipt!.logs.map((l) => gov.interface.parseLog(l)).find((e) => e?.name === "TransferExecuted")!;
      expect(event.args.supplier).to.equal(erin.address);
      expect(await gov.isSupplier(event.args.supplier)).to.equal(true);
      expect(event.args.amount).to.be.at.most(ceiling);
      expect(event.args.amount + event.args.released).to.equal(ceiling);
    });

    it("leaves the reservations of other issues untouched", async function () {
      const { gov, bob, issueId } = await networkHelpers.loadFixture(awardedFixture);
      const otherCeiling = ethers.parseEther("1");
      await gov.connect(bob).createIssue(CID, TOPIC, otherCeiling);
      await gov.executeTransfer(issueId);
      expect(await gov.reservedBalance()).to.equal(otherCeiling);
      expect(await gov.reservedBalance()).to.be.at.most(await ethers.provider.getBalance(gov));
    });

    it("an issue is executed at most once, even after the reservation was freed", async function () {
      const { gov, issueId } = await networkHelpers.loadFixture(awardedFixture);
      await gov.executeTransfer(issueId);
      await time.increase(BIDDING_PERIOD + VOTING_PERIOD);
      await expect(gov.executeTransfer(issueId)).to.be.revertedWithCustomError(gov, "AlreadyExecuted");
      await expect(gov.closeIssue(issueId)).to.be.revertedWithCustomError(gov, "IssueNotOpen");
    });
  });
});
