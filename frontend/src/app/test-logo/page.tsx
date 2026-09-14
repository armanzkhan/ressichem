"use client";

import Image from "next/image";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function TestLogoPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Logo Display Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Test 1: Basic Image */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 1: Basic Image</h2>
            <Image
              src="/images/logo/logo.png"
              alt="Logo Test"
              width={200}
              height={60}
              className="border border-gray-300"
            />
            <p className="mt-2 text-sm text-gray-600">Path: /images/logo/logo.png</p>
          </div>

          {/* Test 2: With Fill */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 2: With Fill</h2>
            <div className="relative w-[200px] h-[60px] border border-gray-300">
              <Image
                src="/images/logo/logo.png"
                alt="Logo Test Fill"
                fill
                className="object-contain"
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">Using fill with object-contain</p>
          </div>

          {/* Test 3: Different Sizes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 3: Different Sizes</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-1">Small (100x30):</p>
                <Image
                  src="/images/logo/logo.png"
                  alt="Logo Small"
                  width={100}
                  height={30}
                  className="border border-gray-300"
                />
              </div>
              <div>
                <p className="text-sm mb-1">Medium (150x45):</p>
                <Image
                  src="/images/logo/logo.png"
                  alt="Logo Medium"
                  width={150}
                  height={45}
                  className="border border-gray-300"
                />
              </div>
              <div>
                <p className="text-sm mb-1">Large (200x60):</p>
                <Image
                  src="/images/logo/logo.png"
                  alt="Logo Large"
                  width={200}
                  height={60}
                  className="border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Test 4: Error Handling */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 4: Error Handling</h2>
            <Image
              src="/images/logo/logo.png"
              alt="Logo with Error Handling"
              width={200}
              height={60}
              className="border border-gray-300"
              onError={(e) => {
                console.error('Logo failed to load:', e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML += '<p class="text-red-500">❌ Logo failed to load</p>';
              }}
              onLoad={() => {
                console.log('✅ Logo loaded successfully');
              }}
            />
            <p className="mt-2 text-sm text-gray-600">Check browser console for load status</p>
          </div>

          {/* Test 5: Alternative Paths */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 5: Alternative Paths</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-1">Direct public path:</p>
                <Image
                  src="/images/logo/logo.png"
                  alt="Direct Path"
                  width={150}
                  height={45}
                  className="border border-gray-300"
                />
              </div>
              <div>
                <p className="text-sm mb-1">With priority loading:</p>
                <Image
                  src="/images/logo/logo.png"
                  alt="Priority Load"
                  width={150}
                  height={45}
                  priority
                  className="border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Test 6: File Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test 6: File Information</h2>
            <div className="text-sm space-y-2">
              <p><strong>File Path:</strong> /images/logo/logo.png</p>
              <p><strong>Physical Path:</strong> public/images/logo/logo.png</p>
              <p><strong>File Size:</strong> 5.8KB</p>
              <p><strong>Last Modified:</strong> 10/17/2025 9:54:12 AM</p>
              <p><strong>Next.js Version:</strong> 15.1.6</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Debugging Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Check browser console for any 404 errors</li>
            <li>Verify the file exists at public/images/logo/logo.png</li>
            <li>Check if the file is a valid PNG image</li>
            <li>Try hard refresh (Ctrl+F5) to clear cache</li>
            <li>Check Network tab in browser dev tools</li>
            <li>Verify Next.js is serving static files correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
