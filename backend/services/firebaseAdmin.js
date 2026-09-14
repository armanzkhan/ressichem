const admin = require("firebase-admin");

let initAttempted = false;

function isFirebaseConfigured() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function initializeFirebaseAdmin() {
  if (initAttempted && admin.apps.length) return true;
  if (!isFirebaseConfigured()) return false;

  try {
    if (!admin.apps.length) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      };

      const options = {
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      };

      const bucket = process.env.FIREBASE_STORAGE_BUCKET;
      if (bucket) options.storageBucket = bucket;

      admin.initializeApp(options);
      console.log("Firebase Admin SDK initialized successfully");
    }
    initAttempted = true;
    return true;
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    initAttempted = true;
    return false;
  }
}

function getAdmin() {
  return initializeFirebaseAdmin() ? admin : null;
}

function getStorageBucket() {
  if (!initializeFirebaseAdmin()) return null;
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  try {
    return admin.storage().bucket(bucketName);
  } catch (error) {
    console.error("Firebase Storage bucket unavailable:", error.message);
    return null;
  }
}

module.exports = {
  isFirebaseConfigured,
  initializeFirebaseAdmin,
  getAdmin,
  getStorageBucket,
};
