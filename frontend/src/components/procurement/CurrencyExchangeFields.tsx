"use client";

import React, { useEffect, useRef, useState } from "react";
import { PROCUREMENT_BASE_CURRENCY, procurementApi } from "@/lib/procurementApi";
import { CurrencySelect } from "./CurrencySelect";
import { procurementControlClass, procurementLabelClass } from "./procurement-ui";

type Props = {
  currency: string;
  exchangeRate: string;
  onCurrencyChange: (currency: string) => void;
  onExchangeRateChange: (rate: string) => void;
  baseCurrency?: string;
};

export function CurrencyExchangeFields({
  currency,
  exchangeRate,
  onCurrencyChange,
  onExchangeRateChange,
  baseCurrency = PROCUREMENT_BASE_CURRENCY,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [fetchError, setFetchError] = useState("");
  const onRateChangeRef = useRef(onExchangeRateChange);
  onRateChangeRef.current = onExchangeRateChange;

  const fetchRate = async (curr: string) => {
    if (curr === baseCurrency) {
      onRateChangeRef.current("1");
      setHint(`1 ${curr} = 1 ${baseCurrency} (document currency)`);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const res = await procurementApi.getExchangeRate(curr, baseCurrency);
      const rate = res.data?.rate ?? 1;
      onRateChangeRef.current(String(rate));
      setHint(`${res.data?.label || ""} · ${res.data?.date || "today"}`);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Could not fetch rate");
      setHint("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate(currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when currency/base changes
  }, [currency, baseCurrency]);

  return (
    <>
      <label className={procurementLabelClass}>
        Currency
        <CurrencySelect value={currency} onChange={onCurrencyChange} />
      </label>
      <label className={procurementLabelClass}>
        Exchange rate
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            step="0.000001"
            min={0}
            className={`flex-1 ${procurementControlClass}`}
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            title="Refresh live rate"
            className="px-2 py-2 rounded-lg border border-blue-200 text-xs text-blue-700 shrink-0 hover:bg-blue-50 disabled:opacity-50"
            disabled={loading}
            onClick={() => fetchRate(currency)}
          >
            {loading ? "…" : "↻"}
          </button>
        </div>
        {hint ? <span className="text-xs text-blue-600 mt-1 block">{hint}</span> : null}
        {fetchError ? <span className="text-xs text-amber-600 mt-1 block">{fetchError} — enter rate manually.</span> : null}
      </label>
    </>
  );
}
