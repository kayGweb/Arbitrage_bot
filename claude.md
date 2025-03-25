A comprehensive arbitrage trading system for monitoring and executing profitable trades between decentralized exchanges (DEXs) across multiple EVM-compatible blockchains.

multi-chain-dex-arbitrage/
├── .env # Environment variables
├── .env.example # Example env file with placeholders
├── .gitignore # Git ignore file
├── package.json # Main package.json
├── README.md # Project overview
├── server.js # Main server file
├── multiChainBot.js # Main bot logic
├── hardhat.config.js # Hardhat configuration
│
├── config/ # Configuration files
│ ├── README.md # Explains configuration structure
│ └── default.json # Default configuration values
│
├── contracts/ # Smart contracts
│ ├── README.md # Explains contract architecture
│ ├── Arbitrage.sol # Original arbitrage contract
│ └── UniversalArbitrage.sol # New multi-chain contract
│
├── database/ # Database related files
│ ├── README.md # Explains database architecture
│ ├── schema.sql # SQLite schema
│ ├── migrations/ # Database migrations
│ └── db.js # Database interface
│
├── scripts/ # Deployment & utility scripts
│ ├── README.md # Scripts documentation
│ ├── deploy.js # Original deployment script
│ ├── deployArbitrage.js # Multi-chain deployment
│ ├── manipulate.js # Test price manipulation
│ └── setupDatabase.js # Initialize database
│
├── helpers/ # Helper functions
│ ├── README.md # Helpers documentation
│ ├── helpers.js # Original helpers
│ ├── initialization.js # Contract initialization
│ ├── blockchainManager.js # Multi-chain connection manager
│ └── server.js # Original server helper
│
├── api/ # API endpoints
│ ├── README.md # API documentation
│ ├── index.js # Main API router
│ ├── blockchains.js # Blockchain routes
│ ├── dexes.js # DEX routes
│ ├── tokens.js # Token routes
│ └── monitoring.js # Bot control routes
│
├── frontend/ # Next.js frontend
│ ├── README.md # Frontend documentation
│ ├── package.json # Frontend dependencies
│ ├── next.config.js # Next.js config
│ ├── src/ # Source files
│ │ ├── app/ # Next.js app router
│ │ ├── components/ # React components
│ │ └── lib/ # Frontend utilities
│ └── public/ # Static assets
│
├── logs/ # Application logs
│ └── README.md # Logging documentation
│
├── tests/ # Test files
│ ├── README.md # Testing documentation
│ └── Arbitrage.js # Contract tests
│
└── data/ # Data directory for SQLite
└── README.md # Data storage documentation
