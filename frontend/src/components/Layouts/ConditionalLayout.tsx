'use client';

import { usePathname } from 'next/navigation';
import { DashboardLayout } from './DashboardLayout';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Avoid flashing the main admin header/search while the route is resolving.
  if (!pathname) {
    return <>{children}</>;
  }

  // Check if this is a customer route (excluding customers management)
  const isCustomerRoute =
    (pathname.startsWith('/customer') && !pathname.startsWith('/customers')) ||
    pathname === '/customer-login' ||
    pathname === '/customer-login-success';

  // QC / Procurement modules have their own dedicated layouts + login
  const isQCRoute = pathname.startsWith('/qc');
  const isProcurementRoute = pathname.startsWith('/procurement');

  if (isCustomerRoute || isQCRoute || isProcurementRoute) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
