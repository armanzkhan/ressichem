"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { procurementControlClass } from "./procurement-ui";

export const ADD_SELECT_OPTION = "__add_new__";

export type SearchableSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /** Keep typed text that is not on the list, so the field can search as well as pick. */
  freeText?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  addLabel = "+ Add new…",
  onAdd,
  className = procurementControlClass,
  required,
  disabled,
  freeText = false,
}: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  useEffect(() => {
    if (selected) setQuery(selected.label);
    else if (freeText) setQuery(value || "");
    else setQuery("");
  }, [selected, value, freeText]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const pick = (nextValue: string) => {
    if (nextValue === ADD_SELECT_OPTION) {
      onAdd?.();
      setOpen(false);
      return;
    }
    onChange(nextValue);
    const opt = options.find((o) => o.value === nextValue);
    setQuery(opt?.label || "");
    setOpen(false);
  };

  const onInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (!freeText) {
      if (!text.trim()) onChange("");
      return;
    }
    const match = options.find((option) => option.label.toLowerCase() === text.trim().toLowerCase());
    onChange(match ? match.value : text);
  };

  const onBlur = () => {
    window.setTimeout(() => {
      const typed = query.trim();
      const match = options.find((o) => o.label.toLowerCase() === typed.toLowerCase());
      if (freeText) {
        onChange(match ? match.value : typed);
        setOpen(false);
        return;
      }
      if (selected) {
        setQuery(selected.label);
      } else if (value && match) {
        onChange(match.value);
      } else {
        setQuery("");
      }
      setOpen(false);
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required && !value}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (open && filtered.length === 1) {
              e.preventDefault();
              pick(filtered[0].value);
            } else if (!freeText) {
              e.preventDefault();
            }
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            setQuery(selected?.label || "");
          }
        }}
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[60] mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-blue-200 bg-white shadow-lg py-1 dark:border-slate-600 dark:bg-slate-900"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-blue-500 dark:text-blue-300">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={[
                    "w-full text-left px-3 py-2 text-sm text-blue-900 hover:bg-blue-50 dark:text-blue-100 dark:hover:bg-slate-800",
                    opt.value === value ? "bg-blue-50 font-medium dark:bg-slate-800" : "",
                  ].join(" ")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
          {onAdd ? (
            <li className="border-t border-blue-200 mt-1 pt-1 dark:border-slate-700">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(ADD_SELECT_OPTION)}
              >
                {addLabel}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
