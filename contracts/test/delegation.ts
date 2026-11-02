import { expect } from "chai";
import { CID, deployFixture, ethers, networkHelpers, TOPIC, TREASURY } from "./helpers.js";

const { time } = networkHelpers;

/**
 * Nine eligible members of weight 1 (total 9, so the cap is 3: a delegate may control at most
 * 3 = own 1 + 2 received), a supplier, and a funded treasury.
 */
async function delegationFixture() {
  const f = await deployFixture();
  const signers = await ethers.getSigners();
  const m = signers.slice(1, 10);
  const supplier = signers[10];
  for (const s of m) await f.gov.registerMember(s.address, 1);
  await f.gov.registerSupplier(supplier.address);
  await f.registrar.sendTransaction({ to: f.gov, value: TREASURY });
  return { ...f, m, supplier };
}

describe("HU-005 delegation", function () {
  describe("delegateTo", function () {
    it("records the delegation and emits DelegationSet", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);

      await expect(gov.connect(m[0]).delegateTo(m[1].address))
        .to.emit(gov, "DelegationSet")
        .withArgs(m[0].address, m[1].address);

      expect((await gov.members(m[0].address)).delegate).to.equal(m[1].address);
      expect((await gov.members(m[1].address)).receivedWeight).to.equal(1n);
      expect(await gov.delegateAt(m[0].address, await time.latest())).to.equal(m[1].address);
    });

    it("accepts delegations up to the cap: the delegate controls exactly 1/3", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
      await gov.connect(m[0]).delegateTo(m[2].address);
      await gov.connect(m[1]).delegateTo(m[2].address);
      expect((await gov.members(m[2].address)).receivedWeight).to.equal(2n); // + own 1 = 3 of 9
    });

    describe("rejections", function () {
      it("rejects a delegation that would exceed 1/3 of the total weight", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.connect(m[0]).delegateTo(m[3].address);
        await gov.connect(m[1]).delegateTo(m[3].address);

        // own 1 + received 2 + 1 = 4 > 9 / 3
        await expect(gov.connect(m[2]).delegateTo(m[3].address))
          .to.be.revertedWithCustomError(gov, "DelegationCapExceeded")
          .withArgs(4n, 9n);
      });

      it("counts the delegate's own weight in the cap", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.setWeight(m[1].address, 3); // total 11, the delegate already holds 3

        await expect(gov.connect(m[0]).delegateTo(m[1].address))
          .to.be.revertedWithCustomError(gov, "DelegationCapExceeded")
          .withArgs(4n, 11n);
      });

      it("rejects a delegate that has a delegate itself (single hop)", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.connect(m[1]).delegateTo(m[2].address);

        await expect(gov.connect(m[0]).delegateTo(m[1].address))
          .to.be.revertedWithCustomError(gov, "DelegateIsDelegating")
          .withArgs(m[1].address);
      });

      it("rejects a delegator that was already chosen as delegate (single hop)", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.connect(m[1]).delegateTo(m[0].address);

        await expect(gov.connect(m[0]).delegateTo(m[2].address))
          .to.be.revertedWithCustomError(gov, "DelegatorIsDelegate")
          .withArgs(m[0].address);
      });

      it("rejects an ineligible member", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.setEligibility(m[0].address, false);

        await expect(gov.connect(m[0]).delegateTo(m[1].address))
          .to.be.revertedWithCustomError(gov, "NotEligible")
          .withArgs(m[0].address);
      });

      it("rejects a caller that is not a member", async function () {
        const { gov, m, supplier } = await networkHelpers.loadFixture(delegationFixture);
        await expect(gov.connect(supplier).delegateTo(m[0].address))
          .to.be.revertedWithCustomError(gov, "NotRegistered")
          .withArgs(supplier.address);
      });

      it("rejects delegating to oneself", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await expect(gov.connect(m[0]).delegateTo(m[0].address)).to.be.revertedWithCustomError(gov, "SelfDelegation");
      });

      it("rejects a delegate that is not in the registry", async function () {
        const { gov, m, supplier } = await networkHelpers.loadFixture(delegationFixture);
        await expect(gov.connect(m[0]).delegateTo(supplier.address))
          .to.be.revertedWithCustomError(gov, "NotRegistered")
          .withArgs(supplier.address);
      });

      it("rejects a second delegation while one is active (revoke first)", async function () {
        const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
        await gov.connect(m[0]).delegateTo(m[1].address);

        await expect(gov.connect(m[0]).delegateTo(m[2].address))
          .to.be.revertedWithCustomError(gov, "AlreadyDelegating")
          .withArgs(m[1].address);
      });
    });
  });
});

