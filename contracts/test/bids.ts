import { expect } from "chai";
import { BIDDING_PERIOD, CID, ethers, networkHelpers, TOPIC, withIssueFixture } from "./helpers.js";

const { time } = networkHelpers;

const DOC = "bafkreidoc4ldyiwrc5qanpqfhc2yzdizt3mjv5gr4bjcbeiyd2bgrssfoa";

describe("HU-004 bid submission", function () {
  describe("submitBid", function () {
    it("records the bid and emits BidSubmitted", async function () {
      const { gov, carol, issueId } = await networkHelpers.loadFixture(withIssueFixture);
      const amount = ethers.parseEther("3");

      expect(await gov.connect(carol).submitBid.staticCall(issueId, amount, DOC)).to.equal(1n);
      await expect(gov.connect(carol).submitBid(issueId, amount, DOC))
        .to.emit(gov, "BidSubmitted")
        .withArgs(issueId, 1n, carol.address, amount);

      const bid = await gov.bids(1n);
      expect(bid.issueId).to.equal(issueId);
      expect(bid.supplier).to.equal(carol.address);
      expect(bid.amount).to.equal(amount);
      expect(bid.documentCid).to.equal(DOC); // the IPFS hash is recorded on-chain
      expect(await gov.bidsByIssue(issueId, 0n)).to.equal(1n);
      expect(await gov.hasBid(issueId, carol.address)).to.equal(true);
      expect(await gov.nextBidId()).to.equal(2n);
    });

    it("accepts an amount equal to the ceiling", async function () {
      const { gov, carol, issueId, ceiling } = await networkHelpers.loadFixture(withIssueFixture);
      await expect(gov.connect(carol).submitBid(issueId, ceiling, DOC)).to.emit(gov, "BidSubmitted");
    });

    it("accepts one bid from each supplier on the same issue", async function () {
      const { gov, carol, erin, issueId } = await networkHelpers.loadFixture(withIssueFixture);
      await gov.connect(carol).submitBid(issueId, ethers.parseEther("3"), DOC);
      await gov.connect(erin).submitBid(issueId, ethers.parseEther("2"), DOC);

      const [ids, list] = await gov.getBids(issueId);
      expect(ids).to.deep.equal([1n, 2n]);
      expect(list.map((b) => b.supplier)).to.deep.equal([carol.address, erin.address]);
      expect(list.map((b) => b.amount)).to.deep.equal([ethers.parseEther("3"), ethers.parseEther("2")]);
    });

    it("lets a supplier bid on different issues; bid ids are global", async function () {
      const { gov, bob, carol, issueId } = await networkHelpers.loadFixture(withIssueFixture);
      await gov.connect(bob).createIssue(CID, TOPIC, ethers.parseEther("2"));

      await gov.connect(carol).submitBid(issueId, ethers.parseEther("3"), DOC);
      await expect(gov.connect(carol).submitBid(2n, ethers.parseEther("1"), DOC))
        .to.emit(gov, "BidSubmitted")
        .withArgs(2n, 2n, carol.address, ethers.parseEther("1"));
    });

    it("accepts a bid in the last second of the bidding window", async function () {
      const { gov, carol, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
      // The next transaction is mined exactly at this timestamp.
      await time.setNextBlockTimestamp(createdAt + BigInt(BIDDING_PERIOD) - 1n);
      await expect(gov.connect(carol).submitBid(issueId, 1n, DOC)).to.emit(gov, "BidSubmitted");
    });

    describe("rejections", function () {
      it("rejects a member (members and suppliers are disjoint)", async function () {
        const { gov, alice, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(alice).submitBid(issueId, 1n, DOC))
          .to.be.revertedWithCustomError(gov, "NotSupplier")
          .withArgs(alice.address);
      });

      it("rejects an address that is not a registered supplier", async function () {
        const { gov, dave, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(dave).submitBid(issueId, 1n, DOC))
          .to.be.revertedWithCustomError(gov, "NotSupplier")
          .withArgs(dave.address);
      });

      it("rejects an issue that does not exist", async function () {
        const { gov, carol } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(carol).submitBid(9n, 1n, DOC))
          .to.be.revertedWithCustomError(gov, "IssueNotFound")
          .withArgs(9n);
      });

      it("rejects a bid once the bidding window is over", async function () {
        const { gov, carol, issueId, createdAt } = await networkHelpers.loadFixture(withIssueFixture);
        await time.setNextBlockTimestamp(createdAt + BigInt(BIDDING_PERIOD));
        await expect(gov.connect(carol).submitBid(issueId, 1n, DOC))
          .to.be.revertedWithCustomError(gov, "NotInBiddingPhase")
          .withArgs(issueId);
      });

      it("rejects a second bid from the same supplier on the same issue", async function () {
        const { gov, carol, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await gov.connect(carol).submitBid(issueId, ethers.parseEther("3"), DOC);
        await expect(gov.connect(carol).submitBid(issueId, ethers.parseEther("2"), DOC))
          .to.be.revertedWithCustomError(gov, "AlreadyBid")
          .withArgs(issueId, carol.address);
      });

      it("rejects a zero amount", async function () {
        const { gov, carol, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(carol).submitBid(issueId, 0n, DOC)).to.be.revertedWithCustomError(gov, "ZeroAmount");
      });

      it("rejects an amount above the ceiling", async function () {
        const { gov, carol, issueId, ceiling } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(carol).submitBid(issueId, ceiling + 1n, DOC))
          .to.be.revertedWithCustomError(gov, "AmountAboveCeiling")
          .withArgs(ceiling, ceiling + 1n);
      });

      it("rejects an empty document CID", async function () {
        const { gov, carol, issueId } = await networkHelpers.loadFixture(withIssueFixture);
        await expect(gov.connect(carol).submitBid(issueId, 1n, "")).to.be.revertedWithCustomError(gov, "EmptyCid");
      });
    });
  });

  describe("getBids", function () {
    it("returns empty lists for an issue without bids", async function () {
      const { gov, issueId } = await networkHelpers.loadFixture(withIssueFixture);
      const [ids, list] = await gov.getBids(issueId);
      expect(ids).to.deep.equal([]);
      expect(list).to.deep.equal([]);
    });

    it("rejects an issue that does not exist", async function () {
      const { gov } = await networkHelpers.loadFixture(withIssueFixture);
      await expect(gov.getBids(9n)).to.be.revertedWithCustomError(gov, "IssueNotFound").withArgs(9n);
    });
  });

  describe("invariants", function () {
    it("no bid exceeds its issue ceiling and each supplier bids at most once per issue", async function () {
      const { gov, carol, erin, issueId, ceiling } = await networkHelpers.loadFixture(withIssueFixture);
      await gov.connect(carol).submitBid(issueId, ceiling, DOC);
      await gov.connect(erin).submitBid(issueId, 1n, DOC);
      await expect(gov.connect(carol).submitBid(issueId, 1n, DOC)).to.be.revertedWithCustomError(gov, "AlreadyBid");

      const [, list] = await gov.getBids(issueId);
      const suppliers = list.map((b) => b.supplier);
      expect(new Set(suppliers).size).to.equal(suppliers.length);
      for (const b of list) expect(b.amount).to.be.at.most(ceiling);
    });
  });
});
