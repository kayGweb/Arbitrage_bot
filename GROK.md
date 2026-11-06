# GROK.md

Guide for a future assistant working in this repo. It describes the code as it is on `main` (last commit `8718ad0`, 2025-04-03). Prefer this file and the source over `README.md`, `AI.md`, `PROJECT_STRUCTURE.txt`, and the `DIRECTORY_CONTEXT.md` files. Those documents describe files, WebSocket servers, and npm scripts that are not in the tree.

## 1. Purpose

This is a JavaScript/Solidity project for **same-chain DEX arbitrage** on EVM networks. It looks for a price gap on one token pair between two Uniswap V2-style pools, then (if execution is turned on) tries to capture that gap with a Balancer flash loan: borrow the quote token, buy on the cheaper pool, sell on the more expensive pool, repay the loan, and keep the difference.

It started as a DApp University-style bot for **Ethereum Uniswap V2 vs Sushiswap** and was expanded toward a multi-chain bot with a SQLite config store, an Express API, and a Next.js dashboard. The expansion is only partly wired up. Nothing here monitors prices across different chains in one trade. Each opportunity is two DEXes on the **same** chain.

## 2. How it works

There are two bots. They do not share a runtime.

### Original bot (`bot.js`)

1. `helpers/initialization.js` opens a WebSocket provider. `config.json` has `PROJECT_SETTINGS.isLocal: true`, so the provider is `ws://127.0.0.1:8545`. If `isLocal` is false, it uses Ethereum mainnet via Alchemy.
2. It loads the Uniswap V2 and Sushiswap router/factory addresses from `config.json`, plus an `Arbitrage` contract at `PROJECT_SETTINGS.ARBITRAGE_ADDRESS`.
3. It resolves the pair for `ARB_FOR` / `ARB_AGAINST` on both factories and subscribes to each pair’s `Swap` event.
4. On a swap it computes `reserve0 / reserve1` on both pairs (`helpers/helpers.js` `calculatePrice`). If the percent gap is at least `PRICE_DIFFERENCE`, it picks a direction (buy on the cheaper venue, sell on the other).
5. Profitability uses `getAmountsIn` / `getAmountsOut` and `simulate`, then compares the result to `GAS_LIMIT * GAS_PRICE`. It assumes 18-decimal WETH-style accounting.
6. If `PROJECT_SETTINGS.isDeployed` is true (it is), `executeTrade` sends `Arbitrage.executeTrade(startOnUniswap, token0, token1, amount)` from `PRIVATE_KEY`. The contract flash-loans `token0` from the Ethereum Balancer V2 Vault hardcoded in `contracts/Arbitrage.sol` (`0xBA12222222228d8Ba445958a75a0704d566BF2C8`), swaps Uniswap then Sushiswap or the reverse, repays the principal, and sends the leftover `token0` to `owner`.

`bot.js` calls `main()` on load. It also `require`s `./helpers/server`, which **does not exist**, so `node bot.js` fails before any of the above.

### Multi-chain bot (`multiChainBot.js`)

1. `database/db.js` opens `database/arbitrage.db`.
2. `helpers/blockchainManager.js` builds an ethers v6 provider per active `blockchains` row (WebSocket if `ws_url` is set, otherwise JSON-RPC). `${ENV_VAR}` placeholders in those URLs are replaced from `process.env`.
3. `startMonitoring` loads active `token_pairs`. A pair is skipped unless that chain has at least two active `dexes`. For each DEX it calls `factory.getPair` and listens for `Swap`.
4. On a swap, `checkPrices` stores each pool’s `reserve0/reserve1` in `price_logs`. `findArbitrageOpportunity` treats the lowest ratio as the buy venue and the highest as the sell venue, and drops the idea if the gap is at or below that pair’s `min_price_difference` (schema default 0.5).
5. `checkProfitability` sizes the trade at about 1% of the smaller `reserve0`, quotes it through the two V2 routers, subtracts `default_gas_limit * gasPrice`, and treats token0 as 1:1 with the chain’s native token. It passes only if net profit percent is above `bot_configs.min_profit_threshold` (schema default `0.1`). `initialize` also loads `gas_limit_multiplier` (default 1.1) and never uses it. The chain column `gas_multiplier` and `default_slippage` are stored and not used.
6. If `bot_configs.execution_enabled` is not the string `true`, the opportunity is kept in memory (`getOpportunities`, capped at 100) and no transaction is sent.
7. If execution is on, `executeTrade` loads the first active `arbitrage_contracts` row and calls **`Arbitrage.executeTrade(bool, address, address, uint256)`** using `artifacts/contracts/Arbitrage.sol/Arbitrage.json`. The bool is `buyDex.id === 1`, not the router that was actually cheaper. That ABI is the two-DEX Ethereum contract, not `UniversalArbitrage`.

