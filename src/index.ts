import dotenv from 'dotenv';
import { TransferService } from './services/transferService';
import { TransferRequest } from './types';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SOLANA_RPC_URL', 'JITO_RPC_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const transferService = new TransferService();

// Example usage of transfer service
async function main() {
  try {
    const transferRequest: TransferRequest = {
      senderPrivateKey: process.env.SENDER_PRIVATE_KEY || '',
      recipients: [
        {
          address: process.env.RECIPIENT_ADDRESS_1 || '',
          amount: 0.1 // Amount in SOL
        },
        {
          address: process.env.RECIPIENT_ADDRESS_2 || '',
          amount: 0.1 // Amount in SOL
        }
      ]
    };

    console.log('Starting transfer process...');
    const result = await transferService.transferSOL(transferRequest);
    
    if (result.success) {
      console.log('Transfer successful:', result.signature);
    } else {
      console.error('Transfer failed:', result.error);
    }
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

main(); 