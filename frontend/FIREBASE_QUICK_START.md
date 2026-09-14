# Firebase Deployment - Quick Start Guide

## ✅ Files Already Created

The following files have been created for you:
- `firebase.json` - Firebase configuration
- `.firebaserc` - Firebase project configuration (update with your project ID)
- `functions/index.js` - Cloud Function for Next.js server
- `functions/package.json` - Functions dependencies

## 🚀 Quick Deployment Steps

### 1. Install Firebase CLI (if not installed)
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Create/Select Firebase Project
1. Go to https://console.firebase.google.com/
2. Create a new project or select existing one
3. Note your **Project ID**

### 4. Update Project ID
Edit `frontend/.firebaserc` and replace `your-firebase-project-id` with your actual project ID:
```json
{
  "projects": {
    "default": "your-actual-project-id-here"
  }
}
```

### 5. Install Functions Dependencies
```bash
cd frontend/functions
npm install
cd ..
```

### 6. Set Environment Variables (IMPORTANT!)

Before deploying, you need to update the backend URL. Create `frontend/.env.production`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-deployed-backend-url.com
NEXT_PUBLIC_API_URL=https://your-deployed-backend-url.com
```

**⚠️ Important**: Replace `your-deployed-backend-url.com` with your actual deployed backend URL. The frontend needs to know where to send API requests.

### 7. Build and Deploy
```bash
cd frontend

# Build Next.js app
npm run build

# Deploy to Firebase
firebase deploy --only hosting,functions
```

Or use the npm script:
```bash
npm run firebase:deploy
```

### 8. Access Your Deployed App

After deployment, Firebase will provide URLs like:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

## 📝 Important Notes

### Backend Deployment Required
- Your backend must be deployed separately (not on Firebase)
- Update `NEXT_PUBLIC_BACKEND_URL` to point to your deployed backend
- Ensure CORS is configured on your backend to allow requests from Firebase domain

### Billing
- Firebase Hosting: Free tier available
- Cloud Functions: Requires billing account (Blaze plan) - but has generous free tier
- Enable billing in Firebase Console before deploying functions

### First Deployment
- First deployment may take 5-10 minutes
- Subsequent deployments are faster

## 🔧 Troubleshooting

### "Billing account required"
- Enable billing in Firebase Console (Blaze plan required for Functions)
- Free tier is generous, you likely won't be charged

### "Function deployment failed"
- Check Node.js version: `node --version` (should be 18+)
- Verify all dependencies are installed: `cd functions && npm install`

### "Cannot find module 'next'"
- Make sure `next` is installed in functions: `cd functions && npm install next`

### Backend connection issues
- Verify backend URL is correct in `.env.production`
- Check backend CORS settings allow Firebase domain
- Test backend URL is accessible from browser

## 📚 Full Documentation

See `FIREBASE_DEPLOYMENT.md` for detailed documentation.

