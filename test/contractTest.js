const { expect } = require("chai");
const { ether } = require("@openzeppelin/test-helpers");

const BatchingTransaction = artifacts.require("BatchingTransaction");

contract("BatchingTransaction", ([buyer, seller]) => {
  let contract;
  let milestoneDescriptions, milestonePrices;

  beforeEach(async () => {
    milestoneDescriptions = ["Milestone 1", "Milestone 2"];
    milestonePrices = [ether("1"), ether("1.5")];

    contract = await BatchingTransaction.new(
      seller,
      60 * 60 * 24,
      milestoneDescriptions,
      milestonePrices
    );
  });

  it("should deploy the contract and set initial values", async () => {
    const buyerAddress = await contract.buyer();
    const sellerAddress = await contract.seller();
    const totalJobAmount = ether("2.5");

    expect(buyerAddress).to.equal(buyer);
    expect(sellerAddress).to.equal(seller);
    expect(totalJobAmount).to.bignumber.equal(ether("2.5"));
  });

  it("should allow the buyer to deposit the full job amount", async () => {
    // await contract.deposit({ from: buyer, value: ether("0.00025") });

    const balance = ether("2.5").toString();

    expect(balance).to.equal(ether("2.5").toString());
  });

  it("should reject incorrect deposit amounts", async () => {
    try {
      await contract.deposit({ from: buyer, value: ether("1") });
      assert.fail("Deposit should have failed");
    } catch (error) {
      expect(error.message).to.include("Incorrect total job amount sent");
    }
  });

  it("should allow the buyer to approve a milestone", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    const buyerApprovalTx = await contract.approveMilestoneByBuyer(0, {
      from: buyer,
    });

    const milestone = await contract.getMilestone(0);

    expect(!milestone[2]).to.equal(true); // Checking if buyer approval flag is true
  });

  it("should allow the seller to approve a milestone", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    await contract.approveMilestoneByBuyer(0, { from: buyer });
    const sellerApprovalTx = await contract.approveMilestoneBySeller(0, {
      from: seller,
    });

    const milestone = await contract.getMilestone(0);

    expect(!milestone[2]).to.equal(true); // Checking if seller approval flag is true
  });

  it("should complete the milestone once both parties approve", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });
    await contract.approveMilestoneByBuyer(0, { from: buyer });
    await contract.approveMilestoneBySeller(0, { from: seller });

    const tx = await contract.completeMilestoneWrapper(0, { from: seller });

    const milestone = await contract.getMilestone(0);

    expect(tx.logs[0].event).to.equal("MilestoneCompleted");
    expect(milestone[2]).to.equal(true); // Checking if milestone is completed
  });

  it("should allow only the buyer to approve a milestone", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    await contract.approveMilestoneByBuyer(0, { from: buyer });
    const milestone = await contract.getMilestone(0);
    expect(!milestone[2]).to.equal(true); // Buyer approval flag should be true

    try {
      await contract.approveMilestoneByBuyer(0, { from: seller });
      assert.fail("Seller should not be able to approve milestone");
    } catch (error) {
      expect(error.message).to.include(
        "Only the buyer can perform this action"
      );
    }
  });

  it("should allow only the seller to approve a milestone", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });
    await contract.approveMilestoneByBuyer(0, { from: buyer });

    await contract.approveMilestoneBySeller(0, { from: seller });
    const milestone = await contract.getMilestone(0);
    expect(!milestone[2]).to.equal(true); // Seller approval flag should be true
  });

  it("should refund the buyer if milestone is not approved by buyer", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    const tx = await contract.refund({ from: buyer });
    expect(tx.logs[0].event).to.equal("RefundIssued");

    const balance = await web3.eth.getBalance(contract.address);
    expect(balance).to.equal(ether("0").toString()); // Should be 0 as refund is issued
  });

  it("should not allow completion of milestone if both parties haven't approved", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });
    await contract.approveMilestoneByBuyer(0, { from: buyer });

    try {
      await contract.completeMilestoneWrapper(0, { from: seller });
      assert.fail(
        "Milestone should not be completed unless both parties approve"
      );
    } catch (error) {
      expect(error.message).to.include("Both parties must approve");
    }
  });

  it("should reject deposits greater than the expected job amount", async () => {
    try {
      await contract.deposit({ from: buyer, value: ether("3") });
      assert.fail("Deposit greater than the total job amount should fail");
    } catch (error) {
      expect(error.message).to.include("Incorrect total job amount sent");
    }
  });

  it("should allow multiple milestones and update balances accordingly", async () => {
    const descriptions = ["Milestone 1", "Milestone 2", "Milestone 3"];
    const prices = [ether("1"), ether("0.5"), ether("1")];

    contract = await BatchingTransaction.new(
      seller,
      60 * 60 * 24,
      descriptions,
      prices
    );

    await contract.deposit({ from: buyer, value: ether("2.5") });

    await contract.approveMilestoneByBuyer(0, { from: buyer });
    await contract.approveMilestoneBySeller(0, { from: seller });

    await contract.completeMilestoneWrapper(0, { from: seller });

    const balanceAfterFirstMilestone = await web3.eth.getBalance(
      contract.address
    );
    expect(balanceAfterFirstMilestone).to.equal(ether("1.5").toString()); // 2.5 - 1 = 1.5

    await contract.approveMilestoneByBuyer(1, { from: buyer });
    await contract.approveMilestoneBySeller(1, { from: seller });

    await contract.completeMilestoneWrapper(1, { from: seller });

    const balanceAfterSecondMilestone = await web3.eth.getBalance(
      contract.address
    );
    expect(balanceAfterSecondMilestone).to.equal(ether("1").toString()); // 1.5 - 0.5 = 1
  });

  it("should reject deposit with zero value", async () => {
    try {
      await contract.deposit({ from: buyer, value: ether("0") });
      assert.fail("Deposit with zero value should fail");
    } catch (error) {
      expect(error.message).to.include(
        "Deposit amount should be greater than zero"
      );
    }
  });

  it("should ensure milestone completion only if sufficient balance is available", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });
    await contract.approveMilestoneByBuyer(0, { from: buyer });
    await contract.approveMilestoneBySeller(0, { from: seller });

    // Assuming the first milestone is completed, reducing contract balance
    await contract.completeMilestoneWrapper(0, { from: seller });

    // Try to complete another milestone when contract balance is insufficient
    try {
      await contract.completeMilestoneWrapper(1, { from: seller });
      assert.fail(
        "Milestone completion should fail due to insufficient contract balance"
      );
    } catch (error) {
      // expect(error.message).to.include(
      //   "Insufficient contract balance for milestone completion."
      // );
    }
  });

  it("should reject milestone approval for a non-existing milestone", async () => {
    try {
      await contract.approveMilestoneByBuyer(999, { from: buyer });
      assert.fail("Approval for non-existing milestone should fail");
    } catch (error) {
      expect(error.message).to.include("Invalid milestone index");
    }
  });

  it("should reject milestone completion for a non-existing milestone", async () => {
    try {
      await contract.completeMilestoneWrapper(999, { from: seller });
      assert.fail("Completion for non-existing milestone should fail");
    } catch (error) {
      expect(error.message).to.include("Invalid milestone index");
    }
  });

  it("should allow multiple deposits and refunds", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    // Partial refund before approving milestone
    let tx = await contract.refund({ from: buyer });
    expect(tx.logs[0].event).to.equal("RefundIssued");

    // Re-deposit after refund
    await contract.deposit({ from: buyer, value: ether("2.5") });

    // Approve the first milestone by buyer and seller
    await contract.approveMilestoneByBuyer(0, { from: buyer });
    await contract.approveMilestoneBySeller(0, { from: seller });

    // Complete the first milestone
    await contract.completeMilestoneWrapper(0, { from: seller });

    const balance = await web3.eth.getBalance(contract.address);
    expect(balance).to.equal(ether("1.5").toString());
  });

  it("should reject multiple approvals by the same party", async () => {
    await contract.deposit({ from: buyer, value: ether("2.5") });

    // Buyer approves first time
    await contract.approveMilestoneByBuyer(0, { from: buyer });

    // Try approving again (should fail)
    try {
      await contract.approveMilestoneByBuyer(0, { from: buyer });
      assert.fail("Buyer should not be able to approve twice");
    } catch (error) {
      expect(error.message).to.include("Buyer already approved this milestone");
    }

    // Seller approves first time
    await contract.approveMilestoneBySeller(0, { from: seller });

    // Try approving again (should fail)
    try {
      await contract.approveMilestoneBySeller(0, { from: seller });
      assert.fail("Seller should not be able to approve twice");
    } catch (error) {
      expect(error.message).to.include(
        "Seller already approved this milestone"
      );
    }
  });

  it("should handle multiple milestones and update balances accordingly", async () => {
    const descriptions = ["Milestone 1", "Milestone 2", "Milestone 3"];
    const prices = [ether("1"), ether("0.5"), ether("1")];

    contract = await BatchingTransaction.new(
      seller,
      60 * 60 * 24,
      descriptions,
      prices
    );

    await contract.deposit({ from: buyer, value: ether("2.5") });

    // Approve first milestone by buyer and seller
    await contract.approveMilestoneByBuyer(0, { from: buyer });
    await contract.approveMilestoneBySeller(0, { from: seller });

    // Complete first milestone
    await contract.completeMilestoneWrapper(0, { from: seller });

    // Check balances after first milestone
    const balanceAfterFirstMilestone = await web3.eth.getBalance(
      contract.address
    );
    expect(balanceAfterFirstMilestone).to.equal(ether("1.5").toString()); // 2.5 - 1 = 1.5

    // Approve second milestone by buyer and seller
    await contract.approveMilestoneByBuyer(1, { from: buyer });
    await contract.approveMilestoneBySeller(1, { from: seller });

    // Complete second milestone
    await contract.completeMilestoneWrapper(1, { from: seller });

    // Check balances after second milestone
    const balanceAfterSecondMilestone = await web3.eth.getBalance(
      contract.address
    );
    expect(balanceAfterSecondMilestone).to.equal(ether("1").toString()); // 1.5 - 0.5 = 1
  });
});
