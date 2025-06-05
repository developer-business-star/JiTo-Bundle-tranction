"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferService = void 0;
const web3_js_1 = require("@solana/web3.js");
const sdk_1 = require("@jito-labs/sdk");
const bs58_1 = __importDefault(require("bs58"));
class TransferService {
    constructor() {
        this.connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
        this.jitoRpcPool = new sdk_1.JitoRpcPool(process.env.JITO_RPC_URL || 'https://jito-api.mainnet.jito.wtf');
        this.searcherClient = new sdk_1.SearcherClient(this.jitoRpcPool);
    }
    async transferSOL(request) {
        try {
            // Convert private key to Keypair
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(request.senderPrivateKey));
            // Create transactions for each recipient
            const transactions = await Promise.all(request.recipients.map(async (recipient) => {
                const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                    fromPubkey: senderKeypair.publicKey,
                    toPubkey: new web3_js_1.PublicKey(recipient.address),
                    lamports: recipient.amount * web3_js_1.LAMPORTS_PER_SOL,
                }));
                // Get recent blockhash
                const { blockhash } = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = senderKeypair.publicKey;
                // Sign transaction
                transaction.sign(senderKeypair);
                return transaction;
            }));
            // Create and send bundle
            const bundle = await this.searcherClient.sendBundle(transactions);
            return {
                success: true,
                signature: bundle.signature,
            };
        }
        catch (error) {
            console.error('Error in transferSOL:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }
}
exports.TransferService = TransferService;
