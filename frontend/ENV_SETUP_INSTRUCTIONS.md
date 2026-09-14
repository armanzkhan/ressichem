# Environment Setup Instructions

## Required: Create .env.local file

Since the `.env.local` file is missing, you need to create it manually:

1. **Create the file**: `frontend/.env.local`
2. **Add the following content**:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Optional: Add other environment variables as needed
NEXT_PUBLIC_APP_NAME=NextAdmin
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Why this file is needed:

- The frontend needs to know where the backend API is running
- The default fallback is `http://localhost:5000` but having the env file is cleaner
- This ensures the login functionality works properly with the backend

## After creating the file:

1. Restart the frontend development server
2. The login functionality will work properly
3. All API calls will use the correct backend URL

## Test Credentials:

**Super Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Demo User:**
- Email: `demo@example.com`
- Password: `demo123`
