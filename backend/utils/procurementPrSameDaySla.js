/**
 * PR approval SLA.
 * Clock starts at submit (or createdAt fallback). Must be fully approved
 * within 72 hours of that timestamp. Reminders at 48h and 24h remaining.
 * Existing rows keep whatever slaDueAt was stored at submit.
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

const DEFAULT_SLA_HOURS = 72;

function slaWindowHours() {
  const n = Number(process.env.PROCUREMENT_PR_SLA_HOURS);
  if (Number.isFinite(n) && n > 0) return n;
  return DEFAULT_SLA_HOURS;
}

function slaWindowMs() {
  return slaWindowHours() * 60 * 60 * 1000;
}

/** Reminders fire once when remaining time first drops to these marks (most urgent first). */
const SLA_REMINDER_MARKS = [
  { key: "24h", hoursLeft: 24 },
  { key: "48h", hoursLeft: 48 },
];

const DEFAULT_HOLD_DAYS = 30;

function holdWindowDays() {
  const n = Number(process.env.PROCUREMENT_PR_HOLD_DAYS);
  if (Number.isFinite(n) && n > 0) return n;
  return DEFAULT_HOLD_DAYS;
}

function holdWindowMs() {
  return holdWindowDays() * 24 * 60 * 60 * 1000;
}

/** Hold-expiry reminders (most urgent first). */
const HOLD_REMINDER_MARKS = [
  { key: "hold24h", hoursLeft: 24 },
  { key: "hold7d", hoursLeft: 24 * 7 },
];

function isHeld(pr) {
  return String(pr?.status || "").toLowerCase() === "held";
}

function computeHoldExpiresAt(heldAt = new Date()) {
  const start = new Date(heldAt);
  if (Number.isNaN(start.getTime())) return new Date(Date.now() + holdWindowMs());
  return new Date(start.getTime() + holdWindowMs());
}

function holdExpiryDate(pr) {
  if (pr?.holdExpiresAt) return new Date(pr.holdExpiresAt);
  if (pr?.heldAt) return computeHoldExpiresAt(pr.heldAt);
  return null;
}

/** Push slaDueAt forward by the time spent on hold so remaining SLA resumes. */
function extendSlaAfterHold(pr, releasedAt = new Date()) {
  const heldAt = pr?.heldAt ? new Date(pr.heldAt) : releasedAt;
  const pausedMs = Math.max(0, releasedAt.getTime() - heldAt.getTime());
  const base = pr?.slaDueAt ? new Date(pr.slaDueAt) : computeSlaDueAt(pr);
  return new Date(base.getTime() + pausedMs);
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
  if (Number.isNaN(anchor.getTime())) return endOfSlaDay(new Date());
  return new Date(anchor.getTime() + slaWindowMs());
}

function isOpenForSla(pr) {
  return OPEN_STATUSES.includes(String(pr?.status || "").toLowerCase());
}

function isPastSlaDeadline(pr, now = new Date()) {
  // Hold freezes the 72-hour clock until release (or the 30-day hold limit).
  if (isHeld(pr)) return false;
  const due = pr?.slaDueAt ? new Date(pr.slaDueAt) : computeSlaDueAt(pr);
  if (Number.isNaN(due.getTime())) return false;
  return now.getTime() > due.getTime();
}

function isHoldExpired(pr, now = new Date()) {
  if (!isHeld(pr)) return false;
  const exp = holdExpiryDate(pr);
  if (!exp || Number.isNaN(exp.getTime())) return false;
  return now.getTime() > exp.getTime();
}

function slaStatusForPr(pr, now = new Date()) {
  if (!slaEnabled()) return { status: "disabled", dueAt: null, label: "" };
  if (!isOpenForSla(pr) && pr?.status === "rejected" && pr?.slaClosedByDeadline) {
    return {
      status: "closed_by_sla",
      dueAt: pr.slaDueAt || null,
      label: "Closed — 72-hour deadline missed",
    };
  }
  if (isHeld(pr)) {
    const exp = holdExpiryDate(pr);
    if (exp && now.getTime() > exp.getTime()) {
      return { status: "overdue", dueAt: exp, label: "Hold expired — 30 days" };
    }
    return { status: "on_hold", dueAt: exp, label: "On hold — SLA paused" };
  }
  if (!isOpenForSla(pr)) {
    return { status: "n_a", dueAt: pr?.slaDueAt || null, label: "" };
  }
  const dueAt = pr?.slaDueAt ? new Date(pr.slaDueAt) : computeSlaDueAt(pr);
  const remaining = dueAt.getTime() - now.getTime();
  if (remaining <= 0) {
    return { status: "overdue", dueAt, label: "Overdue — 72-hour SLA" };
  }
  if (remaining <= 24 * 60 * 60 * 1000) {
    return { status: "due_24h", dueAt, label: "24 hours left" };
  }
  if (remaining <= 48 * 60 * 60 * 1000) {
    return { status: "due_48h", dueAt, label: "48 hours left" };
  }
  return { status: "on_track", dueAt, label: "72-hour SLA" };
}

/**
 * Which reminder to send now, or null.
 * If the window jumped past an earlier mark, only the most urgent unsent mark is returned.
 * `alsoMark` includes skipped earlier keys so they are not sent later.
 */
function nextSlaReminder(pr, now = new Date()) {
  if (isHeld(pr)) return null;
  const due = pr?.slaDueAt ? new Date(pr.slaDueAt) : null;
  if (!due || Number.isNaN(due.getTime())) return null;
  const remaining = due.getTime() - now.getTime();
  if (remaining <= 0) return null;
  const sent = new Set(pr?.slaRemindersSent || []);
  const dueMarks = SLA_REMINDER_MARKS.filter(
    (mark) => remaining <= mark.hoursLeft * 60 * 60 * 1000
  );
  const pending = dueMarks.find((mark) => !sent.has(mark.key));
  if (!pending) return null;
  return {
    key: pending.key,
    hoursLeft: pending.hoursLeft,
    alsoMark: dueMarks.map((mark) => mark.key),
  };
}

function nextHoldReminder(pr, now = new Date()) {
  if (!isHeld(pr)) return null;
  const due = holdExpiryDate(pr);
  if (!due || Number.isNaN(due.getTime())) return null;
  const remaining = due.getTime() - now.getTime();
  if (remaining <= 0) return null;
  const sent = new Set(pr?.holdRemindersSent || []);
  const dueMarks = HOLD_REMINDER_MARKS.filter(
    (mark) => remaining <= mark.hoursLeft * 60 * 60 * 1000
  );
  const pending = dueMarks.find((mark) => !sent.has(mark.key));
  if (!pending) return null;
  return {
    key: pending.key,
    hoursLeft: pending.hoursLeft,
    alsoMark: dueMarks.map((mark) => mark.key),
  };
}

module.exports = {
  OPEN_STATUSES,
  slaTimezone,
  slaOffsetMs,
  slaEnabled,
  slaWindowHours,
  partsInTz,
  toLocalParts,
  endOfSlaDay,
  computeSlaDueAt,
  slaAnchorDate,
  isOpenForSla,
  isPastSlaDeadline,
  slaStatusForPr,
  nextSlaReminder,
  SLA_REMINDER_MARKS,
  holdWindowDays,
  computeHoldExpiresAt,
  holdExpiryDate,
  extendSlaAfterHold,
  isHeld,
  isHoldExpired,
  nextHoldReminder,
  HOLD_REMINDER_MARKS,
};
