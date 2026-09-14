"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { getCountryDialCode } from "@/lib/countryDialCodes";
import { procurementControlClass, procurementLabelClass } from "@/components/procurement/procurement-ui";

type Props = {
  label?: string;
  value: string;
  onChange: (country: string) => void;
  required?: boolean;
  placeholder?: string;
};

const MAX_SUGGESTIONS = 12;

export function CountryCombobox({
  label = "Country",
  value,
  onChange,
  required,
  placeholder = "Type to search country...",
}: Props) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = useRef(false);
  const safeValue = value ?? "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(safeValue);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQuery(safeValue);
  }, [safeValue]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, MAX_SUGGESTIONS);
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const pick = useCallback(
    (country: string) => {
      skipBlurCommitRef.current = true;
      onChange(country);
      setQuery(country);
      setOpen(false);
    },
    [onChange]
  );

  const commitQuery = useCallback(() => {
    const q = query.trim();
    if (!q) {
      onChange("");
      setQuery("");
      return;
    }
    const exact = COUNTRIES.find((c) => c.toLowerCase() === q.toLowerCase());
    if (exact) {
      onChange(exact);
      setQuery(exact);
      return;
    }
    setQuery(safeValue);
  }, [query, safeValue, onChange]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && suggestions[highlight]) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(safeValue);
    }
  };

  return (
    <section ref={wrapRef} className="relative">
      <label htmlFor={id} className={procurementLabelClass}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              setOpen(false);
              return;
            }
            if (!wrapRef.current?.contains(document.activeElement)) {
              commitQuery();
              setOpen(false);
            }
          }, 150);
        }}
        className={`${procurementControlClass} mt-1`}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-[60] left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-blue-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900"
        >
          {suggestions.map((country, i) => (
            <li key={country} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                tabIndex={-1}
                className={[
                  "w-full text-left px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 dark:text-blue-100 dark:hover:bg-slate-800",
                  i === highlight ? "bg-blue-50 font-medium dark:bg-slate-800" : "",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(country)}
              >
                <span>{country}</span>
                {getCountryDialCode(country) ? (
                  <span className="ml-2 text-xs text-blue-500 dark:text-blue-300">{getCountryDialCode(country)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
