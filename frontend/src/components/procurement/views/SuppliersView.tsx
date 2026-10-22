"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { procurementApi, type ProcurementSupplier } from "@/lib/procurementApi";
import { SupplierFormModal, emptySupplierForm, supplierRecordToForm } from "@/components/procurement/SupplierFormModal";
import { BulkImportModal } from "@/components/procurement/BulkImportModal";
import { Alert, LoadingText, PageShell, ProcurementSearchBar, Table } from "@/components/procurement/procurement-ui";
import {
  filterSuppliersBySection,
  pageTitle,
} from "@/lib/procurementScope";
import { recordTotalWithUniqueNames } from "@/lib/procurementRecordSummary";
import { canProcurementSoftDelete } from "@/lib/procurementAccess";

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
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    setCanDelete(canProcurementSoftDelete());
  }, []);
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
      <ProcurementSearchBar
        label="Search suppliers"
        placeholder="Code, name, contact, email, phone…"
        value={search}
        onChange={setSearch}
        onClear={() => setSearch("")}
      />
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
                {canDelete ? (
                  <button
                    type="button"
                    className="text-red-600 text-xs dark:text-red-300"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Deactivate this supplier? (soft delete)")) return;
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
                ) : null}
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
