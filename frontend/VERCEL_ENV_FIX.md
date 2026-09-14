# Fix: Backend URL Not Detecting Vercel Deployment

## Problem
When the frontend is deployed on Vercel, it's trying to connect to a local backend URL instead of the Vercel backend.

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Select your frontend project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Environment Variables

Add the following environment variables for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_BACKEND_URL = https://mern-stack-dtgy.vercel.app
NEXT_PUBLIC_API_URL = https://mern-stack-dtgy.vercel.app
```

### Step 3: Redeploy
After adding the environment variables:
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Why This Works

The `getBackendUrl()` function checks environment variables first. When you set `NEXT_PUBLIC_BACKEND_URL` in Vercel, it will always use that URL, regardless of how the frontend is accessed.

## Alternative: Quick Fix via Code

The code has been updated to better detect Vercel deployments, but setting environment variables is the most reliable solution.

