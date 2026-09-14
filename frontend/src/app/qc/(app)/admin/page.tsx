"use client";

import Link from "next/link";

export default function QCAdminPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QC Admin Dashboard</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a system: <span className="font-semibold">QC Site Area</span> (data entry + approval) or{" "}
          <span className="font-semibold">QC Hub</span> (exports + analytics).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">QC Site Area</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage <span className="font-semibold">Tests</span>, <span className="font-semibold">Standard Criteria</span>, and{" "}
            <span className="font-semibold">Batch Results</span>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" href="/qc/site/standards#tests">
              Tests
            </Link>
            <Link className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" href="/qc/site/standards">
              Standard Criteria
            </Link>
            <Link className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" href="/qc/site/results">
              Results
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">QC Hub</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Centralized datasets for <span className="font-semibold">Power BI</span> and future predictive analytics.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" href="/qc/hub">
              Hub Home
            </Link>
            <Link className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" href="/qc/hub/exports">
              Exports
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white/70 dark:bg-gray-800/70 border border-white/30 dark:border-gray-700/50 shadow p-6">
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">SRS coverage (initial)</h4>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>- Batch-wise result entry + approval workflow (draft → submitted → approved/rejected)</li>
          <li>- Attachments upload for testing summary files</li>
          <li>- Trend data endpoint ready for charts</li>
          <li>- Power BI friendly CSV export (long format)</li>
        </ul>
      </div>
    </div>
  );
}


