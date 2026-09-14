"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AdminDashboardInlineTest() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const bgColor = isDark ? '#1F2937' : '#FFFFFF';
  const secondaryTextColor = isDark ? '#D1D5DB' : '#6B7280';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: textColor,
            marginBottom: '1rem'
          }}>
            Inline Styles Dark Mode Test
          </h1>
          <p style={{ color: secondaryTextColor, marginBottom: '1rem' }}>
            Current theme: <strong>{theme}</strong>
          </p>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Toggle Theme
          </button>
        </div>

        {/* Test the exact admin dashboard structure with inline styles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Admin Header */}
          <div style={{
            border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
            backgroundColor: bgColor,
            borderRadius: '0.375rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.875rem' }}>🛡️</div>
                <h1 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: textColor,
                  margin: 0
                }}>
                  Super Admin Dashboard
                </h1>
              </div>
              <p style={{ 
                color: secondaryTextColor,
                margin: 0,
                fontSize: '0.875rem'
              }}>
                System-wide administration and monitoring tools.
              </p>
            </div>
          </div>

          {/* System Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            <div style={{
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              backgroundColor: bgColor,
              borderRadius: '0.375rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: secondaryTextColor,
                    margin: '0 0 0.5rem 0'
                  }}>
                    Total Companies
                  </p>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: textColor,
                    margin: 0
                  }}>
                    45
                  </p>
                </div>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  🏢
                </div>
              </div>
            </div>

            <div style={{
              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
              backgroundColor: bgColor,
              borderRadius: '0.375rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: secondaryTextColor,
                    margin: '0 0 0.5rem 0'
                  }}>
                    Total Users
                  </p>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: textColor,
                    margin: 0
                  }}>
                    1,234
                  </p>
                </div>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  backgroundColor: isDark ? '#166534' : '#DCFCE7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  👥
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
