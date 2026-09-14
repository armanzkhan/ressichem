# Vercel Environment Variables Setup

## Backend URL Configuration

Your backend is deployed at: **https://mern-stack-dtgy.vercel.app**

## Setting Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   ```
   NEXT_PUBLIC_BACKEND_URL = https://mern-stack-dtgy.vercel.app
   NEXT_PUBLIC_API_URL = https://mern-stack-dtgy.vercel.app
   ```

4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add NEXT_PUBLIC_BACKEND_URL production
# Enter: https://mern-stack-dtgy.vercel.app

vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://mern-stack-dtgy.vercel.app
```

## Automatic Detection

The frontend code automatically detects Vercel deployment and uses the backend URL:
- If `NEXT_PUBLIC_BACKEND_URL` or `NEXT_PUBLIC_API_URL` is set, it uses that
- If on Vercel (detected via `VERCEL` env var or `vercel.app` domain), it uses `https://mern-stack-dtgy.vercel.app`
- Otherwise, it falls back to `http://localhost:5000` for local development

## Verification

After deployment, test the connection:

```bash
# Test from browser console or curl
curl https://your-frontend.vercel.app/api/health
```

Or check the browser console for logs showing which backend URL is being used.

## Local Development

For local development, create a `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

This ensures local development uses your local backend server.

