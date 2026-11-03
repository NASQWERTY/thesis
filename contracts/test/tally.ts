import { expect } from "chai";
import { ethers, networkHelpers } from "./helpers.js";

// Candidate indices as the tally sees them: 0 is REJECT_ALL, 1.. are bids.
const R = 0n;
const A = 1n;
const B = 2n;
const C = 3n;

async function harnessFixture() {
  return { harness: await ethers.deployContract("TallyHarness") };
}

describe("Schulze tally (ADR-0022)", function () {
  it("builds the pairwise matrix: p[a][b] = weight of the voters ranking a above b", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    const p = await harness.pairwise([[A, B, R], [B, R, A]], [3n, 2n], 3n);
    expect(p[Number(A)][Number(B)]).to.equal(3n);
    expect(p[Number(B)][Number(A)]).to.equal(2n);
    expect(p[Number(A)][Number(R)]).to.equal(3n);
    expect(p[Number(R)][Number(A)]).to.equal(2n);
    expect(p[Number(B)][Number(R)]).to.equal(5n);
    expect(p[Number(R)][Number(B)]).to.equal(0n);
  });

  it("elects the Condorcet winner when there is one", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    const [hasWinner, winner] = await harness.tally([[A, B, R], [B, A, R]], [3n, 2n], 3n);
    expect(hasWinner).to.equal(true);
    expect(winner).to.equal(A);
  });

  it("resolves a cycle with the strongest path: 4 A>B>C, 3 B>C>A, 2 C>A>B → A", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    // The example of ADR-0022 (REJECT_ALL last on every ballot). A beats B 6–3, B beats C 7–2,
    // C beats A 5–4: a cycle. The path A→B→C has strength 6 > 5, so A wins.
    const rankings = [
      [A, B, C, R],
      [B, C, A, R],
      [C, A, B, R],
    ];
    const weights = [4n, 3n, 2n];
    const p = await harness.pairwise(rankings, weights, 4n);
    expect([p[1][2], p[2][3], p[3][1]]).to.deep.equal([6n, 7n, 5n]);

    const [hasWinner, winner] = await harness.tally(rankings, weights, 4n);
    expect(hasWinner).to.equal(true);
    expect(winner).to.equal(A);
  });

  it("finds no unique winner in a symmetric cycle with equal weights", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    const rankings = [
      [A, B, C, R],
      [B, C, A, R],
      [C, A, B, R],
    ];
    const [hasWinner, winner] = await harness.tally(rankings, [1n, 1n, 1n], 4n);
    expect(hasWinner).to.equal(false);
    expect(winner).to.equal(0n);
  });

  it("finds no unique winner when two candidates tie head to head", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    const [hasWinner] = await harness.tally([[A, B, R], [B, A, R]], [2n, 2n], 3n);
    expect(hasWinner).to.equal(false);
  });

  it("lets REJECT_ALL win as a regular candidate", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    const [hasWinner, winner] = await harness.tally([[R, A, B], [A, R, B]], [3n, 1n], 3n);
    expect(hasWinner).to.equal(true);
    expect(winner).to.equal(R);
  });

  it("with one bid, is a plain majority against REJECT_ALL", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    expect(await harness.tally([[A, R], [R, A]], [2n, 1n], 2n)).to.deep.equal([true, A]);
    expect(await harness.tally([[A, R], [R, A]], [1n, 2n], 2n)).to.deep.equal([true, R]);
    expect((await harness.tally([[A, R], [R, A]], [1n, 1n], 2n))[0]).to.equal(false);
  });

  it("finds no winner without ballots", async function () {
    const { harness } = await networkHelpers.loadFixture(harnessFixture);
    expect((await harness.tally([], [], 3n))[0]).to.equal(false);
  });
});
