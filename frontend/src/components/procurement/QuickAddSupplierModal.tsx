"use client";

import React from "react";
import type { ProcurementSupplier } from "@/lib/procurementApi";
import { SupplierFormModal } from "./SupplierFormModal";

type Props = {
  section: "local" | "import";
  onClose: () => void;
  onCreated: (supplier: ProcurementSupplier) => void;
  /** Export PFI / shipment flows create buyers stored as suppliers. */
  purpose?: "supplier" | "customer";
};

/** Opens the full supplier form (same as Local/Import → Suppliers page). */
export function QuickAddSupplierModal({ section, onClose, onCreated, purpose = "supplier" }: Props) {
  const isCustomer = purpose === "customer";
  return (
    <SupplierFormModal
      section={section}
      stacked
      title={isCustomer ? "Add customer" : undefined}
      onClose={onClose}
      onSaved={onCreated}
    />
  );
}
