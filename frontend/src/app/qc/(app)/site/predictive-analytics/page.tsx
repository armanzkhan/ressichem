"use client";

import React, { useMemo, useState } from "react";
import { predictiveAnalyticsApi } from "@/lib/qcSiteApi";
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function PredictiveAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [batchTrends, setBatchTrends] = useState<any>(null);
  const [abnormalityPredictions, setAbnormalityPredictions] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"trends" | "predictions">("trends");

  const [filters, setFilters] = useState({
    productType: "",
    productName: "",
    grade: "",
    from: "",
    to: "",
  });

  const trendSeries = (rows?: any[], key?: string) => {
    if (!rows || !key) return [];
    return rows
      .filter((r) => r?.value !== undefined && r?.value !== null)
      .map((r) => ({
        date: r.date ? new Date(r.date).toLocaleDateString() : "",
        value: r.value,
        batchNo: r.batchNo,
      }));
  };

  const resinTrendCharts = useMemo(() => {
    if (!batchTrends?.resin) return [];
    return [
      { title: "EEW", data: trendSeries(batchTrends.resin.eew, "value") },
      { title: "Viscosity", data: trendSeries(batchTrends.resin.viscosity, "value") },
      { title: "Gel Time", data: trendSeries(batchTrends.resin.gelTime, "value") },
      { title: "Mix Viscosity", data: trendSeries(batchTrends.resin.mixViscosity, "value") },
      { title: "Exothermic Temperature", data: trendSeries(batchTrends.resin.exothermicTemperature, "value") },
      { title: "HyCl", data: trendSeries(batchTrends.resin.hycl, "value") },
      { title: "Solid Content", data: trendSeries(batchTrends.resin.solidContent, "value") },
    ].filter((item) => item.data.length > 0);
  }, [batchTrends]);

  const hardenerTrendCharts = useMemo(() => {
    if (!batchTrends?.hardener) return [];
    return [
      { title: "Amine Value", data: trendSeries(batchTrends.hardener.amineValue, "value") },
      { title: "Viscosity", data: trendSeries(batchTrends.hardener.viscosity, "value") },
      { title: "Gel Time", data: trendSeries(batchTrends.hardener.gelTime, "value") },
      { title: "Mix Viscosity", data: trendSeries(batchTrends.hardener.mixViscosity, "value") },
      { title: "Exothermic Temperature", data: trendSeries(batchTrends.hardener.exothermicTemperature, "value") },
      { title: "Solid Content", data: trendSeries(batchTrends.hardener.solidContent, "value") },
    ].filter((item) => item.data.length > 0);
  }, [batchTrends]);

  const predictionSummary = useMemo(() => {
    if (!abnormalityPredictions) return [];
    const outOfSpec = abnormalityPredictions.outOfSpecPatterns?.length || 0;
    const risks = abnormalityPredictions.batchQualityRisks?.length || 0;
    const correlations = abnormalityPredictions.rawMaterialCorrelations?.length || 0;
    return [
      { name: "Out-of-Spec", value: outOfSpec },
      { name: "Quality Risks", value: risks },
      { name: "RM Correlations", value: correlations },
    ];
  }, [abnormalityPredictions]);

  const loadBatchTrends = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await predictiveAnalyticsApi.getBatchTrends(filters);
      if (res.success) {
        setBatchTrends(res.data);
        setActiveTab("trends");
      } else {
        setMessage(res.message || "Failed to load batch trends");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load batch trends");
    } finally {
      setLoading(false);
    }
  };

  const loadAbnormalityPredictions = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await predictiveAnalyticsApi.getAbnormalityPredictions(filters);
      if (res.success) {
        setAbnormalityPredictions(res.data);
        setActiveTab("predictions");
      } else {
        setMessage(res.message || "Failed to load abnormality predictions");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load abnormality predictions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Predictive Analytics Module</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">SRS 3.4 - Batch Trend Forecasting & Abnormality Prediction</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type</label>
            <select
              value={filters.productType}
              onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="RESIN">Resin</option>
              <option value="HARDENER">Hardener</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
            <input
              type="text"
              value={filters.productName}
              onChange={(e) => setFilters({ ...filters, productName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={loadBatchTrends}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            Load Batch Trends (SRS 3.4.1)
          </button>
          <button
            onClick={loadAbnormalityPredictions}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all"
          >
            Load Abnormality Predictions (SRS 3.4.2)
          </button>
        </div>
      </div>

      {activeTab === "trends" && batchTrends && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Batch Trend Forecasting (SRS 3.4.1)</h3>
          <div className="space-y-6">
            {batchTrends.resin && (
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Resin Trends</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {resinTrendCharts.map((chart) => (
                    <div key={chart.title} className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-4 shadow-sm">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{chart.title} Trend</div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {batchTrends.hardener && (
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Hardener Trends</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {hardenerTrendCharts.map((chart) => (
                    <div key={chart.title} className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-4 shadow-sm">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{chart.title} Trend</div>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chart.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "predictions" && abnormalityPredictions && (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6 transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Abnormality Predictions (SRS 3.4.2)</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prediction Summary</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={predictionSummary} dataKey="value" nameKey="name" outerRadius={90} label>
                        {predictionSummary.map((_, idx) => (
                          <Cell key={`pred-${idx}`} fill={["#ef4444", "#f59e0b", "#3b82f6"][idx % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-gray-900/40 dark:to-gray-800/50 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Highlights</div>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Out-of-Spec Patterns</span>
                    <span className="font-bold">{abnormalityPredictions.outOfSpecPatterns?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Batch Quality Risks</span>
                    <span className="font-bold">{abnormalityPredictions.batchQualityRisks?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>RM Correlations</span>
                    <span className="font-bold">{abnormalityPredictions.rawMaterialCorrelations?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Out-of-Spec Patterns</h4>
              {abnormalityPredictions.outOfSpecPatterns?.length > 0 ? (
                <div className="space-y-2">
                  {abnormalityPredictions.outOfSpecPatterns.map((pattern: any, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-sm">
                        <strong>Batch:</strong> {pattern.batchNo} | <strong>Parameter:</strong> {pattern.parameter} | <strong>Value:</strong> {pattern.value} | <strong>Risk:</strong> {pattern.risk}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No out-of-spec patterns detected</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Batch Quality Risks</h4>
              {abnormalityPredictions.batchQualityRisks?.length > 0 ? (
                <div className="space-y-2">
                  {abnormalityPredictions.batchQualityRisks.map((risk: any, idx: number) => (
                    <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-sm">
                        <strong>Batch:</strong> {risk.batchNo} | <strong>Parameter:</strong> {risk.parameter} | <strong>Deviation:</strong> {risk.deviation} | <strong>Risk:</strong> {risk.risk}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No batch quality risks detected</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Raw Material Correlations</h4>
              {abnormalityPredictions.rawMaterialCorrelations?.length > 0 ? (
                <div className="space-y-2">
                  {abnormalityPredictions.rawMaterialCorrelations.map((corr: any, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm">{JSON.stringify(corr)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No raw material correlations detected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

