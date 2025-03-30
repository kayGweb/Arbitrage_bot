# Test Directory Context

This document provides context about the test directory structure in the Multi-Chain DEX Arbitrage Bot application. It's intended to help AI assistants understand the organization of test files and their purposes.

## Overview

The project includes tests to verify the functionality of smart contracts and other components. The test directory appears to use Hardhat's testing framework for Ethereum contracts.

## Test Directory Structure

The test directory contains several subdirectories organized by test type:

```
test/
├── Arbitrage.js            # Tests for the Arbitrage smart contract
├── integration/            # Integration tests
│   └── ...                 # Various integration test files
├── unit/                   # Unit tests
│   └── ...                 # Various unit test files
└── temp/                   # Temporary tests
    └── ...                 # Various temporary test files
```

### Test Categories

- **Root Directory**: Contains contract tests like Arbitrage.js
- **Integration Tests**: Tests that verify multiple components working together
- **Unit Tests**: Tests that focus on individual components in isolation
- **Temporary Tests**: Tests that are in development or used for specific temporary purposes

## Test Framework and Tools

The tests use Hardhat's testing environment with Chai for assertions. This is evidenced by the imports seen in the Arbitrage.js test file:

```javascript
const { expect } = require("chai")
```

The testing framework includes:

- **Hardhat**: Ethereum development environment for testing, compiling, and deploying smart contracts
- **Chai**: Assertion library for test verification
- **Ethers.js**: Library for interacting with the Ethereum blockchain
- **Mocha**: Test runner (used implicitly through Hardhat)

Different types of tests may use additional testing tools specific to their needs:

- **Unit tests**: May use mocking libraries to isolate components
- **Integration tests**: Typically use actual contract deployments on Hardhat's local network
- **Contract tests**: Use Hardhat's contract testing utilities

## Arbitrage.js Test Structure

The Arbitrage.js file contains tests for the Arbitrage smart contract:

```javascript
describe("Arbitrage", () => {
  let owner
  let arbitrage

  beforeEach(async () => {
    [owner] = await ethers.getSigners()

    arbitrage = await hre.ethers.deployContract(
      "Arbitrage",
      [
        config.SUSHISWAP.V2_ROUTER_02_ADDRESS,
        config.UNISWAP.V2_ROUTER_02_ADDRESS
      ]
    )

    await arbitrage.waitForDeployment()
  })

  describe("Deployment", () => {
    it("Sets the sRouter", async () => {
      expect(await arbitrage.sRouter()).to.equal(config.SUSHISWAP.V2_ROUTER_02_ADDRESS)
    })

    it("Sets the uRouter", async () => {
      expect(await arbitrage.uRouter()).to.equal(config.UNISWAP.V2_ROUTER_02_ADDRESS)
    })

    it("Sets the owner", async () => {
      expect(await arbitrage.owner()).to.equal(await owner.getAddress())
    })
  })

  describe("Trading", () => {
    /**
     * Feel Free to customize and add in your own unit testing here.
     */
  })
})
```

The test:
1. Sets up the test environment in a `beforeEach` hook
2. Tests that the contract deployment correctly sets up the initial state
3. Has a placeholder for testing trading functionality

## Running Tests

Based on the package.json file, tests can be run using:

```bash
npm test
```

This executes Hardhat's test runner against the test directory.

For running specific test categories, you might use:

```bash
# Run all tests
npm test

# Run only unit tests
npx hardhat test test/unit

# Run only integration tests
npx hardhat test test/integration

# Run a specific test file
npx hardhat test test/Arbitrage.js
```

When running integration tests, you may need a local Hardhat network running:

```bash
# In one terminal
npx hardhat node

# In another terminal
npx hardhat test test/integration --network localhost
```

## Note on Accuracy

This document has been updated with additional information about the test directory structure that wasn't directly visible in the originally uploaded files. The information about the integration, unit, and temp test directories has been added based on explicit confirmation from the project maintainer. 

The test file structure described represents the current understanding of the test organization, though specific test files within each subdirectory have not been individually confirmed.
