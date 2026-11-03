// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGovernance {
    function submitBid(uint256 issueId, uint256 amount, string calldata documentCid) external returns (uint256);
    function executeTransfer(uint256 issueId) external;
}

/// @dev Test-only supplier that is a contract and refuses ETH.
contract RejectingSupplier {
    function bid(IGovernance gov, uint256 issueId, uint256 amount) external {
        gov.submitBid(issueId, amount, "bafkreidoc");
    }

    receive() external payable {
        revert("no ETH");
    }
}

/// @dev Test-only supplier that tries to be paid twice by calling executeTransfer again while
/// receiving the first payment. Records whether the nested call succeeded.
contract ReentrantSupplier {
    IGovernance public gov;
    uint256 public issueId;
    bool public reentered;

    function bid(IGovernance gov_, uint256 issueId_, uint256 amount) external {
        gov = gov_;
        issueId = issueId_;
        gov_.submitBid(issueId_, amount, "bafkreidoc");
    }

    receive() external payable {
        try gov.executeTransfer(issueId) {
            reentered = true;
        } catch {}
    }
}
