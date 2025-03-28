# Universal Arbitrage Bot - Testing Guide

This guide provides instructions for running the comprehensive test suite for the Universal Arbitrage Bot. The test suite includes unit tests, integration tests, and smart contract tests to ensure the entire system functions correctly.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Hardhat for Ethereum development and testing
- Forge (Foundry) for additional Solidity testing (optional)

## Setting Up the Test Environment

1. Install dependencies:

```bash
npm install
```

2. Create a test configuration file:

```bash
cp .env.example .env.test
```

3. Edit `.env.test` to set up test configuration:

```
# Test Configuration
NODE_ENV=test
DB_PATH=./data/test.db
```

## Running the Test Suite

### Unit Tests

Unit tests verify individual components in isolation using mocks for external dependencies.

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:unit -- --grep "BlockchainManager"
```

### Integration Tests

Integration tests verify that components work together correctly.

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test file
npm run test:integration -- --grep "Price Calculation"
```

### Smart Contract Tests

Smart contract tests verify that the Arbitrage contract works correctly.

```bash
# Run Hardhat tests for smart contracts
npm run test:contracts

# Run Forge tests (if Foundry is installed)
forge test
```

### Full Test Suite

Run the entire test suite:

```bash
npm test
```

## Test Structure

The test suite is organized into the following directories:

### Unit Tests (`test/unit/`)

- `blockchainManager.test.js` - Tests for blockchain connection management
- `db.test.js` - Tests for database operations
- `multiChainBot.test.js` - Tests for the arbitrage bot core functionality
- `helpers.test.js` - Tests for helper functions

### Integration Tests (`test/integration/`)

- `system.test.js` - Tests system components working together
- `smartContract.test.js` - Integration tests for smart contract interactions

### Smart Contract Tests

- `test/UniversalArbitrage.js` - Hardhat tests for the arbitrage contract
- `test/UniversalArbitrage.t.sol` - Forge tests for the arbitrage contract

## Mock Contracts

To facilitate testing, we've created the following mock contracts:

- `MockERC20.sol` - Mock token implementation
- `MockUniswapV2Router02.sol` - Mock DEX router with configurable swap rates
- `MockBalancerVault.sol` - Mock implementation of Balancer's flash loan provider

## Adding New Tests

When adding new functionality, follow these guidelines for test coverage:

1. **Unit Tests**: Write tests for individual functions and methods in isolation
2. **Integration Tests**: Verify that components work together correctly
3. **Contract Tests**: Test smart contract functionality including edge cases

## Code Coverage

To generate a code coverage report:

```bash
npm run coverage
```

The coverage report will be available in the `coverage/` directory.

## Continuous Integration

The test suite is integrated with GitHub Actions and runs automatically on pull requests and pushes to the main branch. The CI pipeline includes:

1. Running unit tests
2. Running integration tests
3. Running smart contract tests
4. Generating a coverage report

## Troubleshooting Common Issues

### Database Connection Errors

If you encounter database errors during testing:

```bash
rm -rf ./data/test.db
npm run test:setup-db
```

### Hardhat Network Issues

If you encounter issues with the Hardhat network:

```bash
npx hardhat clean
npx hardhat compile
```

### Mock Contract Compilation Issues

If you encounter issues with mock contract compilation:

```bash
npx hardhat compile --force
```

## Contact

If you encounter any issues with the test suite, please create an issue on the GitHub repository.
