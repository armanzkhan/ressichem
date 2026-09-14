import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        url: "/dashboard",
        items: [],
        permission: null, // Everyone can view dashboard
      },
      {
        title: "Messages",
        icon: Icons.Alphabet,
        url: "/messages",
        items: [],
        permission: null,
      },
      {
        title: "User Management",
        icon: Icons.User,
        items: [
          {
            title: "Users",
            url: "/users",
            permission: "users.read",
          },
          {
            title: "Roles",
            url: "/roles",
            permission: "roles.read",
          },
          {
            title: "Permissions",
            url: "/permissions",
            permission: "permissions.read",
          },
        ],
        permission: "users.read",
      },
      {
        title: "Companies",
        url: "/companies",
        icon: Icons.HomeIcon,
        items: [],
        permission: "view_companies",
        requireSuperAdmin: true,
      },
      {
        title: "Customer Management",
        icon: Icons.User,
        items: [
          {
            title: "All Customers",
            url: "/customers",
            permission: "customers.read",
          },
          {
            title: "Add Customer",
            url: "/customers/create",
            permission: "customers.create",
          },
          {
            title: "Customer Ledger",
            url: "/customer-ledger",
            permission: null, // No permission requirement
          },
        ],
        permission: null, // Temporarily remove permission requirement to debug
      },
      {
        title: "Orders",
        url: "/orders",
        icon: Icons.Table,
        items: [],
        permission: "orders.read",
      },
      {
        title: "Invoices",
        url: "/invoices",
        icon: Icons.Table,
        items: [],
        permission: "invoices.read",
      },
      {
        title: "Products",
        url: "/products",
        icon: Icons.Table,
        items: [],
        permission: "products.read",
      },
      {
        title: "Manager Dashboard",
        url: "/manager-dashboard",
        icon: Icons.User,
        items: [],
        permission: null, // Show for managers only
        requireManager: true, // Custom property for manager check
      },
      {
        title: "Category Management",
        icon: Icons.Table,
        items: [
          {
            title: "My Categories",
            url: "/manager-dashboard",
            permission: null,
            requireManager: true,
          },
          {
            title: "Category Orders",
            url: "/manager-dashboard?tab=orders",
            permission: null,
            requireManager: true,
          },
          {
            title: "Category Products",
            url: "/manager-dashboard?tab=products",
            permission: null,
            requireManager: true,
          },
          {
            title: "Category Reports",
            url: "/manager-dashboard?tab=reports",
            permission: null,
            requireManager: true,
          },
        ],
        permission: null,
        requireManager: true,
      },
      {
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
        items: [],
        permission: null, // Everyone can view their profile
      },
    ],
  },
  {
    label: "COMPANY ADMIN",
    items: [
      {
        title: "Company Dashboard",
        icon: Icons.PieChart,
        url: "/company-dashboard",
        items: [],
        requireCompanyAdmin: true,
      },
      {
        title: "Company Users",
        icon: Icons.User,
        items: [
          {
            title: "All Users",
            url: "/users",
            permission: "users.read",
          },
          {
            title: "Create User",
            url: "/users/create",
            permission: "users.create",
          },
          {
            title: "User Roles",
            url: "/roles",
            permission: "roles.read",
          },
        ],
        permission: "users.read",
        requireCompanyAdmin: true,
      },
      {
        title: "Company Customers",
        icon: Icons.User,
        items: [
          {
            title: "All Customers",
            url: "/customers",
            permission: "customers.read",
          },
          {
            title: "Create Customer",
            url: "/customers/create",
            permission: "customers.create",
          },
        ],
        permission: "customers.read",
        requireCompanyAdmin: true,
      },
      {
        title: "Company Managers",
        icon: Icons.User,
        items: [
          {
            title: "All Managers",
            url: "/managers",
            permission: "managers.read",
          },
          {
            title: "Create Manager",
            url: "/managers/create",
            permission: "managers.create",
          },
          {
            title: "Assign Categories",
            url: "/categories",
            permission: "categories.read",
          },
        ],
        permission: "managers.read",
        requireCompanyAdmin: true,
      },
      {
        title: "Company Products",
        icon: Icons.Table,
        items: [
          {
            title: "All Products",
            url: "/products",
            permission: "products.read",
          },
          {
            title: "Create Product",
            url: "/products/create",
            permission: "products.create",
          },
          {
            title: "Product Categories",
            url: "/products/categories",
            permission: "categories.read",
          },
        ],
        permission: "products.read",
        requireCompanyAdmin: true,
      },
      {
        title: "Company Orders",
        icon: Icons.Table,
        items: [
          {
            title: "All Orders",
            url: "/orders",
            permission: "orders.read",
          },
          {
            title: "Order Reports",
            url: "/orders/reports",
            permission: "orders.read",
          },
        ],
        permission: "orders.read",
        requireCompanyAdmin: true,
      },
      {
        title: "Company Invoices",
        icon: Icons.Table,
        items: [
          {
            title: "All Invoices",
            url: "/invoices",
            permission: "invoices.read",
          },
          {
            title: "Invoice Reports",
            url: "/invoices/reports",
            permission: "invoices.read",
          },
        ],
        permission: "invoices.read",
        requireCompanyAdmin: true,
      },
    ],
  },
  {
    label: "ADMIN",
    items: [
      {
        title: "Admin Dashboard",
        icon: Icons.PieChart,
        url: "/admin-dashboard",
        items: [],
        requireSuperAdmin: true,
      },
      {
        title: "Manager Management",
        icon: Icons.User,
        items: [
          {
            title: "All Managers",
            url: "/managers",
            permission: "view_managers",
          },
          {
            title: "Assign Categories",
            url: "/managers?action=assign",
            permission: "assign_categories",
          },
          {
            title: "Manager Reports",
            url: "/managers?tab=reports",
            permission: "view_managers",
          },
        ],
        permission: "view_managers",
      },
      {
        title: "System Settings",
        icon: Icons.FourCircle,
        items: [
          {
            title: "Notification Settings",
            url: "/admin/notifications",
            requireSuperAdmin: true,
          },
          {
            title: "Push Settings",
            url: "/admin/push-settings",
            requireSuperAdmin: true,
          },
          {
            title: "Test Push",
            url: "/admin/test-push",
            requireSuperAdmin: true,
          },
          {
            title: "System Logs",
            url: "/admin/logs",
            requireSuperAdmin: true,
          },
        ],
        requireSuperAdmin: true,
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Charts",
        icon: Icons.PieChart,
        items: [
          {
            title: "Basic Chart",
            url: "/charts/basic-chart",
            permission: "view_charts",
          },
        ],
        permission: "view_charts",
      },
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          {
            title: "Alerts",
            url: "/ui-elements/alerts",
          },
          {
            title: "Buttons",
            url: "/ui-elements/buttons",
          },
        ],
      },
      {
        title: "Settings",
        icon: Icons.FourCircle,
        url: "/pages/settings",
        items: [],
        permission: null,
      },
    ],
  },
];
