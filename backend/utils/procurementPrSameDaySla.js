/**
 * Same-day PR approval SLA (strict).
 * Clock starts at submit (or createdAt fallback). Must be fully approved/rejected
 * by end of that calendar day in Asia/Karachi (UTC+5, no DST).
 */

const DEFAULT_TZ = "Asia/Karachi";
/** Karachi is UTC+5 year-round */
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;
const OPEN_STATUSES = ["submitted", "held", "partially_approved"];

function slaTimezone() {
  return process.env.PROCUREMENT_PR_SLA_TZ || DEFAULT_TZ;
}

function slaOffsetMs() {
  const hours = Number(process.env.PROCUREMENT_PR_SLA_UTC_OFFSET_HOURS);
  if (Number.isFinite(hours)) return hours * 60 * 60 * 1000;
  return KARACHI_OFFSET_MS;
}

function slaEnabled() {
  const raw = String(process.env.PROCUREMENT_PR_SLA_ENABLED || "true").toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function reminderHour() {
  const n = Number(process.env.PROCUREMENT_PR_SLA_REMINDER_HOUR);
  return Number.isFinite(n) ? Math.min(23, Math.max(0, Math.floor(n))) : 15; // 3 PM local
}

function toLocalParts(date = new Date(), offsetMs = slaOffsetMs()) {
  const local = new Date(date.getTime() + offsetMs);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

function partsInTz(date = new Date()) {
  return toLocalParts(date);
}

/** End of local calendar day for the anchor instant → UTC Date */
function endOfSlaDay(anchorDate = new Date(), offsetMs = slaOffsetMs()) {
  const p = toLocalParts(anchorDate, offsetMs);
  // Local 23:59:59.999 on that Y-M-D, expressed as UTC
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 23, 59, 59, 999) - offsetMs);
}

function slaAnchorDate(pr) {
  if (pr?.submittedAt) return new Date(pr.submittedAt);
  if (pr?.createdAt) return new Date(pr.createdAt);
  return new Date();
}

function computeSlaDueAt(prOrDate) {
  const anchor =
    prOrDate instanceof Date || typeof prOrDate === "string" || typeof prOrDate === "number"
      ? new Date(prOrDate)
      : slaAnchorDate(prOrDate);
  return endOfSlaDay(anchor);
}

function isOpenForSla(pr) {
  return OPEN_STATUSES.includes(String(pr?.status || "").toLowerCase());
}

function isPastSlaDeadline(pr, now = new Date()) {
  const due = pr?.slaDueAt ? new Date(pr.slaDueAt) : computeSlaDueAt(pr);
  if (Number.isNaN(due.getTime())) return false;
  return now.getTime() > due.getTime();
}

function slaStatusForPr(pr, now = new Date()) {
  if (!slaEnabled()) return { status: "disabled", dueAt: null, label: "" };
  if (!isOpenForSla(pr) && pr?.status === "rejected" && pr?.slaClosedByDeadline) {
    return {
      status: "closed_by_sla",
      dueAt: pr.slaDueAt || null,
      label: "Closed — same-day deadline missed",
    };
  }
  if (!isOpenForSla(pr)) {
    return { status: "n_a", dueAt: pr?.slaDueAt || null, label: "" };
  }
  const dueAt = pr?.slaDueAt ? new Date(pr.slaDueAt) : computeSlaDueAt(pr);
  if (now.getTime() > dueAt.getTime()) {
    return { status: "overdue", dueAt, label: "Overdue — must close today" };
  }
  const parts = toLocalParts(now);
  if (parts.hour >= reminderHour()) {
    return { status: "due_today_urgent", dueAt, label: "Due today — approve before end of day" };
  }
  return { status: "due_today", dueAt, label: "Due today (same-day SLA)" };
}

function shouldSendAfternoonReminder(now = new Date()) {
  if (!slaEnabled()) return false;
  const p = toLocalParts(now);
  const hour = reminderHour();
  return p.hour === hour && p.minute < 10;
}

module.exports = {
  OPEN_STATUSES,
  slaTimezone,
  slaOffsetMs,
  slaEnabled,
  reminderHour,
  partsInTz,
  toLocalParts,
  endOfSlaDay,
  computeSlaDueAt,
  slaAnchorDate,
  isOpenForSla,
  isPastSlaDeadline,
  slaStatusForPr,
  shouldSendAfternoonReminder,
};
