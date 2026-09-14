# Windows PowerShell Setup Guide

## Starting the Frontend on Windows

Since Windows PowerShell doesn't support `&&` operator, use these commands separately:

### Method 1: Separate Commands
```powershell
cd frontend
npm run dev
```

### Method 2: Using Command Prompt (cmd)
```cmd
cd frontend && npm run dev
```

### Method 3: Using Git Bash (if installed)
```bash
cd frontend && npm run dev
```

## Current Setup Status

✅ **Backend**: Running on `http://localhost:5000`
✅ **Frontend**: Should be running on `http://localhost:3000`

## Environment Configuration

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Testing the Sign-in Page

1. **Open browser**: Go to `http://localhost:3000/auth/sign-in`
2. **Check console**: Open browser dev tools (F12) to see API calls
3. **Test login**: Use valid credentials from your backend database

## Troubleshooting

### If frontend doesn't start:
```powershell
# Check if you're in the right directory
pwd

# Install dependencies if needed
npm install

# Start development server
npm run dev
```

### If you see connection errors:
- Verify backend is running on port 5000
- Check the `.env.local` file has the correct API URL
- Ensure both servers are running simultaneously

## Expected Output

When both servers are running correctly:

**Backend Terminal:**
```
Server running on port 5000
MongoDB connected
```

**Frontend Terminal:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- info Loaded env from .env.local
```

**Browser:**
- Sign-in page loads at `http://localhost:3000/auth/sign-in`
- Form is functional and responsive
- API calls show in browser console
