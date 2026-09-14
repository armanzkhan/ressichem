const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function runCommand(command, label) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ${label} failed:`, error.message);
      return;
    }
    if (stderr) console.warn(`⚠ ${label} stderr:`, stderr);
    if (stdout) console.log(`✅ ${label} output:`, stdout.trim());
  });
}

function buildMongoUri(fallbackUri) {
  return process.env.BACKUP_MONGO_URI || process.env.CONNECTION_STRING || fallbackUri;
}

function backupOnce({ mongoUri, backupDir }) {
  if (!mongoUri) {
    console.warn("⚠ Backup skipped: mongoUri missing");
    return;
  }
  ensureDir(backupDir);
  const target = path.join(backupDir, `backup-${timestamp()}`);
  const cmd = `mongodump --uri="${mongoUri}" --out="${target}"`;
  runCommand(cmd, "Daily backup");
}

function restoreLatest({ mongoUri, backupDir }) {
  if (!fs.existsSync(backupDir)) {
    console.warn("⚠ Restore skipped: backup directory not found");
    return;
  }
  const candidates = fs
    .readdirSync(backupDir)
    .filter((d) => d.startsWith("backup-"))
    .sort()
    .reverse();
  if (!candidates.length) {
    console.warn("⚠ Restore skipped: no backups found");
    return;
  }
  const latest = path.join(backupDir, candidates[0]);
  const cmd = `mongorestore --uri="${mongoUri}" --drop "${latest}"`;
  runCommand(cmd, "Auto-recovery restore");
}

function initializeBackupService({ mongoUri }) {
  const enabled = String(process.env.BACKUP_ENABLED || "").toLowerCase() === "true";
  if (!enabled) return;

  const backupDir = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");
  backupOnce({ mongoUri, backupDir });

  const hours = Number(process.env.BACKUP_INTERVAL_HOURS || 24);
  const intervalMs = Math.max(1, hours) * 60 * 60 * 1000;
  setInterval(() => backupOnce({ mongoUri, backupDir }), intervalMs);
  console.log(`✅ Backup scheduler enabled every ${hours}h`);
}

function restoreOnStartup({ mongoUri }) {
  const enabled = String(process.env.BACKUP_AUTO_RECOVER || "").toLowerCase() === "true";
  if (!enabled) return;
  const backupDir = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");
  restoreLatest({ mongoUri, backupDir });
}

module.exports = { initializeBackupService, restoreOnStartup, buildMongoUri };
