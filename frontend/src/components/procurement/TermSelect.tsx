"use client";

import React, { useMemo, useState } from "react";
import { optionsWithCurrent } from "@/lib/procurementOptions";
import { promptNewValue } from "@/lib/promptNewValue";
import { AddableSelect } from "./AddableSelect";
import { procurementControlClass } from "./procurement-ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  addLabel?: string;
  className?: string;
  required?: boolean;
  /** When true, only show the provided options (no out-of-scope saved values or custom adds). */
  scopedOnly?: boolean;
  allowAdd?: boolean;
};

export function TermSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  addLabel = "+ Add…",
  className = procurementControlClass,
  required,
  scopedOnly = false,
  allowAdd = true,
}: Props) {
  const [extras, setExtras] = useState<string[]>([]);
  const merged = useMemo(() => {
    // scopedOnly without add: presets only (no stray saved/custom values)
    if (scopedOnly && !allowAdd) return [...options];
    // allowAdd (e.g. import suppliers): presets + session custom terms + current value
    return optionsWithCurrent([...options, ...extras], value);
  }, [options, extras, value, scopedOnly, allowAdd]);

  const handleAdd = () => {
    const next = promptNewValue(placeholder.replace(/^Select\s/i, "").replace(/…$/, "") || "value");
    if (!next) return;
    setExtras((prev) => (prev.includes(next) ? prev : [...prev, next]));
    onChange(next);
  };

  return (
    <AddableSelect
      required={required}
      className={className}
      value={scopedOnly && !allowAdd && value && !merged.includes(value) ? "" : value}
      onChange={onChange}
      placeholder={placeholder}
      addLabel={addLabel}
      onAdd={allowAdd ? handleAdd : undefined}
      options={merged.map((o) => ({ value: o, label: o }))}
    />
  );
}
