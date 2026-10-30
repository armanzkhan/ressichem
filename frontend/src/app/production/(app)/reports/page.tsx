"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, type ProductionDepartment, type ProductionFactory } from "@/lib/productionApi";
import { procurementPanelClass } from "@/components/procurement/procurementTheme";

export default function ManagementReportsPage() {
  const [rows, setRows] = useState<
    { _id: { department: ProductionDepartment; factory: ProductionFactory }; outputKg: number; plannedQtyKg: number; wastageKg: number; rejectedKg: number; pendingQc: number; count: number }[]
  >([]);

  useEffect(() => {
    productionApi.summary().then((res) => setRows(res.data || [])).catch(() => setRows([]));
  }, []);

  const factories: ProductionFactory[] = ["hub", "site", "lahore"];

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
      <div className={`${procurementPanelClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
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
              <tr key={`${row._id.factory}-${row._id.department}`} className="border-t border-blue-100 dark:border-slate-800">
                <td className="px-3 py-2">{FACTORY_LABEL[row._id.factory]}</td>
                <td className="px-3 py-2">{DEPARTMENT_META[row._id.department]?.label}</td>
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
      <p className="text-sm">
        <Link href="/production/dpr" className="font-semibold text-blue-700 underline">
          Open the daily production report
        </Link>{" "}
        for shift, operator, machine, and product detail.
      </p>
    </div>
  );
}
