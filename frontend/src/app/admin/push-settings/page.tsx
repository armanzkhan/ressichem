"use client";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { PushNotificationPermission } from "@/components/Notifications/PushNotificationPermission";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Settings, Smartphone, Monitor, Tablet } from "lucide-react";
import { useState, useEffect } from "react";

export default function PushSettingsPage() {
  const [pushService, setPushService] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMounted(true);
    import("@/services/pushNotificationService").then((module) => {
      const PushNotificationService = module.default;
      setPushService(PushNotificationService.getInstance());
    }).catch((error) => {
      console.error('Failed to load push notification service:', error);
    });
  }, []);

  useEffect(() => {
    if (!pushService || !mounted) return;
    
    const checkSupport = () => {
      const supported = pushService.isPushSupported();
      setIsSupported(supported);
      
      if (supported) {
        const info = pushService.getSubscriptionInfo();
        setSubscriptionInfo(info);
      }
    };

    checkSupport();
  }, [pushService, mounted]);

  const handlePermissionChange = (granted: boolean) => {
    if (!pushService || !mounted) return;
    
    if (granted) {
      const info = pushService.getSubscriptionInfo();
      setSubscriptionInfo(info);
    } else {
      setSubscriptionInfo(null);
    }
  };

  return (
    <ProtectedRoute>
      <PermissionGate permission="notifications:manage">
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          <Breadcrumb pageName="Push Notification Settings" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Push Notification Permission */}
            <div className="lg:col-span-2">
              <PushNotificationPermission 
                onPermissionGranted={() => handlePermissionChange(true)}
                onPermissionDenied={() => handlePermissionChange(false)}
              />
            </div>

            {/* Device Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Support
                </CardTitle>
                <CardDescription>
                  Check which devices and browsers support push notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Desktop */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4" />
                      <span className="text-sm font-medium">Desktop</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>✅ Chrome</div>
                      <div>✅ Firefox</div>
                      <div>✅ Edge</div>
                      <div>✅ Safari</div>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">Mobile</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>✅ Chrome</div>
                      <div>✅ Firefox</div>
                      <div>✅ Safari</div>
                      <div>⚠️ Edge</div>
                    </div>
                  </div>

                  {/* Tablet */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tablet className="h-4 w-4" />
                      <span className="text-sm font-medium">Tablet</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div>✅ Chrome</div>
                      <div>✅ Safari</div>
                      <div>✅ Firefox</div>
                    </div>
                  </div>
                </div>

                {/* Support Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium">Current Browser Support</span>
                  <span className={`text-sm ${isSupported ? 'text-green-600' : 'text-red-600'}`}>
                    {isSupported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Subscription Information
                </CardTitle>
                <CardDescription>
                  View your current push notification subscription details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionInfo && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div>Endpoint: {subscriptionInfo.endpoint.substring(0, 50)}...</div>
                      <div>P256DH Key: {subscriptionInfo.keys.p256dh.substring(0, 20)}...</div>
                      <div>Auth Key: {subscriptionInfo.keys.auth.substring(0, 20)}...</div>
                    </div>
                  </div>
                )}
                {!subscriptionInfo && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-400">
                    No active subscription. Enable push notifications to subscribe.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGate>
    </ProtectedRoute>
  );
}
