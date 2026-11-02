import { expect } from "chai";
import { BIDDING_PERIOD, deployFixture, ethers, networkHelpers, QUORUM_PERCENT, VOTING_PERIOD } from "./helpers.js";

describe("deployment", function () {
  it("sets the deployer as registrar", async function () {
    const { gov, registrar } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.registrar()).to.equal(registrar.address);
  });

  it("stores quorum percentage and periods", async function () {
    const { gov } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.QUORUM_PERCENT()).to.equal(QUORUM_PERCENT);
    expect(await gov.BIDDING_PERIOD()).to.equal(BIDDING_PERIOD);
    expect(await gov.VOTING_PERIOD()).to.equal(VOTING_PERIOD);
  });

  it("exposes the fixed constants", async function () {
    const { gov } = await networkHelpers.loadFixture(deployFixture);
    expect(await gov.DELEGATION_CAP_DIVISOR()).to.equal(3);
    expect(await gov.REJECT_ALL()).to.equal(0);
  });

  it("accepts a 100% quorum", async function () {
    const gov = await ethers.deployContract("CommunityGovernance", [100, BIDDING_PERIOD, VOTING_PERIOD]);
    expect(await gov.QUORUM_PERCENT()).to.equal(100);
  });

  it("rejects a zero quorum percentage", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(0, BIDDING_PERIOD, VOTING_PERIOD)).to.be.revertedWithCustomError(
      factory,
      "InvalidQuorumPercent",
    );
  });

  it("rejects a quorum percentage above 100", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(101, BIDDING_PERIOD, VOTING_PERIOD)).to.be.revertedWithCustomError(
      factory,
      "InvalidQuorumPercent",
    );
  });

  it("rejects a zero bidding period", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(QUORUM_PERCENT, 0, VOTING_PERIOD)).to.be.revertedWithCustomError(factory, "ZeroPeriod");
  });

  it("rejects a zero voting period", async function () {
    const factory = await ethers.getContractFactory("CommunityGovernance");
    await expect(factory.deploy(QUORUM_PERCENT, BIDDING_PERIOD, 0)).to.be.revertedWithCustomError(factory, "ZeroPeriod");
  });
});
