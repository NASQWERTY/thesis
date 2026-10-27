// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Community governance with delegated voting and automatic testnet payment
/// @notice One deployment per community. See docs/prototype/spec.md.
contract CommunityGovernance {
    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error ZeroQuorum();
    error ZeroPeriod();

    // ---------------------------------------------------------------------
    // Parameters (spec §2)
    // ---------------------------------------------------------------------

    /// @notice A delegate cannot accumulate more than total eligible weight / 3 (ADR-0019).
    uint32 public constant DELEGATION_CAP_DIVISOR = 3;

    /// @notice Candidate id for "rechazar todas" inside a ballot. Bid ids start at 1.
    uint256 public constant REJECT_ALL = 0;

    /// @notice Bidding window length in seconds, counted from the issue's creation.
    uint48 public immutable BIDDING_PERIOD;

    /// @notice Voting window length in seconds, starting when bidding ends.
    uint48 public immutable VOTING_PERIOD;

    /// @notice Minimum expressed weight for an issue to be awardable, in weight units.
    uint32 public immutable quorum;

    // ---------------------------------------------------------------------
    // State (spec §3)
    // ---------------------------------------------------------------------

    /// @notice The only account allowed to modify the member and supplier registries (ADR-0015).
    address public immutable registrar;

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(uint32 quorum_, uint48 biddingPeriod_, uint48 votingPeriod_) {
        if (quorum_ == 0) revert ZeroQuorum();
        if (biddingPeriod_ == 0 || votingPeriod_ == 0) revert ZeroPeriod();

        registrar = msg.sender;
        quorum = quorum_;
        BIDDING_PERIOD = biddingPeriod_;
        VOTING_PERIOD = votingPeriod_;
    }
}
