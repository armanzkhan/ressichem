"use client";

import { QC_MODULES } from "@/lib/qcHubDryMortarSrs";

function fmtDate(d?: string | Date) {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
}

function moduleLabel(key?: string) {
  if (!key) return "—";
  return QC_MODULES[key]?.label || key.replace(/_/g, " ");
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    s === "approved" || s === "closed" || s === "pass" || s === "valid" || s === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : s === "rejected" || s === "fail" || s === "critical" || s === "open"
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        : s === "submitted" || s === "in_progress" || s === "due_soon"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${cls}`}>{status || "—"}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

function StatCards({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-xl border bg-white/80 dark:bg-gray-800/80 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function TableWrap({ children, empty }: { children: React.ReactNode; empty?: string }) {
  return (
    <div className="rounded-xl border overflow-x-auto bg-white/80 dark:bg-gray-800/80 shadow-sm">
      <table className="min-w-full text-sm">{children}</table>
      {empty && (
        <p className="px-4 py-6 text-center text-gray-500 text-sm">{empty}</p>
      )}
    </div>
  );
}

function ParamsCell({ params }: { params?: Record<string, unknown> }) {
  if (!params || !Object.keys(params).length) return <span className="text-gray-400">—</span>;
  return (
    <ul className="text-xs space-y-0.5 max-w-xs">
      {Object.entries(params).slice(0, 4).map(([k, v]) => (
        <li key={k}>
          <span className="text-gray-500">{k.replace(/([A-Z])/g, " $1").trim()}:</span>{" "}
          <span className="font-medium">{String(v)}</span>
        </li>
      ))}
      {Object.keys(params).length > 4 && (
        <li className="text-gray-400">+{Object.keys(params).length - 4} more…</li>
      )}
    </ul>
  );
}

type Props = { type: string; data: any };

export function HubReportView({ type, data }: Props) {
  if (!data) return null;

  if (type === "qc-summary") {
    const byProduct = data.byProduct || [];
    const records = data.records || [];
    const approved = records.filter((r: any) => r.status === "approved").length;
    return (
      <div className="space-y-6">
        <StatCards
          items={[
            { label: "Total batches", value: records.length },
            { label: "Approved", value: approved },
            { label: "Products tracked", value: byProduct.length },
            { label: "Approval rate", value: records.length ? `${Math.round((approved / records.length) * 100)}%` : "—" },
          ]}
        />
        <Section title="Summary by product">
          <TableWrap empty={byProduct.length ? undefined : "No batch data yet."}>
            {byProduct.length > 0 && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Module</th>
                    <th className="px-3 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-left font-semibold">Grade</th>
                    <th className="px-3 py-2 text-left font-semibold">Total</th>
                    <th className="px-3 py-2 text-left font-semibold">Approved</th>
                    <th className="px-3 py-2 text-left font-semibold">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((p: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2">{moduleLabel(p.module)}</td>
                      <td className="px-3 py-2">{p.productName}</td>
                      <td className="px-3 py-2">{p.grade || "—"}</td>
                      <td className="px-3 py-2">{p.total}</td>
                      <td className="px-3 py-2 text-green-700">{p.approved}</td>
                      <td className="px-3 py-2 text-red-700">{p.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
        </Section>
        <Section title="Recent batch records">
          <TableWrap empty={records.length ? undefined : "No records."}>
            {records.length > 0 && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Batch</th>
                    <th className="px-3 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-left font-semibold">Module</th>
                    <th className="px-3 py-2 text-left font-semibold">Test date</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Key results</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 50).map((r: any) => (
                    <tr key={r._id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 font-mono text-xs">{r.batchNo}</td>
                      <td className="px-3 py-2">{r.productName}</td>
                      <td className="px-3 py-2">{moduleLabel(r.module)}</td>
                      <td className="px-3 py-2">{fmtDate(r.testDate)}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2"><ParamsCell params={r.parameters} /></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
          {records.length > 50 && <p className="text-xs text-gray-500">Showing first 50 of {records.length} records.</p>}
        </Section>
      </div>
    );
  }

  if (type === "qa-audit") {
    const { audits = [], ncrs = [], capas = [], summary = {} } = data;
    return (
      <div className="space-y-6">
        <StatCards
          items={[
            { label: "Internal audits", value: summary.totalAudits ?? audits.length },
            { label: "Open findings", value: summary.openFindings ?? 0 },
            { label: "NCRs on file", value: ncrs.length },
            { label: "CAPAs on file", value: capas.length },
          ]}
        />
        <Section title="Internal audit reports">
          <TableWrap empty={audits.length ? undefined : "No audit reports."}>
            {audits.length > 0 && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Audit no.</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Auditor</th>
                    <th className="px-3 py-2 text-left">Findings</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a: any) => (
                    <tr key={a._id} className="border-t">
                      <td className="px-3 py-2">{a.auditNo}</td>
                      <td className="px-3 py-2">{a.title}</td>
                      <td className="px-3 py-2">{fmtDate(a.auditDate)}</td>
                      <td className="px-3 py-2">{a.auditor || "—"}</td>
                      <td className="px-3 py-2">{(a.findings || []).length}</td>
                      <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
        </Section>
        <Section title="Non-conformance reports (NCR)">
          <SimpleList rows={ncrs} cols={[
            { key: "ncrNo", label: "NCR no." },
            { key: "title", label: "Title" },
            { key: "severity", label: "Severity" },
            { key: "relatedBatchNo", label: "Batch" },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
        <Section title="CAPA records">
          <SimpleList rows={capas} cols={[
            { key: "capaNo", label: "CAPA no." },
            { key: "title", label: "Title" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
      </div>
    );
  }

  if (type === "raw-material") {
    const batches = data.batches || [];
    const suppliers = data.supplierPerformance || [];
    return (
      <div className="space-y-6">
        <StatCards items={[
          { label: "RM batches", value: batches.length },
          { label: "Suppliers", value: suppliers.length },
        ]} />
        <Section title="Supplier performance">
          <SimpleList rows={suppliers} cols={[
            { key: "supplier", label: "Supplier" },
            { key: "total", label: "Total batches" },
            { key: "approved", label: "Accepted" },
            { key: "rejected", label: "Rejected" },
          ]} />
        </Section>
        <Section title="Raw material batches">
          <TableWrap empty={batches.length ? undefined : "No raw material batches."}>
            {batches.length > 0 && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Material</th>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-left">Received</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">QC result</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.slice(0, 50).map((b: any) => (
                    <tr key={b._id} className="border-t">
                      <td className="px-3 py-2">{b.rawMaterial?.materialName || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.batchNo}</td>
                      <td className="px-3 py-2">{fmtDate(b.receiptDate)}</td>
                      <td className="px-3 py-2">{b.quantity} {b.unit || ""}</td>
                      <td className="px-3 py-2"><StatusBadge status={b.qcTestResult} /></td>
                      <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
        </Section>
      </div>
    );
  }

  if (type === "packaging") {
    const rows = Array.isArray(data) ? data : [];
    return (
      <Section title="Packaging material inspections">
        <StatCards items={[{ label: "Inspection records", value: rows.length }]} />
        <div className="mt-4">
          <SimpleList rows={rows} cols={[
            { key: "materialType", label: "Type" },
            { key: "materialName", label: "Name" },
            { key: "batchNo", label: "Batch" },
            { key: "supplier", label: "Supplier" },
            { key: "testDate", label: "Test date", date: true },
            { key: "status", label: "Status", badge: true },
          ]} />
        </div>
      </Section>
    );
  }

  if (type === "rnd-trials") {
    const rows = Array.isArray(data) ? data : [];
    return (
      <Section title="R&D trial history">
        <StatCards items={[{ label: "Experiments", value: rows.length }]} />
        <div className="mt-4">
          <SimpleList rows={rows} cols={[
            { key: "experimentCode", label: "Code" },
            { key: "experimentName", label: "Name" },
            { key: "targetProduct", label: "Target product" },
            { key: "productType", label: "Type" },
            { key: "trials", label: "Trials", render: (r: any) => (r.trials || []).length },
            { key: "status", label: "Status", badge: true },
          ]} />
        </div>
      </Section>
    );
  }

  if (type === "product-comparison") {
    const records = data.records || [];
    return (
      <div className="space-y-4">
        <StatCards items={[
          { label: "Product", value: records[0]?.productName || "—" },
          { label: "Batches compared", value: data.comparisonCount ?? records.length },
          { label: "Formulations", value: (data.formulations || []).length },
        ]} />
        <Section title="Batch comparison">
          <TableWrap empty={records.length ? undefined : "No batches found for this product."}>
            {records.length > 0 && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-left">Test date</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Test parameters</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r._id} className="border-t align-top">
                      <td className="px-3 py-2 font-mono">{r.batchNo}</td>
                      <td className="px-3 py-2">{fmtDate(r.testDate)}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2">
                        <ul className="text-xs space-y-1">
                          {Object.entries(r.parameters || {}).map(([k, v]) => (
                            <li key={k}><span className="text-gray-500">{k}:</span> {String(v)}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </TableWrap>
        </Section>
      </div>
    );
  }

  if (type === "traceability") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-sky-50 dark:bg-sky-900/20 p-4">
          <p className="text-sm"><strong>Batch traceability report:</strong> {data.batchNo}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Links QC batches, lab forms, complaints, NCRs and CAPAs for this batch number.</p>
        </div>
        <Section title="QC batch records">
          <SimpleList rows={data.batchRecords || []} cols={[
            { key: "productName", label: "Product" },
            { key: "module", label: "Module", render: (r: any) => moduleLabel(r.module) },
            { key: "testDate", label: "Test date", date: true },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
        <Section title="Raw data forms">
          <SimpleList rows={data.rawDataForms || []} cols={[
            { key: "formType", label: "Form type" },
            { key: "productType", label: "Product type" },
            { key: "testDate", label: "Test date", date: true },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
        <Section title="Customer complaints">
          <SimpleList rows={data.complaints || []} cols={[
            { key: "complaintNo", label: "Complaint no." },
            { key: "title", label: "Title" },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
        <Section title="NCRs">
          <SimpleList rows={data.ncrs || []} cols={[
            { key: "ncrNo", label: "NCR no." },
            { key: "title", label: "Title" },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
        <Section title="CAPAs">
          <SimpleList rows={data.capas || []} cols={[
            { key: "capaNo", label: "CAPA no." },
            { key: "title", label: "Title" },
            { key: "status", label: "Status", badge: true },
          ]} />
        </Section>
      </div>
    );
  }

  return <p className="text-sm text-gray-500">Unknown report type.</p>;
}

type Col = {
  key: string;
  label: string;
  badge?: boolean;
  date?: boolean;
  render?: (row: any) => React.ReactNode;
};

function SimpleList({ rows, cols }: { rows: any[]; cols: Col[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 py-4">No records found.</p>;
  }
  return (
    <TableWrap>
      <thead className="bg-gray-50 dark:bg-gray-900/50">
        <tr>
          {cols.map((c) => (
            <th key={c.key} className="px-3 py-2 text-left font-semibold">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row._id || i} className="border-t border-gray-100 dark:border-gray-700">
            {cols.map((c) => (
              <td key={c.key} className="px-3 py-2">
                {c.render
                  ? c.render(row)
                  : c.badge
                    ? <StatusBadge status={row[c.key]} />
                    : c.date
                      ? fmtDate(row[c.key])
                      : row[c.key] ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
