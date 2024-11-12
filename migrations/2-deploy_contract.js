const TimedTransaction = artifacts.require("BatchingTransaction");

module.exports = async function (deployer, network, accounts) {
  const sellerAddress = accounts[1]; // Replace with the actual seller address
  const durationInSeconds = 10; // Set the desired duration for the job
  // Define milestone descriptions and prices
  const descriptions = [
    "Milestone 1: Requirement Analysis",
    "Milestone 2: Initial Design",
    "Milestone 3: Detailed Design",
    "Milestone 4: Prototype Development",
    "Milestone 5: Core Module Development",
    "Milestone 6: Integration",
    "Milestone 7: Initial Testing",
    "Milestone 8: User Acceptance Testing",
    "Milestone 9: Final Adjustments",
    "Milestone 10: Project Delivery",
  ];

  const prices = [
    web3.utils.toWei("0.3", "ether"), // Price for Milestone 1
    web3.utils.toWei("0.25", "ether"), // Price for Milestone 2
    web3.utils.toWei("0.2", "ether"), // Price for Milestone 3
    web3.utils.toWei("0.3", "ether"), // Price for Milestone 4
    web3.utils.toWei("0.15", "ether"), // Price for Milestone 5
    web3.utils.toWei("0.2", "ether"), // Price for Milestone 6
    web3.utils.toWei("0.15", "ether"), // Price for Milestone 7
    web3.utils.toWei("0.2", "ether"), // Price for Milestone 8
    web3.utils.toWei("0.15", "ether"), // Price for Milestone 9
    web3.utils.toWei("0.1", "ether"), // Price for Milestone 10
  ];

  await deployer.deploy(
    TimedTransaction,
    sellerAddress,
    durationInSeconds,
    descriptions,
    prices
  );

  // Log the contract address after deployment
  const instance = await TimedTransaction.deployed();
  console.log(
    "TimedTransaction contract deployed at address:",
    instance.address
  );
};
