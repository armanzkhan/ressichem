"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DEPARTMENT_META, FACTORY_LABEL, productionApi, storedProductionDepartments, type ProductionDepartment, type ProductionFactory } from "@/lib/productionApi";
import { procurementPanelClass } from "@/components/procurement/procurementTheme";

export default function ProductionDashboardPage() {
  const [rows, setRows] = useState<
    { _id: { department: ProductionDepartment; factory: ProductionFactory }; count: number; outputKg: number; pendingQc: number; wastageKg: number }[]
  >([]);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<ProductionDepartment[]>(["zrs", "lms", "drymix", "bfs"]);

  useEffect(() => {
    setDepartments(storedProductionDepartments());
    productionApi
      .summary()
      .then((res) => setRows(res.data || []))
      .catch((err) => setError(err.message));
  }, []);

  const totalOutput = rows.reduce((sum, row) => sum + (row.outputKg || 0), 0);
  const pending = rows.reduce((sum, row) => sum + (row.pendingQc || 0), 0);
  const records = rows.reduce((sum, row) => sum + (row.count || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-blue-950 dark:text-blue-50">Production dashboard</h2>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Hub, SITE, and Lahore. Laboratory results are read from QC Site (Zepoxy) and QC Hub (Drymix).
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Records", records.toLocaleString()],
          ["Output (KG)", totalOutput.toLocaleString(undefined, { maximumFractionDigits: 1 })],
          ["Pending lab approval", pending.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className={`${procurementPanelClass} p-4`}>
            <p className="text-xs uppercase tracking-wide text-blue-600">{label}</p>
            <p className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-50">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {departments.map((id) => {
          const mine = rows.filter((row) => row._id.department === id);
          const output = mine.reduce((sum, row) => sum + row.outputKg, 0);
          return (
            <Link key={id} href={`/production/${id}`} className={`${procurementPanelClass} block p-4 hover:border-blue-300`}>
              <p className="font-semibold text-blue-950 dark:text-blue-50">{DEPARTMENT_META[id].label}</p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
                {mine.reduce((sum, row) => sum + row.count, 0)} records · {output.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG
              </p>
            </Link>
          );
        })}
      </div>
      <div className={`${procurementPanelClass} overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-blue-50 text-xs uppercase text-blue-800 dark:bg-slate-800 dark:text-blue-100">
            <tr>
              <th className="px-3 py-2">Factory</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Records</th>
              <th className="px-3 py-2">Output KG</th>
              <th className="px-3 py-2">Pending QC</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-blue-700" colSpan={5}>
                  No production records yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row._id.factory}-${row._id.department}`} className="border-t border-blue-100 dark:border-slate-800">
                  <td className="px-3 py-2">{FACTORY_LABEL[row._id.factory]}</td>
                  <td className="px-3 py-2">{DEPARTMENT_META[row._id.department]?.label}</td>
                  <td className="px-3 py-2">{row.count}</td>
                  <td className="px-3 py-2">{row.outputKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                  <td className="px-3 py-2">{row.pendingQc}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
