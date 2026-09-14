# Frontend Setup Guide

## Quick Start

### 1. Environment Configuration

Create a `.env.local` file in the frontend directory with:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Backend Requirements

Make sure your backend is running on `http://localhost:5000` with the following endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/auth/current-user` - Get current user details

## Sign-in Page

The sign-in page is now fully functional and includes:

### Features
- ✅ **Role-based Authentication**: Integrates with backend JWT system
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Modern UI**: Follows the admin theme design
- ✅ **Error Handling**: Comprehensive error messages
- ✅ **Security Features**: Login attempt tracking and account lockout
- ✅ **Password Visibility Toggle**: Show/hide password functionality
- ✅ **Loading States**: Visual feedback during authentication
- ✅ **Auto-redirect**: Redirects based on user roles after login

### Access Levels
- 🟡 **Super Admin**: Full system access
- 🔵 **Admin**: Company management
- 🟢 **Manager**: Department oversight
- ⚫ **User**: Basic access

### Form Fields
- **Company ID**: Required for multi-tenant system
- **Email**: User's email address
- **Password**: User's password

### Error Handling
- Connection timeout
- Invalid credentials
- User not found
- Account disabled
- Too many login attempts
- Server connection issues

## Troubleshooting

### Page Not Loading
1. Check if the development server is running: `npm run dev`
2. Verify the URL: `http://localhost:3000/auth/sign-in`
3. Check browser console for errors

### Backend Connection Issues
1. Ensure backend is running on `http://localhost:5000`
2. Check the `.env.local` file has correct API URL
3. Verify backend endpoints are accessible

### Authentication Issues
1. Check browser console for API call logs
2. Verify user credentials in backend database
3. Ensure JWT tokens are being generated correctly

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── layout.tsx          # Auth page layout
│   │   │   └── sign-in/
│   │   │       └── page.tsx        # Sign-in page
│   │   └── ...
│   └── components/
│       └── Auth/
│           ├── Signin/
│           │   └── index.tsx       # Sign-in form component
│           ├── user-context.tsx    # User state management
│           ├── PermissionGate.tsx  # Permission-based rendering
│           └── ProtectedRoute.tsx  # Route protection
├── .env.local                      # Environment variables
└── package.json
```

## Next Steps

After successful login, users will be redirected to:
- **Super Admin**: `/admin/dashboard`
- **Users with roles**: `/dashboard`
- **Users without roles**: `/profile`

The dashboard will show role-appropriate content and navigation based on the user's permissions from the backend.
