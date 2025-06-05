import { Connection, Keypair, PublicKey, SystemProgram, VersionedTransaction, TransactionMessage, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { searcherClient } from '@jito-labs/sdk/dist/sdk/block-engine/searcher';
import { Bundle } from '@jito-labs/sdk/dist/sdk/block-engine/types';
import { TransferRequest, TransferResponse } from '../types';
import bs58 from 'bs58';
import { credentials } from '@grpc/grpc-js';

export class TransferService {
  private connection: Connection;
  private searcherClient: any;
  private readonly MAX_RECIPIENTS = 5;
  private readonly MIN_SOL_BALANCE = 0.01; // Minimum SOL to keep in account

  constructor() {
    if (!process.env.SOLANA_RPC_URL) {
      throw new Error('SOLANA_RPC_URL environment variable is required');
    }
    if (!process.env.JITO_RPC_URL) {
      throw new Error('JITO_RPC_URL environment variable is required');
    }

    this.connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
    this.searcherClient = searcherClient(process.env.JITO_RPC_URL);
  }

  // Helper function to request devnet SOL
  async requestAirdrop(publicKey: PublicKey, amount: number = 2): Promise<string> {
    try {
      console.log(`Requesting ${amount} SOL airdrop for ${publicKey.toString()}`);
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature);
      if (confirmation.value.err) {
        throw new Error('Airdrop failed to confirm');
      }
      
      console.log(`Airdrop successful. Signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      throw error;
    }
  }

  private async validateSenderBalance(senderKeypair: Keypair, totalAmount: number): Promise<void> {
    const balance = await this.connection.getBalance(senderKeypair.publicKey);
    const requiredBalance = (totalAmount * LAMPORTS_PER_SOL) + (this.MIN_SOL_BALANCE * LAMPORTS_PER_SOL);
    
    if (balance < requiredBalance) {
      // For devnet, automatically request airdrop if balance is insufficient
      if (process.env.NODE_ENV === 'development' || process.env.USE_DEVNET === 'true') {
        console.log('Insufficient balance, requesting devnet airdrop...');
        await this.requestAirdrop(senderKeypair.publicKey, totalAmount + this.MIN_SOL_BALANCE);
        return;
      }
      throw new Error(`Insufficient balance. Required: ${totalAmount + this.MIN_SOL_BALANCE} SOL, Available: ${balance / LAMPORTS_PER_SOL} SOL`);
    }
  }

  private async validateRecipients(recipients: { address: string; amount: number }[]): Promise<void> {
    if (recipients.length > this.MAX_RECIPIENTS) {
      throw new Error(`Maximum ${this.MAX_RECIPIENTS} recipients allowed`);
    }

    for (const recipient of recipients) {
      if (recipient.amount <= 0) {
        throw new Error(`Invalid amount for recipient ${recipient.address}: ${recipient.amount} SOL`);
      }
      try {
        new PublicKey(recipient.address);
      } catch {
        throw new Error(`Invalid recipient address: ${recipient.address}`);
      }
    }
  }

  async transferSOL(request: TransferRequest): Promise<TransferResponse> {
    try {
      console.log('Starting SOL transfer process...');
      
      console.log('🦴🦴', request);
      // Convert private key to Keypair
      const senderKeypair = Keypair.fromSecretKey(
        bs58.decode(request.senderPrivateKey)
      );

      // Validate recipients
      await this.validateRecipients(request.recipients);

      // Calculate total amount and validate balance
      const totalAmount = request.recipients.reduce((sum, r) => sum + r.amount, 0);
      await this.validateSenderBalance(senderKeypair, totalAmount);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      console.log('Got recent blockhash:', blockhash);

      // Create transactions for each recipient
      console.log('Creating transactions for recipients...');
      const transactions = await Promise.all(
        request.recipients.map(async (recipient) => {
          const messageV0 = new TransactionMessage({
            payerKey: senderKeypair.publicKey,
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: new PublicKey(recipient.address),
                lamports: recipient.amount * LAMPORTS_PER_SOL,
              }),
            ],
          }).compileToV0Message();

          const transaction = new VersionedTransaction(messageV0);
          transaction.sign([senderKeypair]);
          return transaction;
        })
      );

      // Create a bundle and add transactions
      console.log('Creating Jito bundle...');
      const bundle = new Bundle(transactions, transactions.length);

      // Send bundle
      console.log('Sending bundle to Jito...');
      const result = await this.searcherClient.sendBundle(bundle);
      
      if (!result.ok) {
        console.error('Bundle submission failed:', result.error);
        return {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Unknown error occurred',
        };
      }

      console.log('Bundle submitted successfully. Signature:', result.value);

      // Wait for confirmation
      try {
        const confirmation = await this.connection.confirmTransaction(result.value);
        if (confirmation.value.err) {
          throw new Error('Transaction failed to confirm');
        }
        console.log('Transaction confirmed successfully');
      } catch (error) {
        console.error('Error confirming transaction:', error);
        return {
          success: false,
          error: 'Transaction failed to confirm',
        };
      }

      return {
        success: true,
        signature: result.value,
      };
    } catch (error) {
      console.error('Error in transferSOL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
} 