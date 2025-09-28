# Weather API Payment Facilitator

This facilitator implements X402 payment gating for the weather API using EIP-3009 compliant tokens on Polygon Amoy testnet.

## Features

- **EIP-3009 Compliant**: Transfer with authorization functionality
- **Confidential Payments**: Uses Inco for encrypted payment amounts
- **Weather API Gating**: Weather API access requires payment verification
- **Polygon Amoy**: Deployed on Polygon Amoy testnet
- **X402 Protocol**: Standardized payment protocol implementation

## Architecture

```
Frontend → Backend API → Payment Facilitator → Weather API
                ↓
         EIP-3009 Token Contract (Polygon Amoy)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Update the following variables:
- `PRIVATE_KEY`: Your wallet private key for deployment
- `POLYGONSCAN_API_KEY`: Your PolygonScan API key
- `WEATHER_TOKEN_ADDRESS`: Contract address after deployment

### 3. Deploy Contract

```bash
# Compile contracts
npx hardhat compile

# Deploy to Polygon Amoy
npm run deploy
```

### 4. Start Facilitator

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Payment Endpoints

- `POST /verify` - Verify payment authorization
- `POST /settle` - Settle payment on blockchain
- `POST /generateCT` - Generate confidential token encryption

### Weather API

- `POST /weather` - Access weather data (payment required)
- `GET /health` - Health check
- `GET /supported` - Supported payment types

## Usage

### 1. Request Weather Data

```bash
curl -X POST http://localhost:3000/weather \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather in New Delhi?",
    "user_address": "0x..."
  }'
```

### 2. Payment Required Response

```json
{
  "error": "Payment required",
  "message": "Weather API access requires payment. Please provide payment proof.",
  "price": "0.01 WAT",
  "paymentEndpoint": "http://localhost:3000/settle"
}
```

### 3. Generate Confidential Token

```bash
curl -X POST http://localhost:3000/generateCT \
  -H "Content-Type: application/json" \
  -d '{
    "plainTextValue": "0.01",
    "accountAddress": "0x...",
    "dappAddress": "0x..."
  }'
```

## Contract Details

### WeatherToken Contract

- **Name**: Weather Access Token (WAT)
- **Symbol**: WAT
- **Total Supply**: 1,000,000 tokens
- **Weather API Price**: 0.01 WAT
- **Network**: Polygon Amoy (Chain ID: 80002)

### Key Functions

- `transferWithAuthorization()` - EIP-3009 compliant transfer
- `hasWeatherApiAccess()` - Check user balance
- `getWeatherApiPrice()` - Get current API price
- `cancelAuthorization()` - Cancel pending authorization

## Integration with Smart Agent

The facilitator integrates with the smart agent system:

1. **Frontend** sends weather request
2. **Backend** checks for payment proof
3. **Facilitator** verifies and settles payment
4. **Weather API** returns data after payment verification

## Testing

### 1. Deploy and Test Contract

```bash
# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost

# Run tests
npm test
```

### 2. Test Payment Flow

```bash
# Start facilitator
npm run dev

# Test weather API (should require payment)
curl -X POST http://localhost:3000/weather \
  -H "Content-Type: application/json" \
  -d '{"message": "weather test"}'
```

## Security Considerations

- **Private Key**: Store securely, never commit to version control
- **Payment Verification**: Always verify signatures and timestamps
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Authorization**: Check authorization state before processing

## Troubleshooting

### Common Issues

1. **Contract Deployment Fails**
   - Check private key and RPC URL
   - Ensure sufficient testnet tokens

2. **Payment Verification Fails**
   - Verify signature components
   - Check timestamp validity
   - Ensure nonce uniqueness

3. **Weather API Access Denied**
   - Verify payment proof
   - Check user balance
   - Ensure proper authorization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
