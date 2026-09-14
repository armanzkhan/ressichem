"use client";

import React from "react";
import { procurementControlClass } from "./procurement-ui";

export const ADD_SELECT_OPTION = "__add_new__";

export type AddableSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: AddableSelectOption[];
  placeholder?: string;
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

export function AddableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  addLabel = "+ Add new…",
  onAdd,
  className = procurementControlClass,
  required,
  disabled,
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === ADD_SELECT_OPTION) {
      onAdd?.();
      return;
    }
    onChange(next);
  };

  return (
    <select
      required={required}
      disabled={disabled}
      className={className}
      value={value}
      onChange={handleChange}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {onAdd ? (
        <option value={ADD_SELECT_OPTION} className="font-medium text-blue-700">
          {addLabel}
        </option>
      ) : null}
    </select>
  );
}
