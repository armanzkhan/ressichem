import Image from "next/image";

export default function LogoTestPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Logo Display Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Test 1: Original SVG */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Original SVG</h2>
            <Image
              src="/images/logo/logo.svg"
              alt="Original Logo"
              width={174}
              height={30}
              className="border border-gray-300"
            />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Fixed black text</p>
          </div>

          {/* Test 2: Responsive SVG */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Responsive SVG</h2>
            <Image
              src="/images/logo/logo-responsive.svg"
              alt="Responsive Logo"
              width={174}
              height={30}
              className="border border-gray-300 text-gray-800 dark:text-white"
            />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Uses currentColor for theme support</p>
          </div>

          {/* Test 3: Different Backgrounds */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Light Background</h2>
            <div className="space-y-4">
              <div className="p-4 bg-white border">
                <Image
                  src="/images/logo/logo-responsive.svg"
                  alt="Logo on White"
                  width={174}
                  height={30}
                  className="text-gray-800"
                />
              </div>
              <div className="p-4 bg-gray-100 border">
                <Image
                  src="/images/logo/logo-responsive.svg"
                  alt="Logo on Gray"
                  width={174}
                  height={30}
                  className="text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Test 4: Dark Backgrounds */}
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-white">Dark Background</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 border border-gray-600">
                <Image
                  src="/images/logo/logo-responsive.svg"
                  alt="Logo on Dark"
                  width={174}
                  height={30}
                  className="text-white"
                />
              </div>
              <div className="p-4 bg-gray-900 border border-gray-600">
                <Image
                  src="/images/logo/logo-responsive.svg"
                  alt="Logo on Darker"
                  width={174}
                  height={30}
                  className="text-white"
                />
              </div>
            </div>
          </div>

          {/* Test 5: Logo Component */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Logo Component</h2>
            <div className="border border-gray-300 p-4">
              {/* This would be the actual Logo component */}
              <div className="relative h-8 max-w-[10.847rem]">
                <img
                  src="/images/logo/logo-responsive.svg"
                  width={174}
                  height={30}
                  className="h-8 w-auto text-gray-800 dark:text-white"
                  alt="Ressichem logo"
                  role="presentation"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">As used in sidebar and header</p>
          </div>

          {/* Test 6: File Information */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">File Information</h2>
            <div className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
              <p><strong>Original SVG:</strong> /images/logo/logo.svg</p>
              <p><strong>Responsive SVG:</strong> /images/logo/logo-responsive.svg</p>
              <p><strong>PNG File:</strong> /images/logo/logo.png (5.8KB)</p>
              <p><strong>Dimensions:</strong> 174x30px</p>
              <p><strong>Text Color:</strong> Fixed black (#1F2937) or currentColor</p>
              <p><strong>Icon Color:</strong> Primary blue (#5750F1)</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">Logo Status</h3>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>✅ <strong>Fixed:</strong> Changed white text to black (#1F2937)</p>
            <p>✅ <strong>Responsive:</strong> Created version with currentColor for theme support</p>
            <p>✅ <strong>Updated Components:</strong> Logo, Header, Sign-in page</p>
            <p>✅ <strong>Theme Support:</strong> Works in both light and dark modes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
