# Prediction Market Demo

A simplified decentralized prediction market platform built on N42 blockchain, inspired by [Polymarket](https://polymarket.com/).

## Features

- **Binary Prediction Markets**: Create markets for yes/no questions
- **Automated Market Maker (AMM)**: Uses Constant Product Market Maker (CPMM) for automatic pricing
- **Test Token**: Built-in faucet system for testing
- **Fair Resolution**: Market creators can resolve outcomes after market end time
- **Transparent**: All transactions on-chain and verifiable

## Architecture

### Smart Contracts

1. **PredictionToken.sol**
   - ERC20 token for trading (PRED)
   - Built-in faucet: claim 100 PRED every 24 hours
   - Used as trading currency across all markets

2. **PredictionMarket.sol**
   - Binary market implementation (Yes/No)
   - CPMM pricing mechanism
   - 0.5% trading fee
   - Time-locked resolution
   - ReentrancyGuard protection

3. **MarketFactory.sol**
   - Centralized market creation
   - Market registry and discovery
   - Enforces minimum parameters

### Pricing Mechanism

The system uses a **Constant Product Market Maker (CPMM)** formula:

```
x * y = k (constant product)

Yes Price = noPool / (yesPool + noPool)
No Price = yesPool / (yesPool + noPool)

Yes Price + No Price = 1 (100% probability)
```

**Example:**
- Initial state: yesPool = 1000, noPool = 1000
- Yes Price = 1000 / 2000 = 0.5 (50%)
- No Price = 1000 / 2000 = 0.5 (50%)

When users buy Yes shares:
- yesPool decreases, noPool increases
- Yes Price increases (more demand = higher price)
- Prices automatically adjust to reflect market sentiment

## Setup

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

```bash
npm install
```

### Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your private key to `.env`:
```env
PRIVATE_KEY=your_private_key_here
```

⚠️ **Warning**: Never commit your `.env` file or expose your private key!

### Get Test Tokens

1. Get N tokens from the N42 faucet: https://n42.ai/faucet
2. After deployment, claim PRED tokens using the contract's faucet

## Usage

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

All tests should pass:
```
  20 passing (574ms)
```

### Deploy to N42 Test Network

1. Make sure you have N tokens in your wallet
2. Deploy contracts:
```bash
npm run deploy
```

This will:
- Deploy PredictionToken
- Deploy MarketFactory
- Create a sample market
- Save addresses to `deployment.json`

### Create a New Market

```bash
npm run create-market
```

Or with custom parameters:
```bash
npm run create-market "Will BTC hit $100k?" 30 1000
# Question, Duration (days), Initial Liquidity (PRED)
```

### Query All Markets

```bash
npm run query-markets
```

To see your position in markets:
```bash
npm run query-markets YOUR_ADDRESS
```

## Contract Interaction Examples

### Using Hardhat Console

```bash
npx hardhat console --network n42
```

```javascript
// Load deployment
const deployment = require('./deployment.json');

// Get contracts
const Token = await ethers.getContractFactory("PredictionToken");
const token = Token.attach(deployment.token);

const Factory = await ethers.getContractFactory("MarketFactory");
const factory = Factory.attach(deployment.factory);

// Claim test tokens
await token.claimFromFaucet();
await token.balanceOf((await ethers.getSigners())[0].address);

// Get all markets
const markets = await factory.getAllMarkets();
const Market = await ethers.getContractFactory("PredictionMarket");
const market = Market.attach(markets[0]);

// Check market info
const info = await market.getMarketInfo();
console.log("Question:", info._question);
console.log("Yes Price:", ethers.formatEther(info._yesPrice));

// Buy Yes shares
await token.approve(markets[0], ethers.parseEther("100"));
await market.buyShares(ethers.parseEther("100"), true, 0);

// Check your position
const position = await market.getUserPosition((await ethers.getSigners())[0].address);
console.log("Your Yes shares:", ethers.formatEther(position._yesShares));
```

## Development Workflow

1. **Write contracts** in `contracts/`
2. **Write tests** in `test/`
3. **Run tests**: `npm test`
4. **Deploy locally**: `npm run deploy:local`
5. **Deploy to N42**: `npm run deploy`

## N42 Network Information

- **Network Name**: N42 Test Network
- **RPC URL**: https://testrpc.n42.world
- **Chain ID**: 1142
- **Currency Symbol**: N
- **Block Explorer**: https://testnet.n42.world/
- **Faucet**: https://n42.ai/faucet

### Add to MetaMask

1. Open MetaMask
2. Click network dropdown → Add Network
3. Enter the network information above
4. Save

## Security Considerations

### Implemented Protections

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Pausable for emergency stops
- ✅ Time-lock on market resolution
- ✅ Slippage protection on trades
- ✅ Input validation on all functions
- ✅ Overflow protection (Solidity 0.8+)

### Known Limitations

- Creator has full control over outcome resolution (centralized)
- No dispute resolution mechanism
- Front-running possible (no commit-reveal scheme)
- Limited to binary outcomes

### For Production Use

Consider adding:
- Multi-sig resolution or oracle integration
- Dispute resolution period
- MEV protection
- Gradual decentralization of governance

## Project Structure

```
PredictionMarketDemo/
├── contracts/
│   ├── PredictionToken.sol      # ERC20 test token with faucet
│   ├── PredictionMarket.sol     # Core market logic
│   └── MarketFactory.sol        # Market creation & registry
├── test/
│   └── PredictionMarket.test.js # Comprehensive test suite
├── scripts/
│   ├── deploy.js                # Main deployment script
│   ├── createMarket.js          # Create new market
│   └── queryMarkets.js          # Query market data
├── hardhat.config.js            # Hardhat configuration
├── package.json                 # Dependencies & scripts
├── .env.example                 # Environment template
└── README.md                    # This file
```

## Testing

The project includes comprehensive tests covering:

- ✅ Token functionality (mint, faucet, transfers)
- ✅ Factory functionality (creation, validation)
- ✅ Market creation and initialization
- ✅ Price calculations (CPMM)
- ✅ Trading (buy/sell shares)
- ✅ Market resolution
- ✅ Winnings claims
- ✅ Edge cases and error handling
- ✅ Full market lifecycle

Run tests with:
```bash
npm test
```

## Gas Optimization

Current optimizations:
- Use of `immutable` for constant addresses
- Efficient storage packing
- Minimal external calls
- Batch operations where possible

## Roadmap

### Phase 1: MVP (Current)
- ✅ Basic binary markets
- ✅ CPMM pricing
- ✅ Test token
- ✅ N42 deployment

### Phase 2: Enhancement
- ⬜ Frontend dApp (React)
- ⬜ Market categories
- ⬜ Historical price charts
- ⬜ User profiles & stats

### Phase 3: Advanced Features
- ⬜ Oracle integration (Chainlink)
- ⬜ Multi-outcome markets
- ⬜ Liquidity mining
- ⬜ Governance token

## Contributing

This is a demo project for learning purposes. Feel free to fork and experiment!

## License

ISC License - See LICENSE file for details

## Resources

- [Polymarket Documentation](https://docs.polymarket.com/)
- [N42 Network](https://n42.ai/)
- [Hardhat Documentation](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## Support

For issues or questions:
- Open an issue on GitHub
- Check N42 Discord community

---

Built with ❤️ on N42 Blockchain
