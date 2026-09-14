"use client";

import React, { useEffect, useState } from "react";
import { qaBottleFillingApi } from "@/lib/qcSiteApi";
import { useQcResultPermissions } from "@/lib/useQcResultPermissions";
import { onQcDataRowClick, qcDataRowClassName } from "@/lib/qcRowClick";

const HOURLY_TIME_SLOTS = [
  "09:00",
  "10:30",
  "11:30",
  "12:30",
  "14:00",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
];

const KIT_SIZE_OPTIONS = ["Mini", "Half", "Full", "Can"];

type HourlyRecord = {
  timeSlot: string;
  hour: number;
  fillingMachineStatus: string;
  drumCondition: string;
  drumIbcNo: string;
  batchNo: string;
  grade: string;
  materialParticlesStatus: string;
  productName: string;
  kitSize: string;
  colourStatus: string;
  bottleWeight: string;
  sealingCondition: string;
  cappingStatus: string;
  cartonLabeling: string;
  cartonGrossWeight: string;
  packingCondition: string;
  cartonOnPallet: string;
  stackingHeight: string;
  remarks: string;
};

type QABottleFilling = {
  _id: string;
  date: string;
  operator: string;
  shift: string;
  machineId: string;
  machineName: string;
  hourlyRecords: HourlyRecord[];
  totalBatches: number;
  totalWeight: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  traceabilitySheetGenerated: boolean;
  traceabilitySheetLink: string;
  remarks?: string;
  dispatchingDetails?: string;
  qcOfficer?: string;
  qcManager?: string;
};

function emptyHourlyRecord(index: number): HourlyRecord {
  return {
    timeSlot: HOURLY_TIME_SLOTS[index] || "",
    hour: index,
    fillingMachineStatus: "",
    drumCondition: "",
    drumIbcNo: "",
    batchNo: "",
    grade: "",
    materialParticlesStatus: "",
    productName: "",
    kitSize: "",
    colourStatus: "",
    bottleWeight: "",
    sealingCondition: "",
    cappingStatus: "",
    cartonLabeling: "",
    cartonGrossWeight: "",
    packingCondition: "",
    cartonOnPallet: "",
    stackingHeight: "",
    remarks: "",
  };
}

function hourlyFromApi(row: Partial<HourlyRecord> & { weight?: number; stacking?: string }, index: number): HourlyRecord {
  return {
    timeSlot: row.timeSlot || HOURLY_TIME_SLOTS[index] || "",
    hour: row.hour ?? index,
    fillingMachineStatus: row.fillingMachineStatus || "",
    drumCondition: row.drumCondition || "",
    drumIbcNo: row.drumIbcNo || "",
    batchNo: row.batchNo || "",
    grade: row.grade || "",
    materialParticlesStatus: row.materialParticlesStatus || "",
    productName: row.productName || "",
    kitSize: row.kitSize || "",
    colourStatus: row.colourStatus || "",
    bottleWeight: row.bottleWeight !== undefined && row.bottleWeight !== null ? String(row.bottleWeight) : row.weight !== undefined ? String(row.weight) : "",
    sealingCondition: row.sealingCondition || "",
    cappingStatus: row.cappingStatus || "",
    cartonLabeling: row.cartonLabeling || "",
    cartonGrossWeight: row.cartonGrossWeight !== undefined && row.cartonGrossWeight !== null ? String(row.cartonGrossWeight) : "",
    packingCondition: row.packingCondition || "",
    cartonOnPallet: row.cartonOnPallet || "",
    stackingHeight: row.stackingHeight || row.stacking || "",
    remarks: row.remarks || "",
  };
}

