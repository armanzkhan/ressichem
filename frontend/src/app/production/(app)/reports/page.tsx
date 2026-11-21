"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, type ProductionDepartment, type ProductionFactory } from "@/lib/productionApi";
import { procurementPanelClass } from "@/components/procurement/procurementTheme";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ManagementReportsPage() {
  const [rows, setRows] = useState<
    { _id: { department: ProductionDepartment; factory: ProductionFactory }; outputKg: number; plannedQtyKg: number; wastageKg: number; rejectedKg: number; pendingQc: number; count: number }[]
  >([]);

  useEffect(() => {
    productionApi.summary().then((res) => setRows(res.data || [])).catch(() => setRows([]));
  }, []);

  const factories: ProductionFactory[] = ["hub", "site", "lahore"];
  const router = useRouter();
  const factoryBars = factories.map((factory) => ({
    name: FACTORY_LABEL[factory],
    Output: rows.filter((row) => row._id.factory === factory).reduce((sum, row) => sum + row.outputKg, 0),
  }));
  const departmentBars = rows
    .map((row) => ({
      name: `${FACTORY_LABEL[row._id.factory]} ${DEPARTMENT_META[row._id.department]?.short || row._id.department}`,
      Output: row.outputKg,
    }))
    .sort((a, b) => b.Output - a.Output);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Management reports</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Consolidated and factory-wise output, planned versus actual, wastage, and laboratory approvals still pending.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {factories.map((factory) => {
          const mine = rows.filter((row) => row._id.factory === factory);
          const output = mine.reduce((sum, row) => sum + row.outputKg, 0);
          const planned = mine.reduce((sum, row) => sum + row.plannedQtyKg, 0);
          const waste = mine.reduce((sum, row) => sum + row.wastageKg, 0);
          const pending = mine.reduce((sum, row) => sum + row.pendingQc, 0);
          return (
            <article key={factory} className={`${procurementPanelClass} p-4`}>
              <h3 className="font-semibold text-blue-950 dark:text-blue-50">{FACTORY_LABEL[factory]}</h3>
              <p className="mt-2 text-sm text-blue-800 dark:text-blue-100">Output {output.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG</p>
              <p className="text-sm text-blue-800 dark:text-blue-100">Planned {planned.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG</p>
              <p className="text-sm text-blue-800 dark:text-blue-100">Wastage {waste.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG</p>
              <p className="text-sm text-blue-800 dark:text-blue-100">Pending QC {pending}</p>
            </article>
          );
        })}
      </div>
      {rows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${procurementPanelClass} p-3`}>
            <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">Output by factory</h3>
            <div className="h-64 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factoryBars}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Output" fill="#1d4ed8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className={`${procurementPanelClass} p-3`}>
            <h3 className="mb-2 text-sm font-semibold text-blue-950 dark:text-blue-50">Output by department</h3>
            <div className="overflow-hidden" style={{ height: Math.max(220, departmentBars.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentBars} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="Output" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      ) : null}
      <div className={procurementPanelClass}>
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-blue-50 text-xs uppercase text-blue-800 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">Factory</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Output KG</th>
              <th className="px-3 py-2">Planned KG</th>
              <th className="px-3 py-2">Rejected KG</th>
              <th className="px-3 py-2">Wastage KG</th>
              <th className="px-3 py-2">Pending QC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row._id.factory}-${row._id.department}`}
                className="cursor-pointer border-t border-blue-100 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
                onClick={() => router.push(`/production/${row._id.department}`)}
              >
                <td className="break-words px-3 py-2">{FACTORY_LABEL[row._id.factory]}</td>
                <td className="break-words px-3 py-2">{DEPARTMENT_META[row._id.department]?.label}</td>
                <td className="px-3 py-2">{row.outputKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className="px-3 py-2">{row.plannedQtyKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className="px-3 py-2">{row.rejectedKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className="px-3 py-2">{row.wastageKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className="px-3 py-2">{row.pendingQc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["/production/dpr", "Daily"],
          ["/production/dpr?group=weekly", "Weekly"],
          ["/production/dpr?group=monthly", "Monthly"],
          ["/production/dpr?group=reactor", "Reactor-wise"],
          ["/production/dpr?group=batch", "Batch-wise"],
          ["/production/dpr?group=grade", "Grade-wise"],
          ["/production/dpr?group=reactor-batch", "Reactor and batch"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-800 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-100">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
