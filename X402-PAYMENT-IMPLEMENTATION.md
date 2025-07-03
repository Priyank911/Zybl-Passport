# X402 Payment Implementation - Zybl Passport

## Overview
This implementation adds X402-style payment verification to the Zybl Passport project, requiring users to pay 2 USDC on Base Sepolia testnet before accessing the dashboard.

## Features
- **Real Testnet Payments**: Uses Base Sepolia testnet with real USDC transactions
- **Blockchain Verification**: Backend API verifies payments on-chain using ethers.js
- **Payment History**: Users can view their transaction history
- **HTTP 402 Support**: Proper 402 Payment Required responses with metadata
- **Wallet Integration**: Works with MetaMask and Coinbase Wallet
- **Explorer Links**: Direct links to Base Sepolia block explorer

## Architecture

### Flow Diagram
```
User -> SignIn -> BiometricVerification -> Payment -> Dashboard
                                           ^
                                           |
                                    [X402 Verification]
```

### Payment Flow
1. User completes biometric verification
2. Redirected to payment page
3. Connects wallet (MetaMask/Coinbase)
4. Initiates 2 USDC payment to receiver address
5. Backend verifies transaction on Base Sepolia
6. If verified (200 OK), user accesses dashboard
7. If not verified (402 Payment Required), shows payment metadata

## Configuration

### Environment Variables (.env)
```bash
# X402 Payment Configuration
VITE_X402_RECEIVER_ADDRESS=0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721
VITE_X402_REQUIRED_AMOUNT=2
VITE_X402_USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_X402_NETWORK_NAME=Base Sepolia
VITE_X402_CHAIN_ID=84532
VITE_X402_RPC_URL=https://sepolia.base.org
VITE_X402_EXPLORER_URL=https://sepolia.basescan.org
```

### Base Sepolia Testnet
- **Network**: Base Sepolia
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **USDC Contract**: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **Explorer**: https://sepolia.basescan.org

## API Endpoints

### POST /api/verify-payment
Verifies USDC payment on Base Sepolia blockchain.

**Request:**
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b8D098f9A6E9",
  "userId": "user123"
}
```

**Response (200 OK - Payment Verified):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "transaction": {
    "hash": "0x1234567890abcdef...",
    "amount": "2.0",
    "from": "0x742d35Cc6634C0532925a3b8D098f9A6E9",
    "to": "0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721",
    "blockNumber": 12345,
    "timestamp": 1640995200,
    "explorerUrl": "https://sepolia.basescan.org/tx/0x1234567890abcdef..."
  },
  "payment_verified": true
}
```

**Response (402 Payment Required):**
```json
{
  "error": "Payment Required",
  "message": "No USDC payment found from your wallet to the receiver address",
  "payment_required": {
    "amount": "2",
    "currency": "USDC",
    "token_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "receiver_address": "0xDCB45e4f6762C3D7C61a00e96Fb94ADb7Cf27721",
    "network": "Base Sepolia",
    "chain_id": 84532
  }
}
```

## Components

### Payment.jsx
- Handles payment initiation and verification
- Integrates with wallet providers
- Shows payment progress and confirmation

### PaymentHistory.jsx
- Displays user's payment history
- Shows transaction details and explorer links
- Fetches data from verification API

### Dashboard.jsx
- Checks payment status before allowing access
- Redirects to payment page if payment required
- Shows payment history tab

## Key Files

```
api/
├── verify-payment.js          # Payment verification API
src/
├── auth/
│   ├── Payment.jsx           # Payment page component
│   └── Dashboard.jsx         # Dashboard with payment check
├── components/
│   └── PaymentHistory.jsx    # Payment history component
├── services/
│   └── x402PaymentService.js # Payment service functions
└── styles/
    └── PaymentHistory.css    # Payment history styles
```

## Testing

### Prerequisites
1. Base Sepolia testnet ETH for gas fees
2. Base Sepolia USDC for payments
3. MetaMask or Coinbase Wallet configured for Base Sepolia

### Test Flow
1. Go to sign-in page
2. Complete biometric verification
3. Navigate to payment page
4. Connect wallet
5. Approve 2 USDC payment
6. Verify transaction on Base Sepolia
7. Access dashboard
8. Check payment history tab

### Getting Test Tokens
- **Base Sepolia ETH**: Use Base Sepolia faucet
- **Base Sepolia USDC**: Use USDC faucet or swap from ETH

## Security Considerations

### Production Deployment
- Use environment variables for sensitive data
- Implement rate limiting on payment verification API
- Add proper error handling and logging
- Use secure RPC endpoints
- Validate all user inputs

### Smart Contract Security
- USDC is a well-audited token contract
- Payments are verified on-chain
- No need for custom smart contracts

## Troubleshooting

### Common Issues

1. **Payment Not Found**
   - Check if transaction was mined
   - Verify correct receiver address
   - Ensure sufficient payment amount

2. **RPC Errors**
   - Check Base Sepolia RPC endpoint
   - Verify network connectivity
   - Try alternative RPC URLs

3. **Wallet Connection Issues**
   - Ensure wallet is connected to Base Sepolia
   - Check wallet permissions
   - Verify wallet has sufficient ETH for gas

### Debug Mode
Enable debug logging in browser console to see detailed payment flow information.

## Future Enhancements

1. **Multiple Payment Methods**: Support for other tokens
2. **Subscription Models**: Recurring payments
3. **Payment Plans**: Different access tiers
4. **Refund System**: Automated refund processing
5. **Analytics**: Payment success/failure tracking

## References

- [X402 Protocol Specification](https://github.com/x402-protocol/x402-protocol)
- [Base Sepolia Documentation](https://docs.base.org/network-information)
- [USDC Contract on Base Sepolia](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- [Ethers.js Documentation](https://docs.ethers.io/v5/)
