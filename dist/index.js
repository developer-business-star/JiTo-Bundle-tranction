"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const transferService_1 = require("./services/transferService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
const transferService = new transferService_1.TransferService();
app.post('/transfer', async (req, res) => {
    try {
        const transferRequest = req.body;
        // Validate request
        if (!transferRequest.senderPrivateKey || !transferRequest.recipients || transferRequest.recipients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request format. Required: senderPrivateKey and recipients array',
            });
        }
        // Validate recipients
        if (transferRequest.recipients.length > 5) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 5 recipients allowed per bundle',
            });
        }
        const result = await transferService.transferSOL(transferRequest);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(500).json(result);
        }
    }
    catch (error) {
        console.error('Error processing transfer request:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