`node multiChainBot.js` (`npm run start:bot`) initializes and monitors until SIGINT. `server.js` does **not** start the bot. The API can call `startMonitoring`, `stop`, and `setExecutionEnabled` only if requiring `multiChainBot.js` succeeds. That require loads the Hardhat artifact above; `artifacts/` is gitignored and not present, so the API catches the error and uses a mock bot that only logs.

### Contracts

| Contract | Role |
|---|---|
| `contracts/Arbitrage.sol` | Fixed Uniswap and Sushiswap routers. Flash-loans from the Ethereum Balancer Vault. `executeTrade(bool _startOnUniswap, address _token0, address _token1, uint256 _flashAmount)` is public (no `onlyOwner`). Swaps use `amountOutMin = 0` and a 1200-second deadline. Repays `flashAmount` only (`feeAmounts` is ignored). |
| `contracts/universal-arbitrage.sol` | `UniversalArbitrage`. Vault address is a constructor argument. Owner can `addRouter` / `removeRouter` / `updateVaultAddress`. `executeTrade(buyRouter, sellRouter, token0, token1, flashAmount)` is `onlyOwner`. Same zero-slippage swap and principal-only repay. Deadline is 5 minutes. `recoverToken` sends any ERC-20 balance to the owner. |
| `contracts/interfaces/IFlashLoan.sol` | Local `IVault` / `IFlashLoanRecipient` used by `Arbitrage.sol`. `UniversalArbitrage` imports Balancer’s npm interfaces instead. `Arbitrage.sol` references `IERC20` but does not import it in this file. |
| `contracts/test/MockERC20.sol`, `MockUniswapV2Router02.sol`, `MockBalancerVault.sol` | Test doubles. The mock vault charges a 0 fee. |

`scripts/deploy.js` is the universal-contract deployer (file comment still says `deployArbitrage.js`). `scripts/old_deploy.js` deploys `Arbitrage` with the Sushiswap and Uniswap routers from `config.json`. `scripts/old_manipulate.js` is a Hardhat-fork helper that impersonates a hardcoded SHIB holder and swaps on Uniswap to move the price. It is not part of the live bot.

Seed intent in `database/schema.sql` (applied only when the SQLite file has **zero** tables): Ethereum, Polygon, Base, and PulseChain rows; Ethereum Uniswap V2 and Sushiswap; WETH/USDC/USDT/SHIB on Ethereum and WMATIC/USDC/USDT on Polygon; a placeholder arbitrage row whose contract address is `0x000…000` and whose flash-loan provider is Balancer’s Ethereum vault. No `token_pairs` rows are seeded, so a fresh schema starts with nothing to monitor. `scripts/deploy.js` also knows QuickSwap and SushiSwap addresses for Polygon chain id 137, and BaseSwap and Aerodrome for Base chain id 8453. Those rows are not in the schema seed, and that script does not run successfully (see Current state).

## 3. Architecture

