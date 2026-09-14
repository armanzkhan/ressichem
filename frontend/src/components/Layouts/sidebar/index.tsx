"use client";

import { cn } from "@/lib/utils";
import { useUser } from "@/components/Auth/user-context";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { ArrowLeftIcon, ChevronUp, LogoutIcon } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const { user, hasPermission, isSuperAdmin, isCompanyAdmin, isManager, isCustomer, logout } = useUser();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleLogout = () => {
    logout();
    // Close sidebar on mobile after logout
    if (isMobile) {
      toggleSidebar();
    }
    // Redirect to login page
    window.location.href = '/auth/sign-in';
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));

    // Uncomment the following line to enable multiple expanded items
    // setExpandedItems((prev) =>
    //   prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    // );
  };

  // Filter navigation items based on permissions
  const filterNavItems = (items: any[]) => {
    return items.filter((item) => {
      // Hide "Company Customers" completely
      if (item.title === "Company Customers") {
        return false;
      }

      // Hide "Customer Management" when user is a customer
      if (item.title === "Customer Management" && isCustomer()) {
        return false;
      }

      // Debug logging (only when user is loaded)
      if (item.title === "Customer Management" && user) {
        console.log('🔍 Customer Management menu item check:');
        console.log('  - Permission required:', item.permission);
        console.log('  - User permissions:', user.permissions || []);
        console.log('  - Has permission:', item.permission ? hasPermission(item.permission) : 'N/A');
        console.log('  - Is super admin:', isSuperAdmin());
        console.log('  - Is company admin:', isCompanyAdmin());
        console.log('  - Is manager:', isManager());
      }

      // Check if item requires super admin
      if (item.requireSuperAdmin && !isSuperAdmin()) {
        return false;
      }

      // Check if item requires company admin
      if (item.requireCompanyAdmin && !isCompanyAdmin()) {
        return false;
      }

      // Check if item requires manager
      if (item.requireManager && !isManager()) {
        return false;
      }

      // Check if item has permission requirement
      if (item.permission && !hasPermission(item.permission)) {
        console.log(`❌ Item "${item.title}" filtered out due to missing permission: ${item.permission}`);
        return false;
      }

      // Filter sub-items if they exist
      if (item.items && item.items.length > 0) {
        const filteredSubItems = item.items.filter((subItem: any) => {
          // Hide "Customer Ledger" when user is a customer
          if (subItem.title === "Customer Ledger" && isCustomer()) {
            return false;
          }

          if (subItem.requireSuperAdmin && !isSuperAdmin()) {
            return false;
          }
          if (subItem.requireCompanyAdmin && !isCompanyAdmin()) {
            return false;
          }
          if (subItem.requireManager && !isManager()) {
            return false;
          }
          if (subItem.permission && !hasPermission(subItem.permission)) {
            return false;
          }
          return true;
        });

        // Only show parent item if it has visible sub-items or no permission requirement
        // But allow it if user has the parent permission even if no sub-items are visible
        if (filteredSubItems.length === 0 && item.permission && !hasPermission(item.permission)) {
          return false;
        }

        // Update the item with filtered sub-items
        item.items = filteredSubItems;
      }

      return true;
    });
  };

  useEffect(() => {
    // Keep collapsible open, when it's subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }

            // Break the loop
            return true;
          }
        });
      });
    });
  }, [pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "max-w-[280px] overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl border-r border-white/30 dark:border-gray-700/50 transition-all duration-300 ease-in-out",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-full" : "w-0",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col py-4 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 gap-2">
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className="flex items-center justify-center flex-1 py-3 px-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 group"
            >
              <Image
                src="/images/logo/logo.png"
                alt="Logo"
                width={200}
                height={70}
                priority
                className="object-contain h-14 sm:h-16 md:h-20 w-auto max-w-full drop-shadow-md dark:drop-shadow-none group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
              >
                <span className="sr-only">Close Menu</span>
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            {NAV_DATA.map((section) => {
              const filteredItems = filterNavItems(section.items);
              
              // Don't render section if no items are visible
              if (filteredItems.length === 0) {
                return null;
              }

              return (
                <div key={section.label} className="mb-6">
                  <h2 className="mb-4 text-xs font-semibold text-blue-900 border-t border-blue-900 border-b border-blue-900 dark:text-blue-400 uppercase tracking-wider">
                    {section.label}
                  </h2>

                  <nav role="navigation" aria-label={section.label}>
                    <ul className="space-y-1">
                      {filteredItems.map((item) => (
                        <li key={item.title}>
                          {item.items && item.items.length > 0 ? (
                            <div>
                              <MenuItem
                                isActive={item.items.some(
                                  ({ url }: { url: string }) => url === pathname,
                                )}
                                onClick={() => toggleExpanded(item.title)}
                              >
                                <item.icon
                                  className="w-5 h-5 shrink-0"
                                  aria-hidden="true"
                                />

                                <span>{item.title}</span>

                                <ChevronUp
                                  className={cn(
                                    "ml-auto rotate-180 transition-transform duration-200",
                                    expandedItems.includes(item.title) &&
                                      "rotate-0",
                                  )}
                                  aria-hidden="true"
                                />
                              </MenuItem>

                              {expandedItems.includes(item.title) && (
                                <ul
                                  className="ml-6 mr-0 space-y-1 pb-2 pr-0 pt-2"
                                  role="menu"
                                >
                                  {item.items.map((subItem: any) => (
                                    <li key={subItem.title} role="none">
                                      <MenuItem
                                        as="link"
                                        href={subItem.url}
                                        isActive={pathname === subItem.url}
                                      >
                                        <span>{subItem.title}</span>
                                      </MenuItem>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const href =
                                "url" in item
                                  ? item.url + ""
                                  : "/" +
                                    item.title.toLowerCase().split(" ").join("-");

                              return (
                                <MenuItem
                                  className="flex items-center gap-3"
                                  as="link"
                                  href={href}
                                  isActive={pathname === href}
                                >
                                  <item.icon
                                    className="w-5 h-5 shrink-0"
                                    aria-hidden="true"
                                  />

                                  <span>{item.title}</span>
                                </MenuItem>
                              );
                            })()
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              );
            })}
          </div>

          {/* Logout Section */}
          <div className="mt-auto pt-4 border-t border-blue-900 dark:border-gray-700">
            <nav role="navigation" aria-label="Account actions">
              <ul className="space-y-1">
                <li>
                  <MenuItem
                    as="button"
                    onClick={handleLogout}
                    isActive={false}
                    className="flex items-center gap-3 w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <LogoutIcon
                      className="w-5 h-5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Logout</span>
                  </MenuItem>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
