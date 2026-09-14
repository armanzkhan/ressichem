const fs = require("fs");
const path = require("path");
const { getStorageBucket, initializeFirebaseAdmin, isFirebaseConfigured } = require("./firebaseAdmin");

const SIGNED_URL_MS = 7 * 24 * 60 * 60 * 1000;

function useFirebaseStorage() {
  return isFirebaseConfigured() && initializeFirebaseAdmin() && !!getStorageBucket();
}

function readFileBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path && fs.existsSync(file.path)) return fs.readFileSync(file.path);
  return null;
}

function cleanupLocalTemp(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
}

async function uploadExportDocument({ companyId, recordNumber, file }) {
  const bucket = getStorageBucket();
  if (!bucket) throw new Error("Firebase Storage is not configured");

  const buffer = readFileBuffer(file);
  if (!buffer) throw new Error("No file data to upload");

  const safeName = String(file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
  const firebasePath = `procurement/export-documents/${companyId}/${recordNumber}-${Date.now()}-${safeName}`;
  const bucketFile = bucket.file(firebasePath);

  await bucketFile.save(buffer, {
    metadata: {
      contentType: file.mimetype || "application/octet-stream",
      metadata: {
        companyId: String(companyId),
        recordNumber: String(recordNumber),
        originalName: String(file.originalname || ""),
      },
    },
    resumable: buffer.length > 5 * 1024 * 1024,
  });

  const [signedUrl] = await bucketFile.getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_MS,
  });

  cleanupLocalTemp(file);

  return {
    storage: "firebase",
    firebasePath,
    path: signedUrl,
    originalName: file.originalname || "",
    mimeType: file.mimetype || "",
    size: file.size || buffer.length,
  };
}

async function resolveDocumentViewUrl(sourceDocument) {
  if (!sourceDocument) return "";
  if (sourceDocument.storage === "firebase" && sourceDocument.firebasePath) {
    const bucket = getStorageBucket();
    if (!bucket) return sourceDocument.path || "";
    try {
      const [url] = await bucket.file(sourceDocument.firebasePath).getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });
      return url;
    } catch (error) {
      console.error("Firebase signed URL error:", error.message);
      return sourceDocument.path || "";
    }
  }
  return sourceDocument.path || "";
}

async function deleteFirebaseFile(firebasePath) {
  if (!firebasePath) return;
  const bucket = getStorageBucket();
  if (!bucket) return;
  try {
    await bucket.file(firebasePath).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error("Firebase delete error:", error.message);
  }
}

function deleteLocalUpload(relativePath) {
  if (!relativePath || !relativePath.startsWith("/uploads/")) return;
  const localPath = path.join(__dirname, "..", relativePath.replace(/^\//, ""));
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
  }
}

async function enrichRecordDocument(record) {
  if (!record || record.recordType !== "document" || !record.sourceDocument) return record;
  const viewUrl = await resolveDocumentViewUrl(record.sourceDocument);
  if (!viewUrl) return record;
  return {
    ...record,
    sourceDocument: {
      ...record.sourceDocument,
      path: viewUrl,
    },
  };
}

async function enrichRecords(records) {
  return Promise.all((records || []).map((r) => enrichRecordDocument(r)));
}

module.exports = {
  useFirebaseStorage,
  uploadExportDocument,
  resolveDocumentViewUrl,
  deleteFirebaseFile,
  deleteLocalUpload,
  enrichRecordDocument,
  enrichRecords,
};
