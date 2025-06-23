# Zybl Passport - Multi-Chain Web3 Authentication

This project implements robust, error-free, and professional Web3 authentication for Zybl Passport, supporting wallet-based sign-in with multi-chain support.

## Features

- **Multi-Chain Support**: Ethereum, Polygon, Solana, and Cosmos
- **Multiple Wallet Support**:
  - MetaMask (Ethereum, Polygon)
  - WalletConnect (Cross-chain)
  - Coinbase Wallet (Ethereum, Polygon)
  - Phantom (Solana)
  - Keplr (Cosmos)
- **Seamless Authentication Flow**: Handles both sign-in and sign-up
- **Chain-Specific Signature Generation**: Adapts to each blockchain's signing methods
- **Robust Error Handling**: User-friendly error messages for all common scenarios
- **Modern UI/UX**: Chain selection, wallet selection, and status indicators

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file with:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
   VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```
4. Run the development server: `npm run dev`

## Authentication Flow

1. User selects a blockchain (Ethereum, Polygon, Solana, Cosmos)
2. User selects a compatible wallet for that chain
3. User connects wallet and signs message to authenticate
4. If user doesn't have an account, one is automatically created
5. User is redirected to personal dashboard showing chain and wallet info

## Dependencies

- Clerk for Web3 authentication
- ethers.js for Ethereum interactions
- WalletConnect for cross-chain support
- Coinbase Wallet SDK
- Solana and Cosmos adapters

## Best Practices

- Chain-agnostic design pattern for easy addition of new chains
- Modular wallet connection logic
- Comprehensive error handling
- User-friendly interface with clear feedback
- Modern, responsive UI with animations and visual indicators

## Future Enhancements

- Add more chains (Bitcoin, Polkadot, etc.)
- Implement biometric verification after wallet authentication
- Add Sybil resistance scoring
- Support hardware wallets
- Implement social recovery