describe("HU-006 delegation revocation", function () {
  describe("revokeDelegation", function () {
    it("clears the delegation and emits DelegationRevoked", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);

      await expect(gov.connect(m[0]).revokeDelegation()).to.emit(gov, "DelegationRevoked").withArgs(m[0].address);

      expect((await gov.members(m[0].address)).delegate).to.equal(ethers.ZeroAddress);
      expect((await gov.members(m[1].address)).receivedWeight).to.equal(0n);
      expect(await gov.delegateAt(m[0].address, await time.latest())).to.equal(ethers.ZeroAddress);
    });

    it("applies to issues created afterwards; earlier issues keep their snapshot", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      await time.increase(10);
      await gov.connect(m[5]).createIssue(CID, TOPIC, 1n); // issue 1: created while delegating
      await time.increase(10);

      await gov.connect(m[0]).revokeDelegation();
      await time.increase(10);
      await gov.connect(m[6]).createIssue(CID, TOPIC, 1n); // issue 2: created after the revocation

      const before = (await gov.issues(1n)).snapshot;
      const after = (await gov.issues(2n)).snapshot;
      expect(await gov.delegateAt(m[0].address, before)).to.equal(m[1].address);
      expect(await gov.delegateAt(m[0].address, after)).to.equal(ethers.ZeroAddress);
    });

    it("lets the member delegate again afterwards", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
      await gov.connect(m[0]).delegateTo(m[1].address);
      await gov.connect(m[0]).revokeDelegation();

      await expect(gov.connect(m[0]).delegateTo(m[2].address))
        .to.emit(gov, "DelegationSet")
        .withArgs(m[0].address, m[2].address);
    });

    it("rejects a member that is not delegating", async function () {
      const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
      await expect(gov.connect(m[0]).revokeDelegation())
        .to.be.revertedWithCustomError(gov, "NotDelegating")
        .withArgs(m[0].address);
    });
  });
});

describe("delegation and the registry", function () {
  it("setWeight on a delegator updates the delegate's received weight", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.connect(m[0]).delegateTo(m[1].address);

    await gov.setWeight(m[0].address, 2);
    expect((await gov.members(m[1].address)).receivedWeight).to.equal(2n);

    // Revoking subtracts the current weight, leaving the delegate at 0.
    await gov.connect(m[0]).revokeDelegation();
    expect((await gov.members(m[1].address)).receivedWeight).to.equal(0n);
  });

  it("setWeight may leave a delegate above the cap (checked only when delegating)", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.connect(m[0]).delegateTo(m[2].address);
    await gov.connect(m[1]).delegateTo(m[2].address);

    await expect(gov.setWeight(m[0].address, 5)).to.emit(gov, "WeightChanged");
    expect((await gov.members(m[2].address)).receivedWeight).to.equal(6n);
  });

  it("removing a delegator revokes their delegation", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.connect(m[0]).delegateTo(m[1].address);

    await expect(gov.removeMember(m[0].address)).to.emit(gov, "DelegationRevoked").withArgs(m[0].address);
    expect((await gov.members(m[1].address)).receivedWeight).to.equal(0n);
    expect(await gov.delegateAt(m[0].address, await time.latest())).to.equal(ethers.ZeroAddress);
  });

  it("removing a delegate revokes every delegation they received (OPEN-4)", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.connect(m[0]).delegateTo(m[2].address);
    await gov.connect(m[1]).delegateTo(m[2].address);

    await expect(gov.removeMember(m[2].address))
      .to.emit(gov, "DelegationRevoked")
      .withArgs(m[0].address)
      .and.to.emit(gov, "DelegationRevoked")
      .withArgs(m[1].address);

    expect((await gov.members(m[0].address)).delegate).to.equal(ethers.ZeroAddress);
    expect((await gov.members(m[1].address)).delegate).to.equal(ethers.ZeroAddress);
    // Freed: they can delegate to someone else.
    await expect(gov.connect(m[0]).delegateTo(m[3].address)).to.emit(gov, "DelegationSet");
  });

  it("does not count an ineligible delegate's own weight in the cap", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.setEligibility(m[3].address, false); // total 8: cap is controlling at most 2.66

    await gov.connect(m[0]).delegateTo(m[3].address);
    await gov.connect(m[1]).delegateTo(m[3].address); // controls 2 (own weight not counted)
    await expect(gov.connect(m[2]).delegateTo(m[3].address))
      .to.be.revertedWithCustomError(gov, "DelegationCapExceeded")
      .withArgs(3n, 8n);
  });
});

describe("delegation invariants", function () {
  it("no address is delegator and delegate at the same time", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    await gov.connect(m[0]).delegateTo(m[1].address);
    await gov.connect(m[2]).delegateTo(m[1].address);
    await gov.connect(m[3]).delegateTo(m[4].address);
    await expect(gov.connect(m[1]).delegateTo(m[5].address)).to.be.revertedWithCustomError(gov, "DelegatorIsDelegate");
    await expect(gov.connect(m[5]).delegateTo(m[3].address)).to.be.revertedWithCustomError(gov, "DelegateIsDelegating");

    for (const s of m) {
      const member = await gov.members(s.address);
      const delegating = member.delegate !== ethers.ZeroAddress;
      const delegated = member.receivedWeight > 0n;
      expect(delegating && delegated, s.address).to.equal(false);
    }
  });

  it("a delegate's controlled weight never exceeds 1/3 of the total when delegating", async function () {
    const { gov, m } = await networkHelpers.loadFixture(delegationFixture);
    // Everyone tries to delegate to m[8]; only the delegations within the cap succeed.
    for (const s of m.slice(0, 8)) {
      await gov
        .connect(s)
        .delegateTo(m[8].address)
        .catch(() => undefined);
    }
    const d = await gov.members(m[8].address);
    const total = await gov.totalWeightAt(await time.latest());
    expect((d.weight + d.receivedWeight) * 3n).to.be.at.most(total);
  });
});
