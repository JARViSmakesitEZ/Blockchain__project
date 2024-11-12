const path = require("path");
let { Web3 } = require("web3");
let web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

// Load the ABI and contract address
const contractJSON = require(path.resolve(
  __dirname,
  "./build/contracts/BatchingTransaction.json"
));
const contractABI = contractJSON.abi; // Get the ABI
const contractAddress = "0xB84A672175A5FfD5b47632765FDFE5c477243E54"; // Address from deployment

async function main() {
  const contract = new web3.eth.Contract(contractABI, contractAddress);
  let completed = 0;
  let milestonesCount = 0;

  // Get the accounts
  const accounts = await web3.eth.getAccounts();
  const buyerAddress = accounts[0]; // Buyer address
  const sellerAddress = accounts[1]; // Seller address

  try {
    // Define payment function
    async function initiatePayment() {
      const paymentAmount = web3.utils.toWei("1", "ether"); // Sending 1 ETH

      // Send payment from buyer to the contract
      try {
        const receipt = await contract.methods.deposit().send({
          from: buyerAddress,
          value: paymentAmount,
        });
        console.log("Payment sent. Waiting for job completion...", receipt);
      } catch (error) {
        console.error("Payment failed:", error);
        return; // Exit if payment fails
      }
      await delay(10);
      console.log("Fetching milestones...");

      // Fetch milestones
      try {
        milestonesCount = await contract.methods.getMilestoneCount().call();
        console.log("Total Milestones Count:", milestonesCount.toString()); // Convert BigInt to String

        // Loop through milestones to retrieve details
        for (let i = 0; i < parseInt(milestonesCount.toString()); i++) {
          const milestone = await contract.methods.getMilestone(i).call();
          console.log({
            description: milestone[0],
            price: web3.utils.fromWei(milestone[1], "ether"),
            completed: milestone[2],
          });
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
      }
    }

    // Call the payment initiation
    await initiatePayment();
  } catch (error) {
    console.error("Error in main function:", error);
  }

  // Completing the jobs
  console.log("Seller attempting to complete the milestones....");
  let iterations = 10;
  let milestoneIdx = 0;

  try {
    for (let i = 0; i < iterations; i++) {
      if (completed == parseInt(milestonesCount.toString())) break;
      console.log(`Iteration ${i}: `);

      let randomNum = Math.floor(Math.random() * 10) * 2;
      if (i >= 0) randomNum = 5;
      // let randomNum = 5;
      console.log("Random Number generated: " + randomNum);
      if (randomNum % 2 == 0) {
        const res = await contract.methods
          .completeMilestone(milestoneIdx)
          .send({ from: sellerAddress });

        console.log(`Milestone ${milestoneIdx + 1} has been completed.`);
        milestoneIdx++;
        completed++;
      } else {
        console.log("Seller failed to do the job");
      }
    }
  } catch (error) {
    console.error("Error completing the milestones: ", error);
  }

  if (completed == milestonesCount) {
    console.log("All the milestones have been completed");
    process.exit();
  } else {
    console.log(
      parseInt(milestonesCount.toString()) -
        completed +
        " milestones were not completed. Initiating refund..."
    );
    try {
      await delay(3);
      const report = await contract.methods
        .refund()
        .send({ from: buyerAddress });
      console.log("Refund successful");
    } catch (error) {
      console.log("Error refunding the amount to the buyer: ", error);
    }
  }
}

async function delay(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000); // converting seconds to milliseconds
  });
}

// Call the main function
main();
