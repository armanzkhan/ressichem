"use client";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { PermissionGate } from "@/components/Auth/PermissionGate";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function TestPushPage() {
  const [pushService, setPushService] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
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
  const [permissionState, setPermissionState] = useState<{
    granted: boolean;
    denied: boolean;
    default: boolean;
  }>({ granted: false, denied: false, default: false });
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    if (!pushService || !mounted) return;
    
    const checkState = () => {
      const supported = pushService.isPushSupported();
      const permission = pushService.getPermissionState();
      const info = pushService.getSubscriptionInfo();
      
      setIsSupported(supported);
      setPermissionState(permission);
      setSubscriptionInfo(info);
    };

    checkState();
  }, [pushService, mounted]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleRequestPermission = async () => {
    if (!pushService || !mounted) return;
    setIsLoading(true);
    addTestResult("Requesting push notification permission...");
    
    try {
      const granted = await pushService.requestPermission();
      
      if (granted) {
        addTestResult("✅ Permission granted successfully");
        const initialized = await pushService.initialize();
        
        if (initialized) {
          addTestResult("✅ Push notifications initialized successfully");
          setPermissionState({ granted: true, denied: false, default: false });
          const info = pushService.getSubscriptionInfo();
          setSubscriptionInfo(info);
        } else {
          addTestResult("❌ Failed to initialize push notifications");
        }
      } else {
        addTestResult("❌ Permission denied");
        setPermissionState({ granted: false, denied: true, default: false });
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!pushService || !mounted) return;
    addTestResult("Sending test notification...");
    
    try {
      await pushService.showTestNotification();
      addTestResult("✅ Test notification sent successfully");
    } catch (error) {
      addTestResult(`❌ Error sending test notification: ${error}`);
    }
  };

  const handleInitialize = async () => {
    if (!pushService || !mounted) return;
    setIsLoading(true);
    addTestResult("Initializing push notification service...");
    
    try {
      const success = await pushService.initialize();
      
      if (success) {
        addTestResult("✅ Push notification service initialized successfully");
        const info = pushService.getSubscriptionInfo();
        setSubscriptionInfo(info);
      } else {
        addTestResult("❌ Failed to initialize push notification service");
      }
    } catch (error) {
      addTestResult(`❌ Error initializing service: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!isSupported) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    if (permissionState.granted) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (permissionState.denied) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!isSupported) {
      return 'Not Supported';
    }
    
    if (permissionState.granted) {
      return 'Enabled';
    }
    
    if (permissionState.denied) {
      return 'Denied';
    }
    
    return 'Not Requested';
  };

  return (
    <ProtectedRoute>
      <PermissionGate permission="notifications:manage">
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
          <Breadcrumb pageName="Test Push Notifications" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Push Notification Status
                </CardTitle>
                <CardDescription>
                  Current status of push notifications in your browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm font-medium">{getStatusText()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Browser Support:</span>
                    <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
                      {isSupported ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Service Worker:</span>
                    <span className={typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'text-green-600' : 'text-red-600'}>
                      {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Push Manager:</span>
                    <span className={typeof window !== 'undefined' && 'PushManager' in window ? 'text-green-600' : 'text-red-600'}>
                      {typeof window !== 'undefined' && 'PushManager' in window ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>

                {subscriptionInfo && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Subscription Info:</h4>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Endpoint: {subscriptionInfo.endpoint.substring(0, 50)}...</div>
                      <div>P256DH: {subscriptionInfo.keys.p256dh.substring(0, 20)}...</div>
                      <div>Auth: {subscriptionInfo.keys.auth.substring(0, 20)}...</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Test Actions</CardTitle>
                <CardDescription>
                  Test push notification functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button
                    onClick={handleRequestPermission}
                    disabled={isLoading || !isSupported}
                    className="w-full"
                    size="sm"
                  >
                    {isLoading ? "Requesting..." : "Request Permission"}
                  </Button>
                  
                  <Button
                    onClick={handleInitialize}
                    disabled={isLoading || !isSupported}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Initialize Service
                  </Button>
                  
                  <Button
                    onClick={handleTestNotification}
                    disabled={!permissionState.granted}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Send Test Notification
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Real-time test results and logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {testResults.length === 0 ? (
                    <p className="text-sm text-gray-500">No test results yet. Click a test button above to start.</p>
                  ) : (
                    <div className="space-y-1">
                      {testResults.map((result, index) => (
                        <div key={`test-result-${index}-${result.substring(0, 20)}`} className="text-sm font-mono">
                          {result}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGate>
    </ProtectedRoute>
  );
}
