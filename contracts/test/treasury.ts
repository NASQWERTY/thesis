import { expect } from "chai";
import { deployFixture, ethers, networkHelpers } from "./helpers.js";

describe("treasury", function () {
  describe("receive", function () {
    it("accepts ETH from any address", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1");

      await expect(alice.sendTransaction({ to: gov, value: amount })).to.changeEtherBalances(
        ethers,
        [alice, gov],
        [-amount, amount],
      );
    });

    it("emits TreasuryFunded with the sender and the amount", async function () {
      const { gov, alice } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("0.5");

      await expect(alice.sendTransaction({ to: gov, value: amount }))
        .to.emit(gov, "TreasuryFunded")
        .withArgs(alice.address, amount);
    });
  });
});
