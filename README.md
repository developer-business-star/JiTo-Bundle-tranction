# SOL Transfer Service with Jito Bundling

This service allows you to transfer SOL from one wallet to multiple recipients (up to 5) simultaneously using Jito bundles for atomic execution. Supports both mainnet and devnet.

## Features

- Transfer SOL to up to 5 recipients in a single atomic transaction
- Uses Jito bundles for guaranteed execution
- Input validation and error handling
- Balance checks before transfers
- Transaction confirmation tracking
- Detailed logging
- Devnet support with automatic airdrops

## Prerequisites

- Node.js 16 or higher
- A Solana RPC endpoint (mainnet or devnet)
- A Jito RPC endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
# For mainnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
JITO_RPC_URL=https://block-engine.mainnet.block-engine.jito.network:443

# For devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
JITO_RPC_URL=https://block-engine.devnet.block-engine.jito.network:443
USE_DEVNET=true  # Set this to enable devnet features like automatic airdrops

PORT=3000  # optional, defaults to 3000
```

3. Start the server:
```bash
npm start
```

## API Usage

### Health Check
```bash
GET /health
```
Returns server status.

### Transfer SOL
```bash
POST /transfer
```

Request body:
```json
{
  "senderPrivateKey": "base58_encoded_private_key",
  "recipients": [
    {
      "address": "recipient1_solana_address",
      "amount": 1.5  // amount in SOL
    },
    {
      "address": "recipient2_solana_address",
      "amount": 2.0
    }
    // ... up to 5 recipients
  ]
}
```

Response:
```json
{
  "success": true,
  "signature": "transaction_signature"
}
```

## Devnet Features

When running on devnet (USE_DEVNET=true):
- Automatic airdrops when sender has insufficient balance
- No minimum balance requirement
- Faster transaction confirmations
- Free SOL for testing

## Error Handling

The service includes comprehensive error handling for:
- Invalid private key format
- Invalid recipient addresses
- Insufficient balance (with automatic airdrop on devnet)
- Invalid amounts
- Network errors
- Transaction failures

## Security Notes

- Never expose your private keys
- Use environment variables for sensitive configuration
- The service keeps a minimum balance of 0.01 SOL in the sender's account (mainnet only)
- Maximum 5 recipients per bundle to prevent abuse
- Devnet mode should only be used for testing

## Development

To run in development mode with hot reloading:
```bash
npm run dev
```

## Testing

To run tests:
```bash
npm test
``` 