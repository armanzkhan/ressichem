"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZRS_MATERIALS, type ZrsMaterial } from "@/data/zrsMaterials";

function norm(value: string) {
  return value.trim().toLowerCase();
}

function matches(item: ZrsMaterial, query: string) {
  if (!query) return true;
  const name = item.name.toLowerCase();
  const code = item.code.toLowerCase();
  const digits = code.replace(/^[^0-9]+/, "");
  return name.includes(query) || code.includes(query) || (digits.length > 0 && digits.includes(query));
}

export function MaterialPicker({
  name,
  code,
  items = ZRS_MATERIALS,
  extras = [],
  onChange,
}: {
  name: string;
  code: string;
  items?: ZrsMaterial[];
  extras?: ZrsMaterial[];
  onChange: (next: ZrsMaterial) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(name);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState({ top: 0, left: 0, width: 280, maxHeight: 240 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQuery(name);
  }, [name, open]);

  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const all: ZrsMaterial[] = [];
    for (const item of [...extras, ...items]) {
      const key = `${norm(item.name)}|${norm(item.code)}`;
      if (!item.name || seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
    return all;
  }, [extras, items]);

  const q = query.trim().toLowerCase();
  const matchesList = useMemo(() => {
    const found = catalog.filter((item) => matches(item, q));
    found.sort((a, b) => {
      const rank = (item: ZrsMaterial) => {
        const itemName = item.name.toLowerCase();
        const itemCode = item.code.toLowerCase();
        if (itemCode === q || itemName === q) return 0;
        if (itemCode.startsWith(q) || itemName.startsWith(q)) return 1;
        return 2;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
    return q ? found.slice(0, 50) : found.slice(0, 40);
  }, [catalog, q]);

  const exact = catalog.some((item) => norm(item.name) === q);
  const canAdd = q.length > 0 && !exact;
  const optionCount = matchesList.length + (canAdd ? 1 : 0);

  const place = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const maxHeight = Math.max(140, Math.min(280, spaceBelow));
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
    setBox({ top: rect.bottom + 2, left, width, maxHeight });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  const choose = (item: ZrsMaterial) => {
    onChange({ name: item.name, code: item.code });
    setQuery(item.name);
    setOpen(false);
  };

  const addNew = () => {
    const next = query.trim().replace(/\s+/g, " ");
    if (!next) return;
    onChange({ name: next, code: "" });
    setOpen(false);
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(name);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, Math.max(optionCount - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (canAdd && active >= matchesList.length) addNew();
      else if (matchesList[active]) choose(matchesList[active]);
      else if (canAdd) addNew();
    }
  };

  return (
    <div ref={anchorRef} className="relative">
      <input
        className="w-full bg-transparent px-1 py-0.5 text-sm outline-none"
        value={open ? query : name}
        placeholder="Search name or code"
        title={code ? `${name} (${code})` : "Search by material name or item code"}
        onFocus={() => {
          setQuery(name);
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {!open && code ? <div className="px-1 pb-0.5 text-[10px] leading-none text-slate-500">{code}</div> : null}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              className="fixed z-[80] overflow-auto rounded border border-slate-400 bg-white text-left text-sm text-slate-950 shadow-lg"
              style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
            >
              <p className="sticky top-0 border-b border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                Search by material name or item code
              </p>
              {matchesList.map((item, index) => (
                <button
                  key={`${item.code}|${item.name}`}
                  type="button"
                  className={`block w-full px-2 py-1 text-left ${index === active ? "bg-blue-100" : "hover:bg-slate-100"}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(item);
                  }}
                >
                  <span className="block">{item.name}</span>
                  {item.code ? <span className="block text-[11px] text-slate-500">{item.code}</span> : <span className="block text-[11px] text-slate-400">No code</span>}
                </button>
              ))}
              {matchesList.length === 0 && !canAdd ? <p className="px-2 py-1 text-slate-500">No materials</p> : null}
              {canAdd ? (
                <button
                  type="button"
                  className={`block w-full border-t border-slate-200 px-2 py-1 text-left text-blue-800 ${active >= matchesList.length ? "bg-blue-100" : "hover:bg-slate-100"}`}
                  onMouseEnter={() => setActive(matchesList.length)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addNew();
                  }}
                >
                  Add “{query.trim()}” as a new material
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
