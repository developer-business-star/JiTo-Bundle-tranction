export interface TransferRequest {
  senderPrivateKey: string;
  recipients: {
    address: string;
    amount: number; // in SOL
  }[];
}

export interface TransferResponse {
  success: boolean;
  signature?: string;
  error?: string;
} 