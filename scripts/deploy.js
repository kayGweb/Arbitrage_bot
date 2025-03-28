// scripts/deployArbitrage.js
require('dotenv').config();
const hre = require("hardhat");
const db = require('../db');

async function main() {
  // Initialize database
  await db.initialize();
  
  // Get blockchain information from command-line arguments
  const blockchainId = process.env.BLOCKCHAIN_ID || process.argv[2];
  if (!blockchainId) {
    console.error('Please provide a blockchain ID');
    process.exit(1);
  }
  
  const blockchain = await db.getBlockchainById(blockchainId);
  if (!blockchain) {
    console.error(`Blockchain with ID ${blockchainId} not found in database`);
    process.exit(1);
  }
  
  console.log(`Deploying Universal Arbitrage contract to ${blockchain.name} (Chain ID: ${blockchain.chain_id})`);
  
  // Get flash loan provider address (Balancer Vault)
  const flashLoanProviderAddress = process.env.FLASH_LOAN_PROVIDER_ADDRESS || 
    await db.db.get(`
      SELECT flash_loan_provider_address 
      FROM arbitrage_contracts 
      WHERE blockchain_id = ? AND is_active = 1 
      LIMIT 1
    `, blockchainId);
    
  if (!flashLoanProviderAddress) {
    console.error(`No flash loan provider address found for blockchain ID ${blockchainId}`);
    console.error('Please set FLASH_LOAN_PROVIDER_ADDRESS environment variable or add it to the database');
    process.exit(1);
  }
  
  // Deploy the contract
  const UniversalArbitrage = await hre.ethers.getContractFactory("UniversalArbitrage");
  const arbitrage = await UniversalArbitrage.deploy(
    typeof flashLoanProviderAddress === 'string' 
      ? flashLoanProviderAddress 
      : flashLoanProviderAddress.flash_loan_provider_address
  );

  await arbitrage.waitForDeployment();
  
  const contractAddress = await arbitrage.getAddress();
  
  console.log(`Universal Arbitrage contract deployed to ${contractAddress}`);
  
  // Save to database
  const existingContract = await db.db.get(
    'SELECT * FROM arbitrage_contracts WHERE blockchain_id = ? AND flash_loan_provider = "Balancer" AND is_active = 1',
    blockchainId
  );
  
  if (existingContract) {
    // Update existing contract
    await db.db.run(
      'UPDATE arbitrage_contracts SET address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [contractAddress, existingContract.id]
    );
    console.log(`Updated existing arbitrage contract in database (ID: ${existingContract.id})`);
  } else {
    // Insert new contract
    const result = await db.db.run(
      `INSERT INTO arbitrage_contracts 
        (blockchain_id, address, flash_loan_provider, flash_loan_provider_address, is_active) 
       VALUES (?, ?, ?, ?, 1)`,
      [
        blockchainId, 
        contractAddress, 
        'Balancer', 
        typeof flashLoanProviderAddress === 'string' 
          ? flashLoanProviderAddress 
          : flashLoanProviderAddress.flash_loan_provider_address
      ]
    );
    console.log(`Added new arbitrage contract to database (ID: ${result.lastID})`);
  }
  
  // Add common DEXes for testing if not already present
  if (blockchain.chain_id === 1) { // Ethereum
    await addDEXIfNotExists(blockchainId, 'Uniswap', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');
    await addDEXIfNotExists(blockchainId, 'Sushiswap', '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac');
  } else if (blockchain.chain_id === 137) { // Polygon
    await addDEXIfNotExists(blockchainId, 'QuickSwap', '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32');
    await addDEXIfNotExists(blockchainId, 'SushiSwap', '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', '0xc35DADB65012eC5796536bD9864eD8773aBc74C4');
  } else if (blockchain.chain_id === 8453) { // Base
    await addDEXIfNotExists(blockchainId, 'BaseSwap', '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB');
    await addDEXIfNotExists(blockchainId, 'Aerodrome', '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', '0x420DD381b31aEf6683db6B902084cB0FFECe40Da');
  }
  
  // Register DEXes with the arbitrage contract
  const arbitrageWithSigner = arbitrage.connect(await ethers.getSigner());
  
  const dexes = await db.getDexes(blockchainId, true);
  for (const dex of dexes) {
    try {
      const tx = await arbitrageWithSigner.addRouter(dex.router_address, dex.name);
      await tx.wait();
      console.log(`Authorized ${dex.name} router in arbitrage contract`);
    } catch (error) {
      console.error(`Error authorizing ${dex.name} router:`, error.message);
    }
  }
  
  console.log('Deployment completed successfully');
}

// Helper function to add DEX if it doesn't exist
async function addDEXIfNotExists(blockchainId, name, routerAddress, factoryAddress) {
  const existingDex = await db.db.get(
    'SELECT * FROM dexes WHERE blockchain_id = ? AND router_address = ?',
    [blockchainId, routerAddress]
  );
  
  if (!existingDex) {
    const result = await db.db.run(
      'INSERT INTO dexes (blockchain_id, name, router_address, factory_address, is_active) VALUES (?, ?, ?, ?, 1)',
      [blockchainId, name, routerAddress, factoryAddress]
    );
    console.log(`Added ${name} DEX to database (ID: ${result.lastID})`);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
