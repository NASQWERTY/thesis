import { expect } from "chai";
import { deployFixture, ethers, networkHelpers } from "./helpers.js";

describe("HU-002 supplier registry", function () {
  describe("registerSupplier", function () {
    it("registers the address and emits SupplierRegistered", async function () {
      const { gov, carol } = await networkHelpers.loadFixture(deployFixture);

      await expect(gov.registerSupplier(carol.address)).to.emit(gov, "SupplierRegistered").withArgs(carol.address);

      expect(await gov.isSupplier(carol.address)).to.equal(true);
    });

    it("rejects an address already registered as supplier (data cannot be modified)", async function () {
      const { gov, carol } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerSupplier(carol.address);

      await expect(gov.registerSupplier(carol.address))
        .to.be.revertedWithCustomError(gov, "AlreadyRegistered")
        .withArgs(carol.address);
    });

    it("rejects an eligible member (ADR-0021)", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerMember(alice.address, 1);

      await expect(gov.registerSupplier(alice.address))
        .to.be.revertedWithCustomError(gov, "AddressIsMember")
        .withArgs(alice.address);
    });

    it("rejects an ineligible member (ADR-0021)", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerMember(alice.address, 1);
      await gov.setEligibility(alice.address, false);

      await expect(gov.registerSupplier(alice.address))
        .to.be.revertedWithCustomError(gov, "AddressIsMember")
        .withArgs(alice.address);
    });

    it("rejects a removed member, who may still vote on issues created before the removal", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      await gov.registerMember(alice.address, 1);
      await gov.removeMember(alice.address);

      await expect(gov.registerSupplier(alice.address))
        .to.be.revertedWithCustomError(gov, "AddressIsMember")
        .withArgs(alice.address);
    });

    it("rejects the zero address", async function () {
      const { gov } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.registerSupplier(ethers.ZeroAddress)).to.be.revertedWithCustomError(gov, "ZeroAddress");
    });

    it("rejects a caller other than the registrar", async function () {
      const { gov, alice, carol } = await networkHelpers.loadFixture(deployFixture);
      await expect(gov.connect(alice).registerSupplier(carol.address)).to.be.revertedWithCustomError(
        gov,
        "NotRegistrar",
      );
    });
  });
});
