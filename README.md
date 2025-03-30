# Multi-Chain DEX Arbitrage Bot

A comprehensive arbitrage trading system for monitoring and executing profitable trades between decentralized exchanges (DEXs) across multiple EVM-compatible blockchains.

## Features

- **Multi-Chain Support**: Monitor and execute trades on multiple EVM-compatible blockchains (Ethereum, Polygon, Base, PulseChain, and more)
- **Multiple DEX Support**: Configure and monitor any Uniswap V2-compatible DEX
- **Database-Backed**: Persistent SQLite database for configurations and trade history
- **Interactive UI**: React/Next.js web interface for monitoring and configuration
- **Real-Time Updates**: WebSocket-based real-time price updates and opportunity notifications
- **Smart Contract Integration**: Universal arbitrage smart contract with flash loan capabilities
- **Automated Trading**: Optional automatic execution of profitable arbitrage opportunities
- **Comprehensive Monitoring**: Track price differences, trade history, and profits

## System Requirements

- Node.js 16+
- SQLite
- Ethereum wallet/private key for transaction signing
- API access to blockchain node providers (Alchemy, Infura, etc.)

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/multi-chain-dex-arbitrage.git
cd multi-chain-dex-arbitrage
```

2. **Install dependencies**

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

3. **Create configuration files**

```bash
# Copy example environment file
cp .env.example .env

# Update .env with your settings
# - API keys for blockchain providers
# - Private key for transaction signing
# - Other configuration parameters
```

4. **Initialize the database**

```bash
# The database will be created automatically on first run
# Schema is defined in schema.sql
```

## Frontend Setup

The project uses Next.js with Shadcn UI components. Follow these steps to set up the frontend:

1. **Navigate to the frontend directory**

```bash
cd frontend
```

2. **Install Tailwind CSS (if not already installed)**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **Initialize Shadcn UI**

```bash
npx shadcn@latest init
```

When prompted during initialization:
- For styling, select "Default"
- For CSS variables, choose "Yes"
- For global CSS path, use `src/app/globals.css`
- For component location, choose `@/components`
- For utilities location, use `@/lib/utils`
- Select a color theme of your choice

4. **Install required UI components**

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add switch
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add tabs
```

5. **Configure path aliases**

Ensure your `jsconfig.json` or `tsconfig.json` has the proper path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

6. **Update Tailwind config**

Make sure your `tailwind.config.js` includes all the necessary paths:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Running the Application

### Development Mode

```bash
# Start the backend server (API + bot)
npm run dev

# In a separate terminal, start the frontend
cd frontend
npm run dev
```

### Production Mode

```bash
# Build the frontend
cd frontend
npm run build
cd ..

# Start the server
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- API: `http://localhost:5000/api`

## Configuration

### Environment Variables

Edit the `.env` file to configure:

- API keys for blockchain providers
- Private key for transaction signing
- Server ports and settings
- Default bot parameters

### Database Structure

The SQLite database contains tables for:

- Blockchains
- DEXes
- Tokens
- Token pairs
- Arbitrage contracts
- Trading history
- Configuration settings

## Bot Operation

### Setting Up

1. Use the UI to add blockchains, DEXes, and tokens to monitor
2. Create token pairs for arbitrage monitoring
3. Deploy arbitrage contracts to desired blockchains
4. Configure your trading parameters (min profit threshold, gas settings)

### Monitoring Mode

In monitoring mode, the bot:
1. Listens for swap events on configured DEXes
2. Calculates prices across DEXes when a swap occurs
3. Identifies arbitrage opportunities
4. Logs potential profitable trades
5. Executes trades if automatic execution is enabled

### Trading Strategy

The bot implements a flash loan arbitrage strategy:
1. Borrow tokens via flash loan
2. Buy tokens on the DEX with lower price
3. Sell tokens on the DEX with higher price
4. Repay flash loan
5. Keep the profit

## Smart Contract Deployment

The `UniversalArbitrage.sol` contract needs to be deployed to each blockchain you wish to trade on.

1. Update Balancer Vault address for the target chain
2. Deploy using your preferred method (Hardhat, Truffle, Remix)
3. Add the deployed contract address to the database

```bash
# Example deployment using Hardhat
npx hardhat run scripts/deploy.js --network ethereum
```

## Advanced Usage

### Adding New Blockchains

1. Add the blockchain to the database with RPC/WebSocket endpoints
2. Ensure a compatible flash loan provider exists on the chain
3. Deploy the arbitrage contract
4. Add DEXes and tokens to monitor

### Custom Strategies

You can modify the `checkProfitability` function in `multiChainBot.js` to implement custom profitability calculations and trading strategies.

## Troubleshooting

### Common Issues

- **RPC Errors**: Verify your API keys and RPC endpoints
- **Insufficient Funds**: Ensure your wallet has funds for gas
- **No Arbitrage Opportunities**: Check minimum price difference settings
- **Transaction Failures**: Monitor gas settings and blockchain conditions

### Frontend Build Issues

If you encounter errors about missing UI components:
1. Make sure you've installed all the required Shadcn UI components listed above
2. Check that your path aliases are correctly set up in tsconfig.json/jsconfig.json
3. Ensure your directory structure matches the expected paths
4. Restart your development server after making changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is for educational purposes only. Trading cryptocurrency carries significant risk. Use at your own discretion and always perform due diligence.
