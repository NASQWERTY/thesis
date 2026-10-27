import { expect } from "chai";
import { BIDDING_PERIOD, deployFixture, ethers, networkHelpers, QUORUM, VOTING_PERIOD } from "./helpers.js";

describe("deployment", function () {
  it("sets the deployer as registrar", async function () {
    const { gov, registrar } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.registrar()).to.equal(registrar.address);
  });

  it("stores quorum and periods", async function () {
    const { gov } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.quorum()).to.equal(QUORUM);
    expect(await gov.BIDDING_PERIOD()).to.equal(BIDDING_PERIOD);
    expect(await gov.VOTING_PERIOD()).to.equal(VOTING_PERIOD);
  });

  it("exposes the fixed constants", async function () {
    const { gov } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.DELEGATION_CAP_DIVISOR()).to.equal(3);
    expect(await gov.REJECT_ALL()).to.equal(0);
  });

  it("rejects a zero quorum", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(0, BIDDING_PERIOD, VOTING_PERIOD)).to.be.revertedWithCustomError(
      factory,
      "ZeroQuorum",
    );
  });

  it("rejects a zero bidding period", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(QUORUM, 0, VOTING_PERIOD)).to.be.revertedWithCustomError(factory, "ZeroPeriod");
  });

  it("rejects a zero voting period", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(QUORUM, BIDDING_PERIOD, 0)).to.be.revertedWithCustomError(factory, "ZeroPeriod");
  });
});
