// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SchulzeTally} from "../SchulzeTally.sol";

/// @dev Test-only: exposes the internal library functions so the tally can be tested in isolation.
contract TallyHarness {
    function tally(uint256[][] memory rankings, uint256[] memory weights, uint256 n)
        external
        pure
        returns (bool hasWinner, uint256 winner)
    {
        return SchulzeTally.tally(rankings, weights, n);
    }

    function pairwise(uint256[][] memory rankings, uint256[] memory weights, uint256 n)
        external
        pure
        returns (uint256[][] memory)
    {
        return SchulzeTally.pairwise(rankings, weights, n);
    }
}