```
bot.js                         original Uniswap/Sushiswap listener (broken require)
multiChainBot.js               multi-DEX listener, quotes, optional execution
server.js                      Express API; dev proxy to Next.js :3000
config.json                    original bot: local flag, contract, Uni/Sushi addresses
hardhat.config.js              Solidity 0.8.18; Hardhat fork + localhost
env.example                    env template (name is not .env.example)

api/api-routes.js              REST routes; mock bot if multiChainBot fails to load
database/db.js                 sqlite singleton, path database/arbitrage.db
database/schema.sql            schema the app applies to an empty database
database/database-schema.sql   shorter schema duplicate; not read by db.js
database/arbitrage.db          committed file; legacy empty tables, not schema.sql

helpers/helpers.js             pairs, reserves, price, simulate
helpers/initialization.js      original bot providers and contract instances
helpers/blockchainManager.js   providers, V2 routers/factories, pair listeners
helpers/blockchain-management.js   unused copy of the React blockchains page

contracts/                     Arbitrage, UniversalArbitrage, interface, mocks
scripts/deploy.js              intended UniversalArbitrage deploy (broken)
scripts/old_deploy.js          original Arbitrage deploy
scripts/old_manipulate.js      fork price-move script

frontend/                      Next.js 14 app router + Tailwind + Radix UI
  src/app/page.js              dashboard (polls /api/dashboard every 30s)
  src/app/blockchains|dexes|tokens|token-pairs|transactions/page.js
  src/app/layout.js and layout.tsx    both exist
  src/components/              Sidebar, Header (execution toggle), stats, charts
  src/lib/api.ts               fetch client and socket.io-client subscriptions
  src/lib/utils.ts             cn() and a second price-history fetch

test/Arbitrage.js              deploy-only checks; Trading block is empty
test/UniversalArbitrage.js     mock-vault unit tests
test/unit/blockchainManager.test.js
test/integration/system.test.js
config/LOG4JS_CONFIG           unused log4js JSON (log4js is not a dependency)
logs/                          empty log dir plus a DIRECTORY_CONTEXT note
```

`wallets` exists in `schema.sql` and in `db.exportData`, with no insert/update API. `winston`, `morgan`, and `socket.io` are backend dependencies and are not required by `server.js`. The frontend depends on `socket.io-client`, Chakra, and axios; the pages use fetch plus Radix/Tailwind, not Chakra or axios.

### API that exists

Implemented in `api/api-routes.js`:

- `GET /api/dashboard`
- `GET|POST /api/blockchains`, `PUT /api/blockchains/:id`, `PATCH /api/blockchains/:id/toggle`
- `GET|POST /api/dexes`, `PUT /api/dexes/:id`, `PATCH /api/dexes/:id/toggle`
- `GET|POST /api/tokens`
- `GET|POST /api/token-pairs`
- `POST /api/bot/start`, `POST /api/bot/stop`, `POST /api/bot/execution`
- `GET /api/transactions`
- `GET|PUT /api/config/:name`

`frontend/src/lib/api.ts` also calls routes that are **not** implemented: `GET /blockchains/:id`, `GET /dexes/:id`, `GET|PUT /tokens/:id`, `PATCH /tokens/:id/toggle`, `GET /tokens/lookup`, `GET|PUT /token-pairs/:id`, `PATCH /token-pairs/:id/toggle`, `GET /price-history/:pairId`. Sidebar links to `/settings`, and there is no `frontend/src/app/settings` page.

`POST /api/dexes` and `POST /api/token-pairs` insert a row and then call `arbitrageBot.addDex` / `addTokenPair`, which insert **again**.

## 4. Runtime / setup

README says **Node.js 16+**. `package.json` has no `engines` field. Tooling is **Hardhat** (`hardhat` 2.19.x, toolbox). There is no Truffle or Foundry config.

```bash
npm install
cd frontend && npm install && cd ..
cp env.example .env          # README says .env.example; the file is env.example
npm run dev                  # nodemon server.js
# other terminal:
cd frontend && npm run dev   # next dev, port 3000
npm run start:bot            # node multiChainBot.js
npm test                     # hardhat test
npx hardhat run scripts/old_deploy.js --network localhost
```

