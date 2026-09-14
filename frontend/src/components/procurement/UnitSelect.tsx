"use client";

import React, { useMemo, useState } from "react";
import { DEFAULT_ITEM_UNIT, ITEM_UNITS, optionsWithCurrent } from "@/lib/procurementOptions";
import { promptNewValue } from "@/lib/promptNewValue";
import { AddableSelect } from "./AddableSelect";
import { procurementControlClass } from "./procurement-ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  allowEmpty?: boolean;
  id?: string;
};

export function UnitSelect({
  value,
  onChange,
  className = procurementControlClass,
  required,
  allowEmpty = true,
  id,
}: Props) {
  const [extras, setExtras] = useState<string[]>([]);
  const merged = useMemo(
    () => optionsWithCurrent([...ITEM_UNITS, ...extras], value),
    [extras, value]
  );

  const handleAdd = () => {
    const next = promptNewValue("unit");
    if (!next) return;
    setExtras((prev) => (prev.includes(next) ? prev : [...prev, next]));
    onChange(next);
  };

  return (
    <AddableSelect
      required={required}
      className={className}
      value={value}
      onChange={onChange}
      placeholder={allowEmpty ? "Select unit" : undefined}
      addLabel="+ Add unit…"
      onAdd={handleAdd}
      options={merged.map((u) => ({ value: u, label: u }))}
    />
  );
}

export { DEFAULT_ITEM_UNIT };
