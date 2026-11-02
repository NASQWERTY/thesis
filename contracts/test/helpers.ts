import { network } from "hardhat";

// One simulated chain shared by every test file; loadFixture restores a snapshot per test.
export const { ethers, networkHelpers } = await network.create();

export const QUORUM_PERCENT = 50;
export const BIDDING_PERIOD = 3600; // 1 h
export const VOTING_PERIOD = 7200; // 2 h

export async function deployFixture() {
  const [registrar, alice, bob, carol] = await ethers.getSigners();
  const gov = await ethers.deployContract("CommunityGovernance", [QUORUM_PERCENT, BIDDING_PERIOD, VOTING_PERIOD]);
  return { gov, registrar, alice, bob, carol };
}
