"use client";

import { useState } from "react";
import {
  SIEVE_ANALYSIS_ROWS,
  SIEVE_ANALYSIS_SIZES,
  isFixedSieveSize,
  type SievePassingMap,
} from "@/lib/qcHubDryMortarSrs";

type ExtraRow = { id: string; size: string; passing: string };

type Props = {
  values: SievePassingMap;
  onChange: (next: SievePassingMap) => void;
  disabled?: boolean;
  className?: string;
};

function extrasFromValues(values: SievePassingMap): ExtraRow[] {
  return Object.keys(values)
    .filter((k) => k && !isFixedSieveSize(k) && !k.startsWith("__"))
    .map((size) => ({
      id: `extra-${size}`,
      size,
      passing: values[size] || "",
    }));
}

function buildMap(base: SievePassingMap, extras: ExtraRow[]): SievePassingMap {
  const next: SievePassingMap = {};
  for (const size of SIEVE_ANALYSIS_SIZES) {
    next[size] = base[size] ?? "";
  }
  for (const row of extras) {
    const label = row.size.trim();
    if (!label) continue;
    next[label] = row.passing;
  }
  return next;
}

function PassingInput({
  size,
  value,
  disabled,
  onChange,
}: {
  size: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      step="any"
      min={0}
      max={100}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      placeholder="% Passing"
      aria-label={`% Passing for ${size}`}
    />
  );
}

/**
 * Sieve Analysis in the lab-sheet pattern: two columns (coarse | fine) + optional custom sizes.
 */
export function SieveAnalysisSection({ values, onChange, disabled, className }: Props) {
  const [extras, setExtras] = useState<ExtraRow[]>(() => extrasFromValues(values));

  const setFixedPassing = (size: string, passing: string) => {
    onChange(buildMap({ ...values, [size]: passing }, extras));
  };

  const updateExtra = (id: string, patch: Partial<ExtraRow>) => {
    const nextExtras = extras.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setExtras(nextExtras);
    onChange(buildMap(values, nextExtras));
  };

  const removeExtra = (id: string) => {
    const nextExtras = extras.filter((r) => r.id !== id);
    setExtras(nextExtras);
    onChange(buildMap(values, nextExtras));
  };

  const addExtra = () => {
    setExtras((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        size: "",
        passing: "",
      },
    ]);
  };

  return (
    <div
      className={
        className ||
        "rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Sieve Analysis
          </h4>
          <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 mt-0.5">
            Enter % Passing for each sieve size (same layout as the lab sheet)
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addExtra}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:bg-gray-900 dark:border-emerald-700 dark:text-emerald-200"
          >
            + Add sieve size
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-emerald-200 dark:border-emerald-800">
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                Sieve Size
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                % Passing
              </th>
              <th className="px-2 py-2 w-3 border-l border-emerald-200 dark:border-emerald-800" aria-hidden />
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                Sieve Size
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                % Passing
              </th>
            </tr>
          </thead>
          <tbody>
            {SIEVE_ANALYSIS_ROWS.map(({ left, right }) => (
              <tr key={`${left}-${right}`} className="border-t border-emerald-100 dark:border-emerald-900/40">
                <td className="px-2 py-1.5 font-mono font-semibold whitespace-nowrap">{left}</td>
                <td className="px-2 py-1.5 min-w-[7rem]">
                  <PassingInput
                    size={left}
                    value={values[left] ?? ""}
                    disabled={disabled}
                    onChange={(v) => setFixedPassing(left, v)}
                  />
                </td>
                <td className="border-l border-emerald-100 dark:border-emerald-900/40" aria-hidden />
                <td className="px-2 py-1.5 font-mono font-semibold whitespace-nowrap">{right}</td>
                <td className="px-2 py-1.5 min-w-[7rem]">
                  <PassingInput
                    size={right}
                    value={values[right] ?? ""}
                    disabled={disabled}
                    onChange={(v) => setFixedPassing(right, v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {extras.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Additional sieve sizes</p>
          <table className="min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-emerald-200 dark:border-emerald-800">
                <th className="px-2 py-1.5 text-left text-xs uppercase text-gray-500 dark:text-gray-300">Sieve Size</th>
                <th className="px-2 py-1.5 text-left text-xs uppercase text-gray-500 dark:text-gray-300">% Passing</th>
                <th className="px-2 py-1.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {extras.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-emerald-100 dark:border-emerald-900/40 bg-white/50 dark:bg-gray-900/20"
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      disabled={disabled}
                      value={row.size}
                      onChange={(e) => updateExtra(row.id, { size: e.target.value })}
                      className="w-full max-w-[160px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      placeholder="e.g. 4.00 mm"
                      aria-label="Custom sieve size"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <PassingInput
                      size={row.size || "custom sieve"}
                      value={row.passing}
                      disabled={disabled}
                      onChange={(v) => updateExtra(row.id, { passing: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeExtra(row.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!disabled && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addExtra}
            className="px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 bg-white/80 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:bg-gray-900 dark:border-emerald-700 dark:text-emerald-200"
          >
            + Add sieve size
          </button>
        </div>
      )}
    </div>
  );
}
