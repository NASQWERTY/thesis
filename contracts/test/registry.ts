import { expect } from "chai";
import { deployFixture, ethers, networkHelpers } from "./helpers.js";

const { time } = networkHelpers;

async function withAliceFixture() {
  const f = await deployFixture();
  await f.gov.registerMember(f.alice.address, 1);
  return f;
}

describe("HU-001 member registry", function () {
  describe("registerMember", function () {
    it("creates an eligible member with weight 1 and emits MemberRegistered", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);

      await expect(gov.registerMember(alice.address, 1))
        .to.emit(gov, "MemberRegistered")
        .withArgs(alice.address, 1);

      const m = await gov.members(alice.address);
      expect(m.registered).to.equal(true);
      expect(m.eligible).to.equal(true);
      expect(m.weight).to.equal(1);
      expect(m.delegate).to.equal(ethers.ZeroAddress);
      expect(m.receivedWeight).to.equal(0);
    });

    it("appends the member to memberList", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerMember(alice.address, 1);
      await gov.registerMember(bob.address, 1);

      expect(await gov.memberCount()).to.equal(2);
      expect(await gov.memberList(0)).to.equal(alice.address);
      expect(await gov.memberList(1)).to.equal(bob.address);
      expect(await gov.listed(alice.address)).to.equal(true);
    });

    it("checkpoints the effective weight and the total", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerMember(alice.address, 1);
      await gov.registerMember(bob.address, 2);
      const now = await time.latest();

      expect(await gov.weightAt(alice.address, now)).to.equal(1);
      expect(await gov.weightAt(bob.address, now)).to.equal(2);
      expect(await gov.totalWeightAt(now)).to.equal(3);
    });

    it("rejects an already registered member", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.registerMember(alice.address, 1))
        .to.be.revertedWithCustomError(gov, "AlreadyRegistered")
        .withArgs(alice.address);
    });

    it("rejects an address registered as supplier (ADR-0021)", async function () {
      const { gov, carol } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerSupplier(carol.address);

      await expect(gov.registerMember(carol.address, 1))
        .to.be.revertedWithCustomError(gov, "AddressIsSupplier")
        .withArgs(carol.address);
    });

    it("rejects a zero weight", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.registerMember(alice.address, 0)).to.be.revertedWithCustomError(gov, "ZeroWeight");
    });

    it("rejects the zero address", async function () {
      const { gov } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.registerMember(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(gov, "ZeroAddress");
    });

    it("rejects a caller other than the registrar", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.connect(alice).registerMember(bob.address, 1)).to.be.revertedWithCustomError(
        gov,
        "NotRegistrar",
      );
    });
  });

  describe("removeMember", function () {
    it("removes the member: record cleared, effective weight and total drop, emits MemberRemoved", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.registerMember(bob.address, 2);

      await expect(gov.removeMember(alice.address)).to.emit(gov, "MemberRemoved").withArgs(alice.address);

      const now = await time.latest();
      const m = await gov.members(alice.address);
      expect(m.registered).to.equal(false);
      expect(m.eligible).to.equal(false);
      expect(m.weight).to.equal(0);
      expect(await gov.weightAt(alice.address, now)).to.equal(0);
      expect(await gov.totalWeightAt(now)).to.equal(2);
    });

    it("keeps past snapshots and the memberList entry", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      const before = await time.latest();

      await time.increase(100);
      await gov.removeMember(alice.address);

      expect(await gov.weightAt(alice.address, before)).to.equal(1);
      expect(await gov.totalWeightAt(before)).to.equal(1);
      expect(await gov.memberCount()).to.equal(1);
      expect(await gov.memberList(0)).to.equal(alice.address);
    });

    it("allows registering the member again without duplicating them in memberList", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.removeMember(alice.address);

      await expect(gov.registerMember(alice.address, 2)).to.emit(gov, "MemberRegistered").withArgs(alice.address, 2);

      const now = await time.latest();
      expect((await gov.members(alice.address)).eligible).to.equal(true);
      expect(await gov.weightAt(alice.address, now)).to.equal(2);
      expect(await gov.memberCount()).to.equal(1);
    });

    it("leaves the removed member out of the registrar's other operations", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.removeMember(alice.address);

      await expect(gov.setEligibility(alice.address, true))
        .to.be.revertedWithCustomError(gov, "NotRegistered")
        .withArgs(alice.address);
      await expect(gov.setWeight(alice.address, 2))
        .to.be.revertedWithCustomError(gov, "NotRegistered")
        .withArgs(alice.address);
    });

    it("rejects an unregistered address", async function () {
      const { gov, bob } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.removeMember(bob.address))
        .to.be.revertedWithCustomError(gov, "NotRegistered")
        .withArgs(bob.address);
    });

    it("rejects a caller other than the registrar", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.connect(alice).removeMember(alice.address)).to.be.revertedWithCustomError(
        gov,
        "NotRegistrar",
      );
    });
  });

  describe("setEligibility", function () {
    it("disables a member: effective weight and total drop, emits EligibilityChanged", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);

      await expect(gov.setEligibility(alice.address, false))
        .to.emit(gov, "EligibilityChanged")
        .withArgs(alice.address, false);

      const now = await time.latest();
      expect((await gov.members(alice.address)).eligible).to.equal(false);
      expect(await gov.weightAt(alice.address, now)).to.equal(0);
      expect(await gov.totalWeightAt(now)).to.equal(0);
      // Stays registered: the registry keeps the moroso member.
      expect((await gov.members(alice.address)).registered).to.equal(true);
    });

    it("re-enables a member with their weight", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.setEligibility(alice.address, false);

      await expect(gov.setEligibility(alice.address, true))
        .to.emit(gov, "EligibilityChanged")
        .withArgs(alice.address, true);

      const now = await time.latest();
      expect((await gov.members(alice.address)).eligible).to.equal(true);
      expect(await gov.weightAt(alice.address, now)).to.equal(1);
      expect(await gov.totalWeightAt(now)).to.equal(1);
    });

    it("rejects a call that does not change eligibility", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.setEligibility(alice.address, true))
        .to.be.revertedWithCustomError(gov, "EligibilityUnchanged")
        .withArgs(alice.address, true);
    });

    it("rejects an unregistered address", async function () {
      const { gov, bob } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.setEligibility(bob.address, false))
        .to.be.revertedWithCustomError(gov, "NotRegistered")
        .withArgs(bob.address);
    });

    it("rejects a caller other than the registrar", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.connect(alice).setEligibility(alice.address, false)).to.be.revertedWithCustomError(
        gov,
        "NotRegistrar",
      );
    });
  });

  describe("setWeight", function () {
    it("changes the weight and emits WeightChanged with old and new values", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);

      await expect(gov.setWeight(alice.address, 3)).to.emit(gov, "WeightChanged").withArgs(alice.address, 1, 3);

      expect((await gov.members(alice.address)).weight).to.equal(3);
    });

    it("does not alter past snapshots; later ones see the change", async function () {
      const { gov, alice, bob } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.registerMember(bob.address, 1);
      const before = await time.latest(); // e.g. an issue's snapshot taken here

      await time.increase(100);
      await gov.setWeight(alice.address, 3);
      const after = await time.latest();

      expect(await gov.weightAt(alice.address, before)).to.equal(1);
      expect(await gov.totalWeightAt(before)).to.equal(2);
      expect(await gov.weightAt(alice.address, after)).to.equal(3);
      expect(await gov.totalWeightAt(after)).to.equal(4);
    });

    it("on an ineligible member, stores the weight but keeps effective weight 0 until re-enabled", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await gov.setEligibility(alice.address, false);

      await gov.setWeight(alice.address, 5);
      let now = await time.latest();
      expect((await gov.members(alice.address)).weight).to.equal(5);
      expect(await gov.weightAt(alice.address, now)).to.equal(0);
      expect(await gov.totalWeightAt(now)).to.equal(0);

      await gov.setEligibility(alice.address, true);
      now = await time.latest();
      expect(await gov.weightAt(alice.address, now)).to.equal(5);
      expect(await gov.totalWeightAt(now)).to.equal(5);
    });

    it("rejects a zero weight", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.setWeight(alice.address, 0)).to.be.revertedWithCustomError(gov, "ZeroWeight");
    });

    it("rejects an unregistered address", async function () {
      const { gov, bob } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.setWeight(bob.address, 2))
        .to.be.revertedWithCustomError(gov, "NotRegistered")
        .withArgs(bob.address);
    });

    it("rejects a caller other than the registrar", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(withAliceFixture);
      await expect(gov.connect(alice).setWeight(alice.address, 2)).to.be.revertedWithCustomError(
        gov,
        "NotRegistrar",
      );
    });
  });

  describe("views", function () {
    it("weightAt and totalWeightAt return 0 before any registration", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      const now = await time.latest();
      expect(await gov.weightAt(alice.address, now)).to.equal(0);
      expect(await gov.totalWeightAt(now)).to.equal(0);
    });
  });
});
