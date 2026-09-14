const path = require("path");
const { exec } = require("child_process");

const backupDir = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");
const mongoUri = process.env.BACKUP_MONGO_URI || process.env.CONNECTION_STRING;

if (!mongoUri) {
  console.error("Missing BACKUP_MONGO_URI or CONNECTION_STRING");
  process.exit(1);
}

const fs = require("fs");
if (!fs.existsSync(backupDir)) {
  console.error("Backup directory not found:", backupDir);
  process.exit(1);
}

const candidates = fs
  .readdirSync(backupDir)
  .filter((d) => d.startsWith("backup-"))
  .sort()
  .reverse();

if (!candidates.length) {
  console.error("No backups found in:", backupDir);
  process.exit(1);
}

const latest = path.join(backupDir, candidates[0]);
const cmd = `mongorestore --uri="${mongoUri}" --drop "${latest}"`;
console.log("Restoring from:", latest);
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error("Restore failed:", error.message);
    process.exit(1);
  }
  if (stderr) console.warn(stderr);
  if (stdout) console.log(stdout);
  console.log("Restore completed");
});
