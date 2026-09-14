"use client";

import React, { useMemo, useState } from "react";
import { CURRENCIES } from "@/lib/procurementApi";
import { optionsWithCurrent } from "@/lib/procurementOptions";
import { promptNewValue } from "@/lib/promptNewValue";
import { AddableSelect } from "./AddableSelect";
import { procurementControlClass } from "./procurement-ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  addLabel?: string;
};

export function CurrencySelect({
  value,
  onChange,
  className = `mt-1 ${procurementControlClass}`,
  required,
  placeholder,
  addLabel = "+ Add currency…",
}: Props) {
  const [extras, setExtras] = useState<string[]>([]);
  const merged = useMemo(
    () => optionsWithCurrent([...CURRENCIES, ...extras], value),
    [extras, value]
  );

  const handleAdd = () => {
    const next = promptNewValue("currency code (e.g. AED)");
    if (!next) return;
    const code = next.toUpperCase();
    setExtras((prev) => (prev.includes(code) ? prev : [...prev, code]));
    onChange(code);
  };

  return (
    <AddableSelect
      required={required}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      addLabel={addLabel}
      onAdd={handleAdd}
      options={merged.map((c) => ({ value: c, label: c }))}
    />
  );
}
