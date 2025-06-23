# Zybl Backend - Data Export & IPFS Integration

This backend service provides comprehensive data aggregation and IPFS storage functionality for Zybl user data.

## Features

- 📊 **Data Aggregation**: Collects all user data from Firebase collections
- 🌐 **IPFS Storage**: Uploads user data to IPFS via Pinata
- 🔗 **CID Management**: Stores and retrieves IPFS CIDs in Firebase
- 🔒 **X402 Payment**: Protected endpoints with payment verification
- 📈 **Data Analytics**: Provides data completeness and summary statistics

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase Admin SDK service account
- `PINATA_API_KEY`: Pinata API key
- `PINATA_SECRET_API_KEY`: Pinata secret API key  
- `PINATA_JWT`: Pinata JWT token

### 3. Firebase Service Account

1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate a new private key
3. Copy the JSON content to `FIREBASE_SERVICE_ACCOUNT_KEY` in .env

### 4. Pinata Setup

1. Create account at [Pinata.cloud](https://pinata.cloud)
2. Generate API keys and JWT token
3. Add credentials to .env file

## API Endpoints

### 1. Export User Data to IPFS
```
POST /api/export-user-data
```

**Request Body:**
```json
{
  "userId": "1115d57f-4847-4ea9-8bd5-a929bd736f5e",
  "includeMetadata": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User data successfully exported to IPFS",
  "data": {
    "userId": "1115d57f-4847-4ea9-8bd5-a929bd736f5e",
    "cid": "QmX123...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmX123...",
    "publicUrl": "https://QmX123....ipfs.dweb.link/",
    "dataCompleteness": 85,
    "exportTimestamp": "2025-06-24T10:30:00.000Z"
  }
}
```

### 2. Get User IPFS CID
```
GET /api/get-user-cid/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "1115d57f-4847-4ea9-8bd5-a929bd736f5e",
    "cid": "QmX123...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmX123...",
    "exportTimestamp": "2025-06-24T10:30:00.000Z"
  }
}
```

### 3. Get Aggregated User Data
```
GET /api/get-user-data/:userId
```

Returns complete user data without IPFS upload.

### 4. Test Pinata Connection
```
GET /api/test-pinata
```

### 5. Health Check
```
GET /health
```

## Data Collections

The service aggregates data from these Firebase collections:

- **users**: Basic user information
- **verifications**: Verification status and scores
- **didDocuments**: Decentralized Identity documents
- **payments**: Payment history
- **userJourneys**: User interaction tracking
- **userSettings**: User preferences
- **walletConnections**: Connected wallet addresses
- **users/{userId}/faceVectors**: Biometric face data

## Data Structure

```json
{
  "userId": "string",
  "exportTimestamp": "ISO date",
  "userData": { /* user profile data */ },
  "verificationStatus": { /* verification info */ },
  "didDocument": { /* DID document */ },
  "payments": [ /* payment history */ ],
  "userJourney": { /* user interactions */ },
  "userSettings": { /* user preferences */ },
  "walletConnections": [ /* connected wallets */ ],
  "faceVectors": [ /* biometric data */ ],
  "summary": {
    "totalPayments": 2,
    "isVerified": true,
    "hasDID": true,
    "dataCompleteness": 85
  }
}
```

## Testing

Run the test script to verify functionality:

```bash
node test-export.js
```

This will test:
1. Pinata connection
2. Data aggregation
3. IPFS upload
4. CID storage
5. CID retrieval

## Usage Examples

### Export Data via cURL

```bash
curl -X POST http://localhost:5000/api/export-user-data \
  -H "Content-Type: application/json" \
  -d '{"userId": "1115d57f-4847-4ea9-8bd5-a929bd736f5e"}'
```

### Get User CID

```bash
curl http://localhost:5000/api/get-user-cid/1115d57f-4847-4ea9-8bd5-a929bd736f5e
```

## Security Features

- Input validation for user IDs
- Error handling for missing data
- Rate limiting (can be added)
- Firebase Admin SDK for secure database access
- IPFS content addressing for data integrity

## Development

Start the development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Firebase     │
│   (React)       │───▶│   (Express)     │───▶│   (Firestore)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │      IPFS       │
                       │    (Pinata)     │
                       └─────────────────┘
```

## Error Handling

The service includes comprehensive error handling:
- Missing user data
- Firebase connection issues
- IPFS upload failures
- Invalid user IDs
- Network timeouts

All errors are logged and returned with appropriate HTTP status codes.
