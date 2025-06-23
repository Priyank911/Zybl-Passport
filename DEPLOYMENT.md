# Zybl Project - Vercel Deployment Guide

## 🚀 Deployment Setup

Your project is now configured to deploy both frontend and backend to Vercel together!

### Project Structure:
```
Zybl-KEY/
├── src/                    # Frontend React/Vite app
├── backend/               # Backend Express server
├── api/                   # Vercel serverless functions
│   └── index.js          # Entry point for all API routes
├── vercel.json           # Vercel configuration
└── package.json          # Build scripts
```

### 🔧 Configuration Files:

#### 1. `vercel.json`
- Configured to build both frontend (Vite) and backend (Node.js)
- Routes all `/api/*` requests to the backend
- Serves frontend for all other routes

#### 2. `api/index.js`
- Entry point for all backend API routes
- Imports the Express app from `backend/server.js`

#### 3. `package.json`
- Updated build scripts for Vercel deployment
- Installs backend dependencies during build

### 🌐 How it Works on Vercel:

1. **Frontend**: Vite builds your React app to `/dist`
2. **Backend**: Runs as serverless functions under `/api/*`
3. **API Routes**: All your backend endpoints work the same:
   - `/api/health` - Health check
   - `/api/status` - Processing status
   - `/api/all-users` - List all users
   - `/api/trigger-processing` - Manual trigger
   - `/api/get-user-cid/:userId` - Get user CID

### 📋 Environment Variables Needed on Vercel:

Add these in your Vercel dashboard:
```
FIREBASE_PROJECT_ID=zybl-key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
PINATA_JWT=your_pinata_jwt
NODE_ENV=production
```

### 🔐 Firebase Service Account:

You'll need to upload your `firebase-service-account.json` or convert it to environment variables for Vercel.

### 🚀 Deployment Steps:

1. **Connect to Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Or via GitHub**:
   - Push to GitHub
   - Connect repository in Vercel dashboard
   - Deploy automatically

### ⚠️ Important Notes:

- **Cron Jobs**: The 2-hour cron schedule won't work on Vercel (serverless)
- **Background Processing**: For continuous monitoring, consider:
  - Using Vercel Cron (paid feature)
  - External cron service calling your API
  - GitHub Actions with scheduled workflows

### 🔄 Alternative for Background Processing:

Since Vercel doesn't support long-running processes, you can:

1. **Use Vercel Cron** (Pro plan):
   ```json
   // vercel.json
   {
     "crons": [{
       "path": "/api/trigger-processing",
       "schedule": "0 */2 * * *"
     }]
   }
   ```

2. **External Cron Service**:
   - Use GitHub Actions
   - Use cron-job.org to call `/api/trigger-processing` every 2 hours

### 📊 URLs After Deployment:

- **Frontend**: `https://your-project.vercel.app`
- **Health Check**: `https://your-project.vercel.app/api/health`
- **All APIs**: `https://your-project.vercel.app/api/*`

Your project is ready for Vercel deployment! 🎉
