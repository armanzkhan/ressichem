"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type TrendPoint = { date: string; batchNo: string; value: number };

type Props = {
  title: string;
  data: TrendPoint[];
  unit?: string;
  color?: string;
};

export function QCHubTrendChart({ title, data, unit, color = "#0ea5e9" }: Props) {
  const chartData = data.map((d) => ({
    label: d.batchNo || new Date(d.date).toLocaleDateString(),
    value: d.value,
    date: d.date,
  }));

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/40">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h4>
        <p className="text-xs text-gray-500">No trend data yet — add approved batch records.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/40">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
        {unit ? ` (${unit})` : ""}
      </h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} name={title} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
