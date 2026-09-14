"use client";

import React, { useCallback, useEffect, useState } from "react";
import { procurementApi, type ProcurementGrn } from "@/lib/procurementApi";
import { Alert, LoadingText, PageShell, StatusBadge, Table } from "@/components/procurement/procurement-ui";
import { pageTitle, purchaseTypeForSection } from "@/lib/procurementScope";
import { formatProcurementAmount } from "@/lib/procurementMoney";

type Props = { section: "local" | "import" };

export function GrnView({ section }: Props) {
  const [rows, setRows] = useState<ProcurementGrn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await procurementApi.listGrn({ purchaseType: purchaseTypeForSection(section) });
      setRows(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchase receipts");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell
      title={pageTitle(section, "grn")}
      summary="Purchase receipts posted when goods arrive against an issued PO (full or partial)."
    >
      {error ? <Alert message={error} /> : null}
      {loading ? (
        <LoadingText />
      ) : (
        <Table
          headers={["Receipt #", "PO #", "Supplier", "Date", "Status", "Lines", "Value"]}
          rows={rows.map((r) => {
            const po =
              typeof r.purchaseOrder === "object" && r.purchaseOrder
                ? r.purchaseOrder.poNumber || "—"
                : "—";
            const supplier =
              typeof r.supplier === "object" && r.supplier ? r.supplier.name || "—" : "—";
            const value = (r.items || []).reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0);
            return [
              r.grnNumber,
              po,
              supplier,
              r.receiptDate ? new Date(r.receiptDate).toLocaleDateString() : "—",
              <StatusBadge key={`st-${r._id}`} status={r.status || "posted"} />,
              String((r.items || []).length),
              formatProcurementAmount(value),
            ];
          })}
        />
      )}
    </PageShell>
  );
}
