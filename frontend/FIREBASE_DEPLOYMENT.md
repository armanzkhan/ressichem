# Firebase Deployment Guide for Next.js Frontend

This guide will help you deploy your Next.js frontend to Firebase Hosting with Cloud Functions.

## Prerequisites

1. **Firebase Account**: Create a free account at [Firebase Console](https://console.firebase.google.com/)
2. **Node.js**: Version 18 or higher
3. **Firebase CLI**: Install globally using npm

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

## Step 3: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Note your project ID

## Step 4: Initialize Firebase in Your Frontend

```bash
cd frontend
firebase init
```

When prompted:
- **Select**: Hosting and Functions
- **Select existing project** or create a new one
- **Public directory**: `.next`
- **Single-page app**: No (Next.js handles routing)
- **Set up automatic builds**: No
- **Functions language**: JavaScript
- **ESLint**: Yes (optional)

## Step 5: Update Firebase Configuration

1. **Update `.firebaserc`** with your actual Firebase project ID:
   ```json
   {
     "projects": {
       "default": "your-actual-project-id"
     }
   }
   ```

2. **Update `firebase.json`** if needed (already created)

## Step 6: Install Firebase Functions Dependencies

```bash
cd frontend/functions
npm install
```

This will install `firebase-functions`, `firebase-admin`, and `next` in the functions directory.

## Step 7: Set Environment Variables

Create a `.env.production` file in the `frontend` directory:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Important**: For production, update these URLs to point to your deployed backend server, not `localhost:5000`.

## Step 8: Update Firebase Functions Configuration

The `functions/index.js` file is already created. Make sure it's configured correctly.

## Step 9: Build and Deploy

```bash
# From the frontend directory
cd frontend

# Build the Next.js app
npm run build

# Install functions dependencies (if not done)
cd functions
npm install
cd ..

# Deploy to Firebase
firebase deploy --only hosting,functions
```

Or use the npm script:
```bash
npm run firebase:deploy
```

**Note**: The first deployment may take 5-10 minutes as Firebase sets up Cloud Functions.

## Step 10: Verify Deployment

After deployment, Firebase will provide you with a hosting URL like:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

## Important Notes

### Backend URL Configuration

Before deploying, make sure to:
1. Deploy your backend server to a hosting service (e.g., Heroku, Railway, Render, AWS, etc.)
2. Update the `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_API_URL` environment variables to point to your deployed backend
3. Ensure CORS is configured on your backend to allow requests from your Firebase domain

### Environment Variables

Firebase Functions environment variables can be set using:
```bash
firebase functions:config:set backend.url="https://your-backend-url.com"
```

Or use Firebase Console:
1. Go to Firebase Console → Functions → Configuration
2. Add environment variables

### Cost Considerations

- **Firebase Hosting**: Free tier includes 10 GB storage and 360 MB/day transfer
- **Cloud Functions**: Free tier includes 2 million invocations/month
- Monitor usage in Firebase Console

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)

### Deployment Errors
- Verify Firebase login: `firebase login --reauth`
- Check project ID in `.firebaserc`
- Ensure billing is enabled (required for Cloud Functions)

### Runtime Errors
- Check Firebase Functions logs: `firebase functions:log`
- Verify environment variables are set correctly
- Check backend URL is accessible from Firebase Functions

## Alternative: Static Export (If you don't need API routes)

If you want to use static export (simpler but no API routes):

1. Update `next.config.mjs`:
   ```js
   output: 'export',
   ```

2. Update `firebase.json`:
   ```json
   {
     "hosting": {
       "public": "out",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [{"source": "**", "destination": "/index.html"}]
     }
   }
   ```

3. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Next Steps

1. Set up custom domain (optional)
2. Configure SSL certificates (automatic with Firebase)
3. Set up CI/CD for automatic deployments
4. Monitor performance and usage

## Support

For issues:
- Firebase Documentation: https://firebase.google.com/docs/hosting
- Next.js Deployment: https://nextjs.org/docs/deployment

