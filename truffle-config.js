const HDWalletProvider = require("@truffle/hdwallet-provider");
const { mnemonic } = require("./secrets.json"); // Ensure this file contains your mnemonic

module.exports = {
  networks: {
    // Existing Ganache Local Network (Layer 1)
    development: {
      host: "127.0.0.1", // Localhost
      port: 7545, // Port for Ganache
      network_id: "*", // Any network (Ganache)
    },
    // New Optimism Goerli Network (Layer 2)
    optimism_goerli: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://opt-goerli.g.alchemy.com/v2/bsK0HF-VrFGpTfwnPVFdCIq508PO77dP` // Use the Goerli Optimism RPC URL
        ),
      network_id: 420, // Optimism Goerli's network id
      gas: 10000000, // Adjusted gas limit for Layer 2
      gasPrice: 5000000, // Gas price for Optimism Goerli (this may need to be adjusted)
      confirmations: 2, // Number of confirmations to wait between deployments
      timeoutBlocks: 200, // Timeout for blocks before deployment fails
      skipDryRun: true, // Skip dry run before migration
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://sepolia.infura.io/v3/37f179ba5c2e4b0bae285174702a3bba`
        ),
      network_id: 11155111, // Sepolia's network ID
      gas: 20000000000, // Gas limit
      confirmations: 2, // Number of confirmations to wait for
      timeoutBlocks: 200, // Timeout for deployment
      skipDryRun: true, // Skip dry-run before migrations
    },
  },

  // Set default mocha options here, use special reporters, etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0", // Use the same Solidity version for both networks
    },
  },
};
