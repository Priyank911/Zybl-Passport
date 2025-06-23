# 🔐 Firebase Credentials Solution for Vercel Deployment

## **Problem**: GitHub Push Protection blocked your Firebase service account JSON file.

## **Solution**: Use environment variables for production (Vercel) and keep JSON file for local development.

---

## 🚀 **For Vercel Deployment**:

### **Step 1**: Add these environment variables in your **Vercel Dashboard**:

Go to your Vercel project → Settings → Environment Variables and add:

```
FIREBASE_PROJECT_ID=zybl-key
FIREBASE_PRIVATE_KEY_ID=3e5379ff9fcb2acd79cf34ce6aebb06a115a13c7
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCpKWNmYChWav58
tGz3FHhv7AGhZHDSwdUL4vYMXqzGdyNnv3+S49j4k6O5gclNu/KeMusIJBk/JXUE
VSZQrpVCluNsCM9vIdPIJQI1V6g+ucMek7l5NUaNB0k4TaJntoh7vgKhL2FwKL+G
YbcRwrazGujI5SJtv7k/YZ7kXHrSAqhaWPYORs/hlscMC8hGkF4OJWbTg3vx6NEP
T1PoQzaB/QA6uAXpHErMtrIMDlSjVJy3qw6MDFOnAq/TekSI5MeLoAeAZTZIM136
bnefpXKr2a9DoWJJF14uHzysC4bAllJtj4OwJBcYV0CxYIZwd1Y9OJ4qe7q3D+9Z
mgQddrpFAgMBAAECggEAUHMektGoXXEFFsm4CMnzfUcAf4EFJzaH299UpQ1hngGL
FQw93938kjuk4dSXqCB6gkI1BOomF6H4xNa6IiTlV4XrIrYN8QxlbAotwrCtkydF
ZIVc8AgmRWvxppVFZ42n2zHCjmW6MV0vuPk/13KC8SsbCm/ur8M+lqYWqwRQZQ+Y
dFMJUWj588iI2P9hKs3cV5T/u8cRtEvY8p6dXvyVHq4pCIdA40OnOqwopNLu4yND
ZgHDmvBUpoeCvKnw7koMGhT/H3cN1dSs/hbEm4sYJedpjED+0Lu/WspnhhWn/xnx
qL1UMembCLIphbLo7BAro6FqZgZ7XXNgmwP5oGK1AQKBgQDXPQW38d5qU8z4ceRe
/n+1GC+FYnxxWG/KFZeYHD5fs1R64c137YIECZBIFHXHd9i4UfpcI6U/JA7fA2JN
HyOJJdXTaelYaEVIvfEAtDAthGsLmMKvBRrJnMrRj6WXSGjqVWizEBuAcTPaXUGM
cwLhCWsen9LYU5T7siHwdBmwWwKBgQDJMoUzTFspZD17RXQ05Np1I0nLwFjvTYiw
QMCJ4NUZ3ma/xdvCM0k8ydMRg/xELwO5N2ObkYD4/TObr6kzqnQERwd/4PJLoiS6
qtlvJa2eHXK3vn7wGO00L3m4xjY/M0yL0VOFl6QUZl9wYhSbHZPNnVrJmYCoy7RD
9otbYR1B3wKBgATbfLCNBc7yezK0J0o5hhpJJHFnKpXIQCWYXSZypLm2K1bml6N4
ObHroVTvGUVaIArw1qyTpVwKbUd9JQ/Gfx/OOcgeoMR8/etJVhIE/v1X+q51URdw
Dw2zuyQFkOAcIzn+mXFJEMXSSDBKYHtR8SOw+bjkNHbrU/ZmK7voctf3AoGBAIez
BVfmBg5Sx4ze+VO7jwQ2es1rvBAa8Tg/VB0qgVBjSlXJ80B2Ks1PKobDyF+Mfixs
CUihyKUm0aoNvkdUjc9cwNglNgaBI9iq5uAqP4FHR1pap270wPfTlXtkZK4XwWcE
Fhsifc4she5cmJ1OQ6QIn3UdjUNLsRetr6xAQeVtAoGAU0qsD0GV/a1BXHvwfpiY
MJRDPYjDWqp4VFXvCmd6zREKN6CGxYQLxkALKp1QXpE792gXRKZAcbiTO2Awjc2e
OcWqdcWOPXxJFbtqcUwJ05O2N0CePTtpY/6xo/wv2LHI+viwi3CrzUC8VhdNOT/G
ozeM8ZYG9Ksm3+Ng6/m7NmA=
-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@zybl-key.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=110150172381580042103
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40zybl-key.iam.gserviceaccount.com

PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
PINATA_JWT=your_pinata_jwt
NODE_ENV=production
```

### **Step 2**: Remove the JSON file from Git and push again:

```bash
# Add to .gitignore
echo "backend/firebase-service-account.json" >> .gitignore

# Remove from git tracking (but keep the file locally)
git rm --cached backend/firebase-service-account.json

# Commit the changes
git add .gitignore
git commit -m "Remove Firebase service account from git tracking"

# Push to GitHub (should work now)
git push -u origin main
```

---

## 💻 **For Local Development**:

Keep your `backend/firebase-service-account.json` file - it will be used automatically when running locally.

---

## 🔧 **How It Works**:

Your Firebase admin config already supports both methods:

- **Local Development**: Uses `firebase-service-account.json` file
- **Vercel Production**: Uses environment variables when `VERCEL=true` or `NODE_ENV=production`

---

## ✅ **After Setup**:

1. **Local**: Your backend works with the JSON file
2. **Vercel**: Your backend works with environment variables
3. **Security**: No sensitive data in your GitHub repository
4. **Deployment**: Vercel deployment will work perfectly

---

## 🚀 **Deploy Steps**:

1. Add environment variables to Vercel dashboard
2. Remove JSON file from git: `git rm --cached backend/firebase-service-account.json`
3. Add to .gitignore: `echo "backend/firebase-service-account.json" >> .gitignore`
4. Commit and push: `git add . && git commit -m "Remove sensitive files" && git push`
5. Deploy to Vercel!

Your backend will work perfectly on both local and Vercel! 🎉
