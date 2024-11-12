const path = require("path");
let { Web3 } = require("web3");
let web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));
const { BN } = require("web3").utils;

// Module 1: Smart Contract Module
const contractJSON = require(path.resolve(
  __dirname,
  "./build/contracts/BatchingTransaction.json"
));
const contractABI = contractJSON.abi;
const contractAddress = "0x442CB91D9b417a80632b19C515d55f675deE21d3";

async function loadContract() {
  return new web3.eth.Contract(contractABI, contractAddress);
}

// Module 2: Web3 Contract Interaction Module - Define functions to interact with the contract
async function getMilestones(contract) {
  try {
    const milestonesCount = await contract.methods.getMilestoneCount().call();
    logMilestoneCount(milestonesCount);

    const milestones = [];
    for (let i = 0; i < parseInt(milestonesCount.toString()); i++) {
      const milestone = await contract.methods.getMilestone(i).call();
      milestones.push({
        description: milestone[0],
        price: web3.utils.fromWei(milestone[1], "ether"),
        completed: milestone[2],
      });
    }
    logMilestones(milestones);
    return milestonesCount;
  } catch (error) {
    console.error("Error fetching milestones:", error);
  }
}

// Function to approve the milestone by the buyer
async function approveMilestoneByBuyer(contract, buyerAddress, milestoneIdx) {
  try {
    await contract.methods
      .approveMilestoneByBuyer(milestoneIdx)
      .send({ from: buyerAddress });
    console.log(`Buyer has approved milestone ${milestoneIdx + 1}`);
  } catch (error) {
    console.error(`Error approving milestone ${milestoneIdx}:`, error);
  }
}

// Function to approve the milestone by the seller
async function approveMilestoneBySeller(contract, sellerAddress, milestoneIdx) {
  try {
    await contract.methods
      .approveMilestoneBySeller(milestoneIdx)
      .send({ from: sellerAddress, gas: 500000 });
    console.log(`Seller has approved milestone ${milestoneIdx + 1}`);
  } catch (error) {
    console.error(`Error approving milestone ${milestoneIdx}:`, error);
  }
}

async function completeMilestone(contract, sellerAddress, milestoneIdx) {
  try {
    // Call the public wrapper function that internally calls the internal function
    await contract.methods
      .completeMilestoneWrapper(milestoneIdx)
      .send({ from: sellerAddress, gas: 500000 });
    console.log(`Milestone ${milestoneIdx + 1} completed successfully.`);
    return true;
  } catch (error) {
    console.error("Error completing milestone:", error);
    return false;
  }
}

// Module 3: Transaction Module - Handles deposit and refund transactions
async function depositFunds(contract, buyerAddress, amount) {
  try {
    const receipt = await contract.methods.deposit().send({
      from: buyerAddress,
      value: amount,
    });
    console.log("Payment sent. Waiting for job completion...", receipt);
  } catch (error) {
    console.error("Payment failed:", error);
  }
}

async function initiateRefund(contract, buyerAddress) {
  try {
    // Ensure buyerAddress is the address of the buyer in the smart contract
    await contract.methods.refund().send({ from: buyerAddress, gas: 500000 });
    console.log("Refund successful.");
  } catch (error) {
    console.error("Error refunding the amount to the buyer:", error);
  }
}

// Module 4: Event Logging Module - Handles log outputs for various actions
function logMilestoneCount(count) {
  console.log("Total Milestones Count:", count.toString());
}

function logMilestones(milestones) {
  milestones.forEach((milestone, index) => {
    console.log(`Milestone ${index + 1}:`, milestone);
  });
}

function logMilestoneCompletion(milestoneIdx) {
  console.log(`Milestone ${milestoneIdx + 1} has been completed.`);
}

function logIncompleteMilestones(remaining) {
  console.log(
    `${remaining} milestones were not completed. Initiating refund...`
  );
}

async function delay(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

// Main execution function
async function main() {
  const contract = await loadContract();
  const accounts = await web3.eth.getAccounts();
  const buyerAddress = accounts[0];
  const sellerAddress = accounts[1];
  const paymentAmount = web3.utils.toWei("2", "ether");

  console.log(
    "--------------------------Buyer Payment--------------------------------"
  );
  // Step 1: Deposit funds from buyer to contract
  await depositFunds(contract, buyerAddress, paymentAmount);
  console.log(
    "--------------------------Buyer Payment--------------------------------"
  );
  console.log("  ");
  console.log("  ");
  // Step 2: Retrieve and log milestones
  const milestonesCount = await getMilestones(contract);

  console.log("----------------Seller Completing Milestones-----------------");
  // Step 3: Seller and Buyer approve and complete milestones
  console.log("Seller attempting to complete the milestones....");
  let completed = 0;
  let milestoneIdx = 0;
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    await delay(3);
    if (completed === parseInt(milestonesCount.toString())) break;

    console.log(`Iteration ${i}: `);
    let randomNum = Math.floor(Math.random() * 10);
    console.log("Random Number generated:", randomNum);

    if (randomNum % 2 === 0) {
      // Step 4: Both buyer and seller approve the milestone
      await approveMilestoneByBuyer(contract, buyerAddress, milestoneIdx); // Buyer Approval
      await approveMilestoneBySeller(contract, sellerAddress, milestoneIdx); // Seller Approval

      // Step 5: If both approve, complete the milestone
      const success = await completeMilestone(
        contract,
        sellerAddress,
        milestoneIdx
      );
      if (success) {
        milestoneIdx++;
        completed++;
      }
    } else {
      console.log("Seller failed to do the job");
    }
  }
  console.log("----------------Seller Completing Milestones-----------------");
  // Step 6: Check for remaining milestones and initiate refund if necessary
  if (completed === milestonesCount) {
    console.log("All the milestones have been completed.");
    process.exit();
  } else {
    console.log("  ");
    console.log("  ");
    console.log("----------------Refund Operation-----------------");

    const incompleteMilestones =
      parseInt(milestonesCount.toString()) - completed;
    logIncompleteMilestones(incompleteMilestones);

    await delay(3);
    await initiateRefund(contract, buyerAddress);
    console.log("----------------Refund Operation-----------------");
  }
}

// Execute the main function
main();
