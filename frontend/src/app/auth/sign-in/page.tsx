import Signin from "@/components/Auth/Signin";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggleSwitch } from "@/components/Layouts/header/theme-toggle";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignIn() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] dark:opacity-20"></div>
      
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <ThemeToggleSwitch />
      </div>
      
      <div className="w-full max-w-6xl relative z-10">
        <div className="rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:bg-gray-800/80 dark:border-gray-700/20">
          <div className="flex flex-col lg:flex-row items-center min-h-[500px] sm:min-h-[600px]">
            {/* Sign-in Form */}
            <div className="w-full lg:w-1/2">
              <div className="w-full p-4 sm:p-6 lg:p-8 xl:p-12">
                <Signin />
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/qc/site-login"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-200 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-900/30"
                  >
                    QC Site Login
                  </Link>
                  <Link
                    href="/qc/hub-login"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-200 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-900/30"
                  >
                    QC Hub Login
                  </Link>
                </div>
                <div className="mt-3">
                  <Link
                    href="/procurement/login"
                    className="w-full inline-flex items-center justify-center rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-200 hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-900/30"
                  >
                    Procurement System Login
                  </Link>
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Secure & Encrypted
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-blue-900 dark:text-blue-300">
                  Choose QC Site or QC Hub. Admin/users can sign in above.
                </p>
              </div>
            </div>

            {/* Welcome Section - Hidden on mobile, shown on lg+ */}
            <div className="hidden w-full p-6 sm:p-8 lg:block lg:w-1/2">
              <div className="relative overflow-hidden rounded-2xl h-full flex flex-col justify-center px-8 py-12 bg-blue-900">
                
                <div className="relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-bold text-orange-500 mb-4">About Ressichem</h1>

                  <p className="text-white leading-relaxed mb-4">
                    Ressichem was established in 1999, since its inception over a decade ago, we are proud to cater to the needs of the construction and many other industries offering quality products manufactured at our state-of-the-art plant sourced from the best in the world. Raw materials for our products are also sourced from quality suppliers worldwide. Ressichem takes pride presenting a variety of construction materials and systems which can cater to many needs of the construction industry.
                  </p>
                  <p className="text-white leading-relaxed">
                    Backed by a fully equipped laboratory at our own premises with a team of qualified engineers and chemists. Ressichem carries our regular tests to maintain quality of finished products for various construction and industrial applications. Vigorous onsite support and quality systems allow for maintaining the quality of our products, as well as solve construction and industrial problems.
                  </p>
                </div>
                {/* Removed secondary image to avoid double overlay/blur */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
