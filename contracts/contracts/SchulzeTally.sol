// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Schulze tally over weighted complete rankings (ADR-0022, spec §5)
/// @notice Pure: knows nothing about issues or bids. Candidates are indices 0..n-1.
library SchulzeTally {
    /// @param rankings One complete ranking per voter: every index 0..n-1 exactly once, most
    /// preferred first. The caller guarantees it (castBallot validates each ballot).
    /// @param weights Weight of each ranking, same length as `rankings`.
    /// @param n Number of candidates.
    /// @return hasWinner False when no candidate beats every other by strongest path (tie).
    /// @return winner The winning index; 0 when there is none.
    function tally(uint256[][] memory rankings, uint256[] memory weights, uint256 n)
        internal
        pure
        returns (bool hasWinner, uint256 winner)
    {
        uint256[][] memory p = pairwise(rankings, weights, n);

        // Direct defeats only: s[a][b] = p[a][b] when a beats b, else 0.
        uint256[][] memory s = _matrix(n);
        for (uint256 a = 0; a < n; a++) {
            for (uint256 b = 0; b < n; b++) {
                if (a != b && p[a][b] > p[b][a]) s[a][b] = p[a][b];
            }
        }

        // Strongest paths (Floyd–Warshall, widest path): a path is as strong as its weakest link.
        for (uint256 k = 0; k < n; k++) {
            for (uint256 i = 0; i < n; i++) {
                if (i == k) continue;
                for (uint256 j = 0; j < n; j++) {
                    if (j == k || j == i) continue;
                    uint256 via = s[i][k] < s[k][j] ? s[i][k] : s[k][j];
                    if (via > s[i][j]) s[i][j] = via;
                }
            }
        }

        // At most one candidate can beat every other; none means a tie between strongest paths.
        for (uint256 x = 0; x < n; x++) {
            bool beatsAll = true;
            for (uint256 y = 0; y < n && beatsAll; y++) {
                if (y != x && s[x][y] <= s[y][x]) beatsAll = false;
            }
            if (beatsAll) return (true, x);
        }
        return (false, 0);
    }

    /// @notice p[a][b] = total weight of the voters who rank a above b.
    function pairwise(uint256[][] memory rankings, uint256[] memory weights, uint256 n)
        internal
        pure
        returns (uint256[][] memory p)
    {
        p = _matrix(n);
        for (uint256 v = 0; v < rankings.length; v++) {
            uint256[] memory ranking = rankings[v];
            // Every candidate ranked above ranking[j] beats it on this ballot.
            for (uint256 i = 0; i < n; i++) {
                for (uint256 j = i + 1; j < n; j++) {
                    p[ranking[i]][ranking[j]] += weights[v];
                }
            }
        }
    }

    function _matrix(uint256 n) private pure returns (uint256[][] memory m) {
        m = new uint256[][](n);
        for (uint256 i = 0; i < n; i++) {
            m[i] = new uint256[](n);
        }
    }
}
