# Role-Based Access Control (RBAC) Frontend Integration

This document describes the role-based access control system implemented in the frontend to align with the backend authentication and authorization system.

## Overview

The frontend now includes a comprehensive RBAC system that:
- Integrates with the backend JWT authentication
- Implements permission-based component rendering
- Provides role-based navigation filtering
- Includes user management dashboards
- Supports super admin functionality

## Key Components

### 1. Authentication System

#### User Context (`src/components/Auth/user-context.tsx`)
- Manages user state and authentication
- Provides permission checking utilities
- Handles token refresh and user data fetching
- Includes loading states and error handling

#### Permission Gate (`src/components/Auth/PermissionGate.tsx`)
- Wrapper component for permission-based rendering
- Supports permission, role, and super admin checks
- Provides fallback UI for unauthorized access
- Higher-order component support

#### Protected Route (`src/components/Auth/ProtectedRoute.tsx`)
- Route-level authentication protection
- Automatic redirection for unauthenticated users
- Loading state management

### 2. Navigation System

#### Permission-Based Sidebar (`src/components/Layouts/sidebar/`)
- Dynamic navigation filtering based on user permissions
- Role-based menu item visibility
- Super admin section with restricted access
- Responsive design with mobile support

#### Navigation Data (`src/components/Layouts/sidebar/data/index.ts`)
- Centralized navigation configuration
- Permission requirements for each menu item
- Super admin restrictions
- Hierarchical menu structure

### 3. Dashboard Pages

#### Main Dashboard (`src/app/dashboard/page.tsx`)
- User-specific dashboard with permission-based widgets
- Role and permission display
- Recent activity and notifications
- Responsive grid layout

#### Admin Dashboard (`src/app/admin/dashboard/page.tsx`)
- Super admin exclusive access
- System-wide statistics and monitoring
- Administrative tools and settings
- System health indicators

### 4. Management Pages

#### User Management (`src/app/users/page.tsx`)
- User listing with search and filtering
- Permission-based action buttons
- Role assignment display
- User status management

#### Role Management (`src/app/roles/page.tsx`)
- Role listing with permission previews
- Role creation and editing capabilities
- Permission group organization
- User count per role

#### Permission Management (`src/app/permissions/page.tsx`)
- Permission listing by groups
- Category-based organization
- Permission descriptions and usage
- Group management interface

#### Company Management (`src/app/companies/page.tsx`)
- Company listing and management
- Industry-based filtering
- User count per company
- Company status tracking

### 5. User Profile (`src/app/profile/page.tsx`)
- Personal information display
- Role and permission overview
- Recent notifications
- Profile editing capabilities

## Permission System

### Permission Structure
The system uses a hierarchical permission structure:

```
- view_dashboard: Access to main dashboard
- view_users: View user management
- create_users: Create new users
- edit_users: Edit user information
- delete_users: Delete users
- view_roles: View role management
- create_roles: Create new roles
- edit_roles: Edit role permissions
- delete_roles: Delete roles
- view_permissions: View permission management
- create_permissions: Create new permissions
- edit_permissions: Edit permission details
- view_companies: View company management
- create_companies: Create new companies
- edit_companies: Edit company information
- delete_companies: Delete companies
- view_orders: View order management
- create_orders: Create new orders
- view_products: View product management
- edit_products: Edit product information
- view_charts: Access to chart components
```

### Super Admin Access
Super admins have unrestricted access to all features and can:
- Access admin dashboard
- Manage all companies
- Override permission restrictions
- Access system settings and logs

## Usage Examples

### Permission-Based Component Rendering
```tsx
import { PermissionGate } from "@/components/Auth/PermissionGate";

<PermissionGate permission="view_users">
  <UserManagementComponent />
</PermissionGate>

<PermissionGate requireSuperAdmin>
  <AdminOnlyComponent />
</PermissionGate>
```

### Permission Checking in Components
```tsx
import { useUser } from "@/components/Auth/user-context";

function MyComponent() {
  const { hasPermission, hasRole, isSuperAdmin } = useUser();
  
  if (hasPermission("edit_users")) {
    // Show edit functionality
  }
  
  if (isSuperAdmin()) {
    // Show super admin features
  }
}
```

### Navigation Filtering
The sidebar automatically filters navigation items based on user permissions. Items without proper permissions are hidden from the navigation.

## Authentication Flow

1. User signs in with company_id, email, and password
2. Backend validates credentials and returns JWT token
3. Frontend stores token and decodes basic user info
4. Frontend fetches full user details including permissions
5. Navigation and components render based on permissions
6. Token refresh handled automatically

## Environment Configuration

Create a `.env.local` file with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Security Considerations

- JWT tokens are stored in localStorage
- Permission checks are performed on both frontend and backend
- Super admin access is clearly indicated in UI
- Sensitive operations require explicit permission checks
- Route protection prevents unauthorized access

## Backend Integration

The frontend integrates with the backend API endpoints:
- `POST /api/auth/login` - User authentication
- `GET /api/auth/current-user` - Get current user details
- `POST /api/auth/refresh` - Token refresh

## Responsive Design

All components are built with responsive design principles:
- Mobile-first approach
- Collapsible sidebar on mobile
- Responsive grid layouts
- Touch-friendly interface elements

## Theme Consistency

The implementation maintains the existing theme:
- Consistent color scheme
- Dark/light mode support
- Typography and spacing consistency
- Icon usage alignment

## Future Enhancements

Potential improvements include:
- Real-time permission updates
- Advanced filtering and search
- Bulk operations for user management
- Audit logging interface
- Permission templates
- Multi-company switching for super admins