function serializeHourlyRecords(rows: HourlyRecord[]) {
  return rows.map((hr, index) => {
    const bottleWeight = hr.bottleWeight ? Number(hr.bottleWeight) : undefined;
    const cartonGrossWeight = hr.cartonGrossWeight ? Number(hr.cartonGrossWeight) : undefined;
    return {
      timeSlot: hr.timeSlot,
      hour: hr.hour ?? index,
      fillingMachineStatus: hr.fillingMachineStatus,
      drumCondition: hr.drumCondition,
      drumIbcNo: hr.drumIbcNo,
      batchNo: hr.batchNo,
      grade: hr.grade,
      materialParticlesStatus: hr.materialParticlesStatus,
      productName: hr.productName,
      kitSize: hr.kitSize,
      colourStatus: hr.colourStatus,
      bottleWeight,
      weight: bottleWeight,
      sealingCondition: hr.sealingCondition,
      cappingStatus: hr.cappingStatus,
      cartonLabeling: hr.cartonLabeling,
      cartonGrossWeight,
      packingCondition: hr.packingCondition,
      cartonOnPallet: hr.cartonOnPallet,
      stackingHeight: hr.stackingHeight,
      stacking: hr.stackingHeight,
      remarks: hr.remarks,
    };
  });
}

const fieldClass =
  "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white";

