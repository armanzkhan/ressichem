"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { procurementApi, type ProcurementSupplier } from "@/lib/procurementApi";
import { SupplierFormModal, emptySupplierForm, supplierRecordToForm } from "@/components/procurement/SupplierFormModal";
import { BulkImportModal } from "@/components/procurement/BulkImportModal";
import { Alert, LoadingText, PageShell, ProcurementSearchInput, Table } from "@/components/procurement/procurement-ui";
import {
  filterSuppliersBySection,
  pageTitle,
} from "@/lib/procurementScope";
import { recordTotalWithUniqueNames } from "@/lib/procurementRecordSummary";

type Props = { section: "local" | "import" };

function supplierMatchesQuery(supplier: ProcurementSupplier, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    supplier.supplierCode,
    supplier.name,
    supplier.companyName,
    supplier.contactName,
    supplier.email,
    supplier.mobile,
    supplier.phone,
    supplier.city,
    supplier.country,
    supplier.countryCode,
    supplier.phoneDialCode,
  ]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");
  return haystack.includes(q);
}

export function SuppliersView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementSupplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const [formInitial, setFormInitial] = useState(emptySupplierForm(section));
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Load full catalog, then filter by local/import section client-side.
      // Searching is also client-side so results stay within this section and
      // the table does not flash "Loading..." on every keystroke.
      const res = await procurementApi.listSuppliers();
      setRows(filterSuppliersBySection(res.data || [], section));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    setSearch("");
    void load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((r) => supplierMatchesQuery(r, search)),
    [rows, search]
  );

  const openCreate = () => {
    setEditingId(null);
    setEditingCode("");
    setFormInitial(emptySupplierForm(section));
    setShowForm(true);
  };

  const openSupplier = (supplier: ProcurementSupplier) => {
    setEditingId(supplier._id);
    setEditingCode(supplier.supplierCode);
    setFormInitial(supplierRecordToForm(supplier, section));
    setShowForm(true);
  };

  return (
    <PageShell
      title={pageTitle(section, "suppliers")}
      summary={
        loading
          ? undefined
          : recordTotalWithUniqueNames(
              filteredRows,
              "supplier",
              "suppliers",
              Boolean(search.trim())
            )
      }
      onBulkImport={() => setShowBulkImport(true)}
      onAdd={openCreate}
    >
      {error ? <Alert message={error} /> : null}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
        <label className="flex-1 min-w-0 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Search suppliers
          </span>
          <ProcurementSearchInput
            placeholder="Code, name, company, contact, email, phone, country…"
            value={search}
            onChange={setSearch}
            className="max-w-none"
          />
        </label>
        {search.trim() ? (
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline dark:text-blue-300 sm:mb-2"
            onClick={() => setSearch("")}
          >
            Clear
          </button>
        ) : null}
      </div>
      {loading ? (
        <LoadingText />
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-blue-600 dark:text-blue-300">
          {search.trim()
            ? `No ${section} suppliers match “${search.trim()}”.`
            : `No ${section} suppliers yet.`}
        </p>
      ) : (
        <Table
          onRowClick={(index) => openSupplier(filteredRows[index])}
          headers={
            section === "local"
              ? ["Code", "Supplier name", "Contact person", "Country", "Lead time", ""]
              : ["Code", "Supplier name", "Company", "Contact person", "Country", "Lead time", ""]
          }
          rows={filteredRows.map((r) => {
            const base = [
              r.supplierCode,
              r.name,
              ...(section === "import" ? [r.companyName || "—"] : []),
              r.contactName || r.email || "—",
              r.country
                ? `${r.country}${r.phoneDialCode ? ` (${r.phoneDialCode})` : r.countryCode ? ` (${r.countryCode})` : ""}`
                : "—",
              r.leadTimeDays ? `${r.leadTimeDays} days` : "—",
              <span key={r._id} className="flex gap-2">
                <button
                  type="button"
                  className="text-blue-600 text-xs dark:text-blue-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSupplier(r);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-red-600 text-xs"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm("Deactivate this supplier?")) return;
                    try {
                      await procurementApi.deleteSupplier(r._id);
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Delete failed");
                    }
                  }}
                >
                  Deactivate
                </button>
              </span>,
            ];
            return base;
          })}
        />
      )}
      {showForm ? (
        <SupplierFormModal
          section={section}
          editingId={editingId}
          editingCode={editingCode}
          initialForm={formInitial}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            await load();
          }}
        />
      ) : null}
      <BulkImportModal
        entity="suppliers"
        section={section}
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={load}
      />
    </PageShell>
  );
}
