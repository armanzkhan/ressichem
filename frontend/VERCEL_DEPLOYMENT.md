# Vercel Deployment Guide

This guide will help you deploy your Next.js frontend to Vercel for free.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free)
2. **Vercel CLI**: Already installed globally
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Quick Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git provider and repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In the Vercel project settings, add:
     - `NEXT_PUBLIC_BACKEND_URL` - Your backend API URL (e.g., `https://your-backend.com`)
     - `NEXT_PUBLIC_API_URL` - Same as above

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Option 2: Deploy via CLI

1. **Login to Vercel**
   ```bash
   vercel login
   ```

2. **Deploy to Production**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_BACKEND_URL
   vercel env add NEXT_PUBLIC_API_URL
   ```

## Environment Variables

Make sure to set these in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_BACKEND_URL`: Your backend server URL
- `NEXT_PUBLIC_API_URL`: Your API URL (usually same as BACKEND_URL)

## Post-Deployment

1. **Update Backend CORS**: Add your Vercel domain to backend CORS whitelist
2. **Test the deployment**: Visit your Vercel URL
3. **Custom Domain** (Optional): Add your custom domain in Vercel settings

## Notes

- Vercel automatically handles:
  - Next.js API routes
  - Dynamic routes
  - Server-side rendering
  - Static optimization
- Free tier includes:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Global CDN

## Troubleshooting

- **Build errors**: Check Vercel build logs
- **API routes not working**: Ensure environment variables are set
- **CORS errors**: Update backend CORS settings to include Vercel domain

