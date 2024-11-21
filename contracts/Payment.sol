// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BatchingTransaction {
    struct Milestone {
        string description;
        uint paymentAmount;
        bool completed;
        bool buyerApproved; // Track buyer's approval
        bool sellerApproved; // Track seller's approval
    }

    address payable public buyer;    
    address payable public seller;    
    uint public immutable durationInSeconds;
    uint public deadline;
    uint public totalJobAmount;

    Milestone[] public milestones;

    event PaymentMade(address indexed buyer, uint amount);
    event MilestoneCompleted(uint milestoneIndex, address indexed seller);
    event RefundIssued(address indexed buyer, uint amount);
    event ApprovalReceived(uint milestoneIndex, address indexed approver);

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only the buyer can perform this action");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only the seller can perform this action");
        _;
    }

    modifier milestoneExists(uint milestoneIndex) {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        _;
    }

    constructor(address payable _seller, uint _durationInSeconds, string[] memory _descriptions, uint[] memory _prices) {
        buyer = payable(msg.sender);  
        seller = _seller;             

        durationInSeconds = _durationInSeconds;

        // Initialize milestones and calculate total job amount
        for (uint i = 0; i < _descriptions.length; i++) {
            milestones.push(Milestone({
                description: _descriptions[i],
                paymentAmount: _prices[i],
                completed: false,
                buyerApproved: false,
                sellerApproved: false
            }));
            totalJobAmount += _prices[i]; // Calculate the total job amount
        }
    }

    // Buyer sends the full job amount upon contract deployment
    function deposit() external payable onlyBuyer {
        require(msg.value > 0,"Deposit amount should be greater than zero");
        require(msg.value == totalJobAmount, "Incorrect total job amount sent");
        
        // Set the deadline based on the duration after deposit
        deadline = block.timestamp + durationInSeconds;
    }

    // Approve milestone by buyer
    function approveMilestoneByBuyer(uint milestoneIndex) external onlyBuyer milestoneExists(milestoneIndex) {
        Milestone storage milestone = milestones[milestoneIndex];
        require(!milestone.completed, "Milestone already completed");
        require(!milestone.buyerApproved, "Buyer already approved this milestone");

        milestone.buyerApproved = true;
        emit ApprovalReceived(milestoneIndex, msg.sender);

        // Check if both parties have approved to complete the milestone
        // if (milestone.buyerApproved && milestone.sellerApproved) {
        //     completeMilestone(milestoneIndex);
        // }
    }

    // Approve milestone by seller
    function approveMilestoneBySeller(uint milestoneIndex) external onlySeller milestoneExists(milestoneIndex) {
        Milestone storage milestone = milestones[milestoneIndex];
        require(!milestone.completed, "Milestone already completed");
        require(!milestone.sellerApproved, "Seller already approved this milestone");

        milestone.sellerApproved = true;
        emit ApprovalReceived(milestoneIndex, msg.sender);

        // Check if both parties have approved to complete the milestone
        // if (milestone.buyerApproved && milestone.sellerApproved) {
        //     completeMilestone(milestoneIndex);
        // }
    }

    // Complete milestone once both approvals are met
    function completeMilestone(uint milestoneIndex) internal {
        Milestone storage milestone = milestones[milestoneIndex];
        require(milestone.buyerApproved && milestone.sellerApproved, "Both parties must approve");

        milestone.completed = true;

        // Logic for transferring the payment for this milestone to the seller
        (bool success, ) = seller.call{value: milestone.paymentAmount}("");
        require(success, "Payment transfer failed");

        emit MilestoneCompleted(milestoneIndex, seller);
    }

    // The public/external wrapper for the internal function
    function completeMilestoneWrapper(uint milestoneIndex) external onlySeller milestoneExists(milestoneIndex) {
        require(address(this).balance >= milestones[milestoneIndex].paymentAmount, "Insufficient contract balance for milestone completion.");
        require(milestones[milestoneIndex].buyerApproved && milestones[milestoneIndex].sellerApproved, "Both parties must approve to complete");
        completeMilestone(milestoneIndex);  // Call the internal function from the external function
    }

    function refund() external onlyBuyer {
    uint amountToRefund = 0;

        // Calculate total for incomplete milestones
        for (uint i = 0; i < milestones.length; i++) {
            if (!milestones[i].completed) {
                amountToRefund += milestones[i].paymentAmount;
            }
        }

        require(amountToRefund > 0, "No funds to refund");
        require(address(this).balance >= amountToRefund, "Insufficient contract balance");

        (bool success, ) = buyer.call{value: amountToRefund}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(buyer, amountToRefund);
    }


    function getMilestoneCount() public view returns (uint) {
        return milestones.length;
    }

    function getMilestone(uint index) public view returns (string memory, uint, bool) {
        require(index < milestones.length, "Index out of bounds");
        Milestone memory milestone = milestones[index];
        return (milestone.description, milestone.paymentAmount, milestone.completed);
    }

    // Return the approval status of the buyer and seller for a milestone
    function getMilestoneApprovals(uint milestoneIndex) public view milestoneExists(milestoneIndex) returns (bool buyerApproved, bool sellerApproved) {
        Milestone memory milestone = milestones[milestoneIndex];
        return (milestone.buyerApproved, milestone.sellerApproved);
    }
}