export default function QABottleFillingPage() {
  const { canSubmit, canApprove } = useQcResultPermissions();
  const [records, setRecords] = useState<QABottleFilling[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QABottleFilling | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    operator: "",
    shift: "",
    machineId: "",
    machineName: "",
    remarks: "",
    dispatchingDetails: "",
    qcOfficer: "",
    qcManager: "",
  });

  const [hourlyRecords, setHourlyRecords] = useState<HourlyRecord[]>([]);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await qaBottleFillingApi.getAll({ page: 1, limit: 100 });
      if (res.success) {
        setRecords(res.data || []);
      } else {
        setMessage(res.message || "Failed to load records");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRecordEditor = (record: QABottleFilling) => {
    setSelectedRecord(record);
    setForm({
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      operator: record.operator || "",
      shift: record.shift || "",
      machineId: record.machineId || "",
      machineName: record.machineName || "",
      remarks: record.remarks || "",
      dispatchingDetails: record.dispatchingDetails || "",
      qcOfficer: record.qcOfficer || "",
      qcManager: record.qcManager || "",
    });
    setHourlyRecords((record.hourlyRecords || []).map((hr, i) => hourlyFromApi(hr, i)));
    setShowForm(true);
  };

  const addHourlyRecord = () => {
    setHourlyRecords((rows) => [...rows, emptyHourlyRecord(rows.length)]);
  };

  const removeHourlyRecord = (index: number) => {
    setHourlyRecords((rows) => rows.filter((_, i) => i !== index));
  };

  const updateHourlyRecord = (index: number, field: keyof HourlyRecord, value: string | number) => {
    setHourlyRecords((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      operator: "",
      shift: "",
      machineId: "",
      machineName: "",
      remarks: "",
      dispatchingDetails: "",
      qcOfficer: "",
      qcManager: "",
    });
    setHourlyRecords([]);
    setSelectedRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = {
        ...form,
        date: new Date(form.date).toISOString(),
        hourlyRecords: serializeHourlyRecords(hourlyRecords),
      };

      if (selectedRecord) {
        const res = await qaBottleFillingApi.update(selectedRecord._id, data);
        if (res.success) {
          setMessage("Record updated successfully");
          setShowForm(false);
          resetForm();
          load();
        } else {
          setMessage(res.message || "Failed to update");
        }
      } else {
        const res = await qaBottleFillingApi.create(data);
        if (res.success) {
          setMessage("Record created successfully");
          setShowForm(false);
          resetForm();
          load();
        } else {
          setMessage(res.message || "Failed to create");
        }
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    if (!confirm("Submit this record for approval?")) return;
    setLoading(true);
    try {
      const res = await qaBottleFillingApi.submit(id);
      if (res.success) {
        setMessage("Record submitted successfully");
        load();
      } else {
        setMessage(res.message || "Failed to submit");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this record?")) return;
    setLoading(true);
    try {
      const res = await qaBottleFillingApi.approve(id);
      if (res.success) {
        setMessage("Record approved successfully");
        load();
      } else {
        setMessage(res.message || "Failed to approve");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason?");
    if (reason === null) return;
    setLoading(true);
    try {
      const res = await qaBottleFillingApi.reject(id, reason || undefined);
      if (res.success) {
        setMessage("Record rejected");
        load();
      } else {
        setMessage(res.message || "Failed to reject");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTraceability = async (id: string) => {
    setLoading(true);
    try {
      const res = await qaBottleFillingApi.generateTraceabilitySheet(id);
      if (res.success) {
        setMessage("Traceability sheet generated successfully");
        load();
      } else {
        setMessage(res.message || "Failed to generate traceability sheet");
      }
    } catch (e: any) {
      setMessage(e?.message || "Failed to generate traceability sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">QA Bottle Filling Module</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SRS 3.2 — On-line checks for traceability (RESSICHEM log sheet)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          + New Record
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {message}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {selectedRecord ? "Edit QA Bottle Filling Record" : "New QA Bottle Filling Record"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Quality Control Department — On-line checks for traceability
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operator *</label>
                <input
                  type="text"
                  required
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shift *</label>
                <select
                  required
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  className={fieldClass}
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Machine ID</label>
                <input
                  type="text"
                  value={form.machineId}
                  onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Machine Name</label>
                <input
                  type="text"
                  value={form.machineName}
                  onChange={(e) => setForm({ ...form, machineName: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hourly on-line checks (add one column per time slot)
                </label>
                <button
                  type="button"
                  onClick={addHourlyRecord}
                  disabled={hourlyRecords.length >= HOURLY_TIME_SLOTS.length}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  + Add Hour
                </button>
              </div>

              {hourlyRecords.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4">
                  Click <strong>+ Add Hour</strong> to enter checks for 09:00, 10:30, 11:30, etc.
                </p>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {hourlyRecords.map((hr, idx) => (
                    <div
                      key={`hour-${idx}-${hr.timeSlot}`}
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Hour entry #{idx + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeHourlyRecord(idx)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Time</span>
                          <select
                            value={hr.timeSlot}
                            onChange={(e) => updateHourlyRecord(idx, "timeSlot", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          >
                            <option value="">Select time</option>
                            {HOURLY_TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Epoxy/Hardener filling machine</span>
                          <select
                            value={hr.fillingMachineStatus}
                            onChange={(e) => updateHourlyRecord(idx, "fillingMachineStatus", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          >
                            <option value="">—</option>
                            <option value="On">On</option>
                            <option value="Off">Off</option>
                          </select>
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">IBC/Drum condition</span>
                          <select
                            value={hr.drumCondition}
                            onChange={(e) => updateHourlyRecord(idx, "drumCondition", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          >
                            <option value="">—</option>
                            <option value="Ok">Ok</option>
                            <option value="Not Ok">Not Ok</option>
                          </select>
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Drum/IBC number</span>
                          <input
                            type="text"
                            value={hr.drumIbcNo}
                            onChange={(e) => updateHourlyRecord(idx, "drumIbcNo", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Batch #</span>
                          <input
                            type="text"
                            value={hr.batchNo}
                            onChange={(e) => updateHourlyRecord(idx, "batchNo", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Grade #</span>
                          <input
                            type="text"
                            value={hr.grade}
                            onChange={(e) => updateHourlyRecord(idx, "grade", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block sm:col-span-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Condition of material inside bottle/can (particles status)
                          </span>
                          <input
                            type="text"
                            value={hr.materialParticlesStatus}
                            onChange={(e) => updateHourlyRecord(idx, "materialParticlesStatus", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Product name</span>
                          <input
                            type="text"
                            value={hr.productName}
                            onChange={(e) => updateHourlyRecord(idx, "productName", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Pack size (Mini/Half/Full/Can)</span>
                          <select
                            value={hr.kitSize}
                            onChange={(e) => updateHourlyRecord(idx, "kitSize", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          >
                            <option value="">—</option>
                            {KIT_SIZE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Colour of resin/hardener</span>
                          <select
                            value={hr.colourStatus}
                            onChange={(e) => updateHourlyRecord(idx, "colourStatus", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          >
                            <option value="">—</option>
                            <option value="Ok">Ok</option>
                            <option value="Not Ok">Not Ok</option>
                          </select>
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Bottle weighing (+3 Mini, +5 Half/Full allowed)
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={hr.bottleWeight}
                            onChange={(e) => updateHourlyRecord(idx, "bottleWeight", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Sealing condition (by pressing bottle)</span>
                          <input
                            type="text"
                            value={hr.sealingCondition}
                            onChange={(e) => updateHourlyRecord(idx, "sealingCondition", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Capping (cap seal check)</span>
                          <input
                            type="text"
                            value={hr.cappingStatus}
                            onChange={(e) => updateHourlyRecord(idx, "cappingStatus", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block sm:col-span-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Carton labelling (batch no. of resin, hardener &amp; gross weight)
                          </span>
                          <input
                            type="text"
                            value={hr.cartonLabeling}
                            onChange={(e) => updateHourlyRecord(idx, "cartonLabeling", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Carton gross weight</span>
                          <input
                            type="number"
                            step="any"
                            value={hr.cartonGrossWeight}
                            onChange={(e) => updateHourlyRecord(idx, "cartonGrossWeight", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Packing condition (carton appearance)</span>
                          <input
                            type="text"
                            value={hr.packingCondition}
                            onChange={(e) => updateHourlyRecord(idx, "packingCondition", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Carton on pallet</span>
                          <input
                            type="text"
                            value={hr.cartonOnPallet}
                            onChange={(e) => updateHourlyRecord(idx, "cartonOnPallet", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Stacking height</span>
                          <input
                            type="text"
                            value={hr.stackingHeight}
                            onChange={(e) => updateHourlyRecord(idx, "stackingHeight", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>

                        <label className="text-xs block sm:col-span-2 lg:col-span-3">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Hour remarks</span>
                          <input
                            type="text"
                            value={hr.remarks}
                            onChange={(e) => updateHourlyRecord(idx, "remarks", e.target.value)}
                            className={`${fieldClass} mt-1`}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={3}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dispatching details</label>
                <textarea
                  value={form.dispatchingDetails}
                  onChange={(e) => setForm({ ...form, dispatchingDetails: e.target.value })}
                  rows={3}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QC/QA officer</label>
                <input
                  type="text"
                  value={form.qcOfficer}
                  onChange={(e) => setForm({ ...form, qcOfficer: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QC/QA manager</label>
                <input
                  type="text"
                  value={form.qcManager}
                  onChange={(e) => setForm({ ...form, qcManager: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : selectedRecord ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-white/30 dark:border-gray-700/50 shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">QA Bottle Filling Records</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click a row to open the log sheet record</p>
        </div>
        {loading && !records.length ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Operator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shift</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Machine</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hours logged</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map((record) => (
                  <tr
                    key={record._id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onQcDataRowClick(e, () => openRecordEditor(record))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRecordEditor(record);
                      }
                    }}
                    className={qcDataRowClassName(selectedRecord?._id === record._id && showForm)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.shift}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.machineName || record.machineId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.hourlyRecords?.length || record.totalBatches || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.totalWeight} kg</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          record.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : record.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : record.status === "submitted"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" data-no-row-click>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openRecordEditor(record)}
                          className="px-2 py-1 rounded bg-slate-600 text-white text-xs hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        {record.status === "draft" && canSubmit ? (
                          <button
                            onClick={() => handleSubmitForApproval(record._id)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                          >
                            Submit
                          </button>
                        ) : null}
                        {record.status === "submitted" && canApprove ? (
                          <>
                            <button
                              onClick={() => handleApprove(record._id)}
                              className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(record._id)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {record.status === "approved" && (
                          <button
                            onClick={() => handleGenerateTraceability(record._id)}
                            className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                          >
                            Traceability
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
