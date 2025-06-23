# Zybl Auto-Processing Backend

## Overview
This backend automatically monitors Firestore for new unique user IDs and processes their data in real-time. When new users are detected, their data is aggregated, packaged, and uploaded to IPFS via Pinata.

## Features
- **Continuous Monitoring**: Automatically checks Firestore every 60 seconds
- **Real-time Processing**: Processes new users as they appear
- **IPFS Storage**: Uploads user data to IPFS and stores CIDs in Firestore
- **Error Handling**: Robust error handling with retry logic
- **Status Tracking**: Real-time monitoring dashboard

## How It Works

### 1. Auto-Monitoring
- Runs every 60 seconds using cron scheduler
- Checks multiple Firestore collections: `users`, `faceVectors`, `payments`, `biometricData`, `userProfiles`, `sessions`
- Extracts unique user IDs from various fields: `userId`, `sessionId`, `userAddress`, `walletAddress`, document IDs

### 2. Data Processing
- Aggregates all data for each new user ID
- Creates enhanced data package with metadata
- Uploads to IPFS via Pinata
- Stores CID and metadata in Firestore `ipfsData` collection

### 3. Duplicate Prevention
- Tracks processed users in memory
- Skips already processed users
- Marks failed users to avoid infinite retries

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Update `.env` file with your credentials:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY=your-service-account-json

# Pinata IPFS Configuration
PINATA_API_KEY=your-api-key
PINATA_SECRET_API_KEY=your-secret-key
PINATA_JWT=your-jwt-token
```

### 3. Start the Server
```bash
npm start
```

The server will:
- Start on port 5000 (or PORT environment variable)
- Begin continuous monitoring after 10 seconds
- Process any existing users automatically

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and monitoring statistics.

### Processing Status
```
GET /api/status
```
Returns detailed processing status including:
- Currently processing users
- Processing statistics
- Next run time

### Get User CID
```
GET /api/get-user-cid/:userId
```
Get IPFS CID for a specific user ID.

### Get All Users
```
GET /api/all-users
```
Get all processed users and their CIDs.

### Manual Trigger
```
POST /api/trigger-processing
```
Manually trigger processing cycle (for testing).

### Reset Processed Users
```
POST /api/reset-processed
```
Reset processed users list (for testing - use with caution).

## Monitoring Dashboard URLs

Once the server is running, you can access:

- **Health Check**: http://localhost:5000/api/health
- **Processing Status**: http://localhost:5000/api/status
- **All Users**: http://localhost:5000/api/all-users

## Data Structure

### User Data Package
Each processed user gets a data package like this:
```json
{
  "userId": "user-unique-id",
  "exportTimestamp": "2025-06-24T10:30:00.000Z",
  "dataVersion": "1.0",
  "appName": "Zybl-KEY",
  "userData": {
    // All aggregated user data from Firestore collections
  },
  "metadata": {
    "totalCollections": 5,
    "dataSize": 2048,
    "exportedBy": "auto-monitor-service"
  }
}
```

### IPFS Data Record
Each user's processing result is stored in Firestore `ipfsData` collection:
```json
{
  "cid": "QmXXXXXXX...",
  "filename": "zybl-user-12345-1671234567890",
  "timestamp": "server-timestamp",
  "dataSize": 2048,
  "collections": ["users", "payments"],
  "processedAt": "2025-06-24T10:30:00.000Z",
  "status": "completed",
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXXXXXXX...",
  "processingMethod": "auto-monitor"
}
```

## Error Handling
- Network errors are retried automatically
- Invalid user data is skipped and marked as failed
- Processing errors are logged and stored in Firestore
- The system continues processing other users even if one fails

## Performance Considerations
- 2-second delay between processing users to avoid overwhelming services
- Memory-based tracking for processed users (resets on server restart)
- Efficient Firestore queries to minimize read operations
- Automatic garbage collection of temporary data

## Troubleshooting

### Common Issues

1. **Firebase Connection Issues**
   - Check `FIREBASE_SERVICE_ACCOUNT_KEY` format
   - Verify Firestore permissions
   - Ensure project ID is correct

2. **Pinata Upload Failures**
   - Verify API keys and JWT token
   - Check network connectivity
   - Monitor Pinata usage limits

3. **No Users Being Processed**
   - Check if Firestore collections exist
   - Verify user data has required fields
   - Check console logs for errors

### Logs
The system provides detailed console logging:
- `🔍` Monitoring cycle start
- `📄` Collection scan results
- `🔄` User processing start
- `✅` Successful processing
- `❌` Error details
- `📈` Processing statistics

## Development

### Testing
- Use `/api/trigger-processing` to manually trigger processing
- Use `/api/reset-processed` to reprocess all users
- Monitor `/api/status` for real-time processing information

### Adding New Collections
To monitor additional Firestore collections, add them to the `collections` array in `monitorAndProcessUsers()` function:

```javascript
const collections = ['users', 'faceVectors', 'payments', 'biometricData', 'userProfiles', 'sessions', 'newCollection'];
```

## Security Notes
- Keep environment variables secure
- Use Firebase security rules to protect sensitive data
- Consider rate limiting for production deployment
- Monitor IPFS storage costs and usage
