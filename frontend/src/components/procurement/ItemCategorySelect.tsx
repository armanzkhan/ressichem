"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PROCUREMENT_ITEM_CATEGORIES, optionsWithCurrent } from "@/lib/procurementOptions";
import { procurementControlClass } from "./procurement-ui";

const CUSTOM_CATEGORIES_KEY = "procurement_custom_item_categories";
const ADD_NEW_VALUE = "__add_new_category__";

function readCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => String(c || "").trim())
      .filter(Boolean)
      .filter((c, i, arr) => arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i);
  } catch {
    return [];
  }
}

function saveCustomCategory(category: string): string[] {
  const next = category.trim();
  if (!next) return readCustomCategories();
  const existing = readCustomCategories();
  const alreadyKnown =
    (PROCUREMENT_ITEM_CATEGORIES as readonly string[]).some((c) => c.toLowerCase() === next.toLowerCase()) ||
    existing.some((c) => c.toLowerCase() === next.toLowerCase());
  if (alreadyKnown) {
    return optionsWithCurrent(
      [...PROCUREMENT_ITEM_CATEGORIES, ...existing] as string[],
      next
    );
  }
  const updated = [...existing, next];
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
  return [...PROCUREMENT_ITEM_CATEGORIES, ...updated];
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  id?: string;
};

export function ItemCategorySelect({
  value,
  onChange,
  className = `mt-1 ${procurementControlClass}`,
  required,
  id,
}: Props) {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    setCustomCategories(readCustomCategories());
  }, []);

  const options = useMemo(() => {
    const base = [...PROCUREMENT_ITEM_CATEGORIES, ...customCategories];
    const unique = base.filter(
      (c, i, arr) => arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i
    );
    return optionsWithCurrent(unique, value);
  }, [customCategories, value]);

  const commitNewCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    saveCustomCategory(trimmed);
    setCustomCategories(readCustomCategories());
    onChange(trimmed);
    setNewCategory("");
    setAddingNew(false);
  };

  if (addingNew) {
    return (
      <div className="mt-1 space-y-2">
        <input
          id={id}
          autoFocus
          required={required}
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitNewCategory();
            }
            if (e.key === "Escape") {
              setAddingNew(false);
              setNewCategory("");
            }
          }}
          placeholder="Type new category name…"
          className={className.replace(/^mt-1\s*/, "")}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={commitNewCategory}
            disabled={!newCategory.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Add category
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingNew(false);
              setNewCategory("");
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD_NEW_VALUE) {
          setAddingNew(true);
          return;
        }
        onChange(e.target.value);
      }}
      className={className}
    >
      <option value="">{required ? "Select category" : "—"}</option>
      {options.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
      <option value={ADD_NEW_VALUE}>+ Add new category…</option>
    </select>
  );
}
