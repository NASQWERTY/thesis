import { network } from "hardhat";

// One simulated chain shared by every test file; loadFixture restores a snapshot per test.
export const { ethers, networkHelpers } = await network.create();

export const QUORUM_PERCENT = 50;
export const BIDDING_PERIOD = 3600; // 1 h
export const VOTING_PERIOD = 7200; // 2 h

export async function deployFixture() {
  const [registrar, alice, bob, carol, dave, erin] = await ethers.getSigners();
  const gov = await ethers.deployContract("CommunityGovernance", [QUORUM_PERCENT, BIDDING_PERIOD, VOTING_PERIOD]);
  return { gov, registrar, alice, bob, carol, dave, erin };
}

export const CID = "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
export const TOPIC = ethers.encodeBytes32String("mantenimiento");
export const TREASURY = ethers.parseEther("10");

// IssueStatus / IssuePhase as numbers (ethers returns enums as bigint).
export const Status = { Open: 0n, Awarded: 1n, Executed: 2n, ClosedWithoutAward: 3n };
export const Phase = { Bidding: 0n, Voting: 1n, VotingEnded: 2n, Closed: 3n };

/** alice and bob are eligible members, carol and erin are suppliers, the treasury holds 10 ETH. */
export async function communityFixture() {
  const f = await deployFixture();
  await f.gov.registerMember(f.alice.address, 1);
  await f.gov.registerMember(f.bob.address, 1);
  await f.gov.registerSupplier(f.carol.address);
  await f.gov.registerSupplier(f.erin.address);
  await f.registrar.sendTransaction({ to: f.gov, value: TREASURY });
  return f;
}

/** communityFixture + alice's issue #1 with a 4 ETH ceiling, in its bidding phase. */
export async function withIssueFixture() {
  const f = await communityFixture();
  await f.gov.connect(f.alice).createIssue(CID, TOPIC, ethers.parseEther("4"));
  const createdAt = BigInt(await networkHelpers.time.latest());
  return { ...f, issueId: 1n, createdAt, ceiling: ethers.parseEther("4") };
}