`npm run setup:db` points at `scripts/setupDatabase.js` (missing). `npm run deploy:contract` points at `scripts/deployArbitrage.js` (missing). The deployer that exists is `scripts/deploy.js`, and Hardhat has no `ethereum` network. README’s `npx hardhat run scripts/deploy.js --network ethereum` does not match `hardhat.config.js`.

Networks in `hardhat.config.js`:

- `hardhat`: forks `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
- `localhost`: `http://127.0.0.1:8545`, chain id 31337

`server.js` listens on `PORT` or **4000**. `env.example` sets `PORT=5000`. The frontend defaults to `http://localhost:5000/api`. In non-production, Express serves `/api` itself and proxies every other path to `http://localhost:3000`. Production mode serves `frontend/out`, but `frontend/next.config.js` does not set `output: 'export'`, so `next build` does not produce that folder. `npm start` is `node server.js` and does not start Next or the bot.

### Secret and env names

Copy `env.example` to `.env`. Do not commit `.env`. Names only:

| Name | Who reads it |
|---|---|
| `PORT` | `server.js` (default 4000 if unset) |
| `NODE_ENV` | `server.js` (`production` switches static serving) |
| `DB_PATH` | listed in `env.example` only; `db.js` ignores it |
| `ALCHEMY_API_KEY` | Hardhat fork URL; original bot when `isLocal` is false; `${ALCHEMY_API_KEY}` inside seeded RPC/WS URLs |
| `INFURA_API_KEY` | `env.example` only; no code reference |
| `PRIVATE_KEY` | `bot.js` and `multiChainBot.executeTrade` |
| `MIN_PROFIT_THRESHOLD`, `DEFAULT_GAS_LIMIT`, `GAS_PRICE_MULTIPLIER`, `AUTO_START_MONITORING`, `EXECUTION_ENABLED` | `env.example` only. The multi-chain bot reads `min_profit_threshold`, `default_gas_limit`, and `execution_enabled` from `bot_configs`, not from the environment. Nothing reads `AUTO_START_MONITORING` at startup. |
| `LOG_LEVEL`, `LOG_TO_FILE`, `LOG_FILE_PATH` | `env.example` only |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL` | `frontend/src/lib/api.ts` and `utils.ts` |
| `ARB_FOR`, `ARB_AGAINST`, `UNITS`, `PRICE_DIFFERENCE`, `GAS_LIMIT`, `GAS_PRICE` | `bot.js` (and the old manipulate script for the two token addresses). Not in `env.example`. |
| `BLOCKCHAIN_ID`, `FLASH_LOAN_PROVIDER_ADDRESS` | `scripts/deploy.js` |

`blockchainManager._replaceEnvVars` will substitute any `${NAME}` stored in a chain’s `rpc_url` or `ws_url`.

Database file on disk is `database/arbitrage.db`. It currently has empty legacy tables `DEXAddress`, `Coinslist`, `ArbResults`, and `AppSettings`. `initialize()` runs `schema.sql` only when `sqlite_master` has no tables, so this file never receives the new schema.

## 5. Important behaviors and risks

- **Flash loans.** Both contracts borrow from Balancer and must repay inside `receiveFlashLoan`. They transfer `flashAmount` and ignore `feeAmounts`. The mock vault uses a 0 fee. A non-zero fee reverts the callback. `Arbitrage` uses one Ethereum vault address; other chains need `UniversalArbitrage` deployed with that chain’s vault. The bot never calls `UniversalArbitrage`.
- **Anyone can call `Arbitrage.executeTrade`.** Profit is sent to `owner`, but a caller chooses the token pair, direction, and size. `UniversalArbitrage.executeTrade` is `onlyOwner`.
- **Slippage is zero.** Both swaps pass `amountOutMin = 0`. `default_slippage` is unused. A sandwich or a stale quote can fill at a loss. Loss on the 0.8 contracts reverts because `profit` would underflow, which still spends gas.
- **MEV.** Transactions are sent through the normal provider/mempool. There is no private relay, bundle, or backrun protection. The original deadline is `block.timestamp + 1200`; the universal contract uses `+ 300`.
- **Gas.** The original bot multiplies env `GAS_LIMIT` by `GAS_PRICE` as if both were ether-scale numbers. The multi-chain bot uses `gasPrice` from `getFeeData` and a fixed gas limit (default 400000). It does not use EIP-1559 fields or the chain’s `gas_multiplier`. Quoted profit assumes token0 is worth one native token. USDC/USDT in the schema seed have 6 decimals, but quotes are formatted with `formatUnits(..., 'ether')` and prices ignore decimals.
- **Trade size.** The original bot targets half of the smaller `reserve0`. The multi-chain bot targets 1% of that reserve. Either can be large relative to the pool. `getPair` ordering is by token address, while swap paths use the database’s token0/token1 order. If those orders differ, the “cheap venue” and the swap path can point different ways.
- **Execution flag.** `config.json` `isDeployed: true` makes the original bot send a transaction when it thinks a trade is profitable. Multi-chain execution defaults to off only after `schema.sql` is applied. Turning on the header toggle calls `POST /api/bot/execution`, which sets `execution_enabled` and will submit mainnet transactions if a real key, a funded wallet, a live RPC, and a real contract row are present.
- **Mainnet vs local.** Seed URLs and `config.json` DEX addresses are mainnet (Ethereum, Polygon, Base, PulseChain). Hardhat’s default network forks Ethereum mainnet and needs `ALCHEMY_API_KEY`. `isLocal: true` points the original bot at localhost, but `isDeployed: true` still broadcasts if that node accepts the tx. `old_manipulate.js` impersonates an account and is only safe on a fork. The committed `ARBITRAGE_ADDRESS` is a live-looking mainnet address; do not assume it is this repo’s deployed bytecode.
- **Keys.** `PRIVATE_KEY` pays gas and controls `UniversalArbitrage` if that wallet is owner. RPC URLs in the database can embed API keys. Do not print `.env` or commit it.
- **No auth on the API.** CORS is `origin: "*"`. Anyone who can reach the server can add chains, start monitoring, or enable execution.
- **SQLite.** One process, one file. `server.js` and `multiChainBot.js` as two processes will lock or diverge. Foreign keys are enabled. The legacy committed database blocks schema creation.

## 6. Current state

History, oldest first:

| Commit | Date | What landed |
|---|---|---|
| `ae2550d` | 2025-03-24 | Original `bot.js`, `Arbitrage.sol`, Hardhat, Uni/Sushi config |
| `5a819e1` | 2025-03-24 | `database/`, schema, `db.js` |
| `1941263` | 2025-03-27 | `multiChainBot.js`, blockchain manager, mocks, contract tests |
| `a8ff7e0` | 2025-03-29 | `test/unit`, `test/integration` |
| `79e3391` | 2025-03-30 | Tailwind, `tsconfig`, shadcn-style UI, `DIRECTORY_CONTEXT.md` |
| `a08e54a` | 2025-03-30 | `AI.md` |
| `8718ad0` | 2025-04-03 | Transactions page, `api.ts`, Header/Sidebar/charts, `layout.tsx`, server proxy. Also committed `frontend/.next` build output. |

**Usable as source, not as a running trader**

- Original monitoring and `Arbitrage.sol` are the complete DApp University-style path, aside from the missing `helpers/server` module and missing Hardhat artifacts.
- `UniversalArbitrage` plus `test/UniversalArbitrage.js` cover ownership, router allowlist, vault update, token recovery, and access checks. Tests do not assert a profitable two-hop flash loan.
- `test/Arbitrage.js` only checks router and owner after deploy. Its Trading suite is empty.
- Unit and integration tests stub ethers and the database. They do not hit a live chain. `hardhat.config.js` still sets a mainnet fork URL, so `npx hardhat test` is not offline.
- Express CRUD for chains, DEXes, tokens, pairs, history, and config is real.
- Next pages for dashboard, blockchains, DEXes, tokens, token pairs, and transactions exist and call the API. Dashboard data is polled, not pushed.

**Incomplete or inconsistent**

- `helpers/server.js`, `scripts/setupDatabase.js`, and `scripts/deployArbitrage.js` are missing. `scripts/deploy.js` requires `../db` (actual module is `database/db`), uses `ethers` without importing it, and updates an `updated_at` column that `arbitrage_contracts` does not have.
- `artifacts/` is absent, so `blockchainManager.js` and `helpers/initialization.js` fail at require time. The API then runs the mock bot.
- `server.js` never starts monitoring and never attaches Socket.IO. The client still connects and subscribes to `opportunity`, `trade`, `price`, and `bot:status`. Nothing emits those events. Header “Connected” is hardcoded.
- Multi-chain execution encodes the **old** `Arbitrage` call, with `buyDex.id === 1` as the Uniswap flag. It cannot pass buy/sell routers into `UniversalArbitrage`.
- `database/arbitrage.db` will not migrate itself to `schema.sql`.
- `layout.js` and `layout.tsx` are both under `frontend/src/app/`.
- `helpers/blockchain-management.js` is a stray React page, not a backend module.
- Frontend calls several REST routes the server does not implement, including token lookup and price history. `PriceChart.tsx` imports `fetchPriceHistory` from `utils.ts`, which calls the missing route and returns `[]` on failure.
- `bot_configs.auto_start_monitoring` and `monitor_interval` are unused. Logging config is unused.
- `AI.md` and `PROJECT_STRUCTURE.txt` still list `api/index.js`, `db.js` at the repo root, `UniversalArbitrage.sol`, `deployArbitrage.js`, and `manipulate.js`.

Do not treat README feature claims (live WebSocket prices, automatic multi-chain execution, one-command contract deploy) as current behavior.

## 7. Pointers

Start here:

1. `multiChainBot.js` — monitoring, quotes, execution gate.
2. `helpers/blockchainManager.js` — providers and `Swap` listeners.
3. `helpers/helpers.js` — reserve price and two-hop `simulate`.
4. `contracts/Arbitrage.sol` and `contracts/universal-arbitrage.sol` — what a transaction would actually do.
5. `database/schema.sql` and `database/db.js` — config model.
6. `api/api-routes.js` and `server.js` — HTTP surface.
7. `frontend/src/lib/api.ts` — what the UI expects.
8. `bot.js`, `config.json`, `helpers/initialization.js` — original single-pair bot.

Commands from root `package.json`:

| Script | Command |
|---|---|
| `npm run dev` | `nodemon server.js` |
| `npm start` | `node server.js` |
| `npm run start:bot` | `node multiChainBot.js` |
| `npm run dev:ui` | `cd frontend && npm run dev` |
| `npm run build:ui` | `cd frontend && npm run build` |
| `npm test` / `npm run Alltest` | `hardhat test` |
| `npm run test:unit` | `hardhat test test/unit/**/*.js` |
| `npm run test:integration` | `hardhat test test/integration/**/*.js` |
| `npm run test:contracts` | `hardhat test test/UniversalArbitrage.js` |
| `npm run coverage` | `hardhat coverage` |
| `npm run lint` | `eslint . --ext .js` (no ESLint config file in the repo) |
| `npm run format` | prettier write |
| `npm run setup:db` | missing script file |
| `npm run deploy:contract` | missing script file |

Frontend package scripts: `next dev`, `next build`, `next start`, `next lint`.

Original contract deploy, local node only: `npx hardhat run scripts/old_deploy.js --network localhost`.

Do not point `config.json` at mainnet or set `execution_enabled` while exploring. Fork tests and `old_manipulate.js` need an Alchemy key and talk to Ethereum mainnet state.
