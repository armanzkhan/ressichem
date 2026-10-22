"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { rawMaterialApi } from "@/lib/qcApi";
import {
  HUB_RM_TESTS,
  hubRmTestsForCategory,
  normalizeSievePassing,
  sievePassingEntries,
  SIEVE_ANALYSIS_ROWS,
} from "@/lib/qcHubDryMortarSrs";

function formatEntry(entry: any, code: string): string {
  if (entry === undefined || entry === null) return "—";
  if (typeof entry === "object") {
    if (entry.value === undefined || entry.value === null || String(entry.value).trim() === "") {
      return "—";
    }
    const unit = entry.unit || HUB_RM_TESTS.find((t) => t.code === code)?.unit || "";
    return `${entry.value}${unit ? ` ${unit}` : ""}`;
  }
  const s = String(entry).trim();
  return s || "—";
}

function formatTestValue(batch: any, code: string): string {
  return formatEntry(batch?.coa?.testResults?.[code], code);
}

function formatSpecValue(material: any, code: string): string {
  return formatEntry(material?.specifications?.[code], code);
}

export default function HubRawMaterialDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [material, setMaterial] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const [matRes, batchRes] = await Promise.all([
          rawMaterialApi.getById(id),
          rawMaterialApi.getBatches(id),
        ]);
        if (cancelled) return;
        setMaterial(matRes.data || null);
        setBatches(batchRes.data || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load raw material");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const tests = useMemo(
    () => hubRmTestsForCategory(material?.category),
    [material?.category]
  );

  if (loading) {
    return <div className="py-8 text-sm text-gray-500">Loading raw material…</div>;
  }

  if (error || !material) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Raw material not found"}
        </div>
        <Link href="/qc/hub/raw-materials" className="text-blue-600 hover:underline text-sm">
          ← Back to Raw Materials
        </Link>
      </div>
    );
  }

  const supplier = material.supplier || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/qc/hub/raw-materials" className="text-sm text-blue-600 hover:underline">
            ← Back to Raw Materials
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {material.materialName}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{material.materialCode}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            material.isActive !== false
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {material.isActive !== false ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/80 dark:bg-gray-800/80 shadow p-6">
        <h2 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-4">Material details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Category</div>
            <div className="font-semibold">{material.category || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Unit</div>
            <div className="font-semibold">{material.unit || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Description</div>
            <div className="font-semibold">{material.description || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Supplier</div>
            <div className="font-semibold">{supplier.supplierName || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Supplier contact</div>
            <div className="font-semibold">{supplier.contactPerson || supplier.contact || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Notes</div>
            <div className="font-semibold">{material.notes || "—"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/80 dark:bg-gray-800/80 shadow p-6">
        <h2 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-4">
          QC Parameters ({material.category || "—"})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {tests.map((t) => (
            <div key={t.code}>
              <div className="text-xs text-gray-500">
                {t.name}
                {t.unit ? ` (${t.unit})` : ""}
              </div>
              <div className="font-semibold">{formatSpecValue(material, t.code)}</div>
            </div>
          ))}
          {!tests.length && (
            <div className="text-gray-500">No QC parameters for this category.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white/80 dark:bg-gray-800/80 shadow p-6">
        <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-4">
          Sieve Analysis
        </h2>
        {(() => {
          const map = normalizeSievePassing(material.specifications?.sieveAnalysisPassing);
          const extras = sievePassingEntries(map).filter(
            (r) =>
              !SIEVE_ANALYSIS_ROWS.some((pair) => pair.left === r.size || pair.right === r.size)
          );
          return (
            <>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">Sieve Size</th>
                    <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">% Passing</th>
                    <th className="w-3 border-l border-gray-100 dark:border-gray-700" aria-hidden />
                    <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">Sieve Size</th>
                    <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">% Passing</th>
                  </tr>
                </thead>
                <tbody>
                  {SIEVE_ANALYSIS_ROWS.map(({ left, right }) => (
                    <tr key={`${left}-${right}`} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-1.5 font-mono font-semibold">{left}</td>
                      <td className="px-2 py-1.5">{map[left] || "—"}</td>
                      <td className="border-l border-gray-100 dark:border-gray-700" aria-hidden />
                      <td className="px-2 py-1.5 font-mono font-semibold">{right}</td>
                      <td className="px-2 py-1.5">{map[right] || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {extras.length > 0 ? (
                <table className="mt-4 min-w-[280px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">Extra size</th>
                      <th className="px-2 py-1 text-left text-xs uppercase text-gray-500">% Passing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map(({ size, percentPassing }) => (
                      <tr key={size} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-2 py-1.5 font-mono font-semibold">{size}</td>
                        <td className="px-2 py-1.5">{percentPassing || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </>
          );
        })()}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/80 dark:bg-gray-800/80 shadow overflow-x-auto">
        <div className="px-6 py-4 border-b border-blue-50 dark:border-gray-700">
          <h2 className="text-sm font-bold text-blue-800 dark:text-blue-300">
            Batches &amp; test results ({batches.length})
          </h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-blue-50 dark:bg-blue-900/20">
            <tr>
              <th className="px-3 py-2 text-left">Batch No</th>
              <th className="px-3 py-2 text-left">Qty</th>
              {tests.map((t) => (
                <th key={t.code} className="px-3 py-2 text-left whitespace-nowrap">
                  {t.name}
                  {t.unit ? ` (${t.unit})` : ""}
                </th>
              ))}
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch._id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-2 font-mono font-semibold">{batch.batchNo}</td>
                <td className="px-3 py-2">
                  {batch.quantity} {batch.unit}
                </td>
                {tests.map((t) => (
                  <td key={t.code} className="px-3 py-2">
                    {formatTestValue(batch, t.code)}
                  </td>
                ))}
                <td className="px-3 py-2">{batch.status || "—"}</td>
              </tr>
            ))}
            {!batches.length && (
              <tr>
                <td colSpan={3 + tests.length} className="px-3 py-8 text-center text-gray-500">
                  No batches for this material yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
