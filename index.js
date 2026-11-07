// Deletes a Cloudinary asset. Secrets live in function config, never in the browser.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;
admin.initializeApp();
const KEY = defineSecret("CLOUDINARY_API_KEY"), SECRET = defineSecret("CLOUDINARY_API_SECRET");
exports.deleteCloudinaryImage = onCall({ secrets: [KEY, SECRET] }, async req => {
  const uid = req.auth?.uid;
  if (!uid || !(await admin.firestore().doc(`admins/${uid}`).get()).exists) throw new HttpsError("permission-denied", "Admins only.");
  const id = req.data?.publicId;
  if (typeof id !== "string" || !id || id.length > 200) throw new HttpsError("invalid-argument", "publicId required.");
  cloudinary.config({ cloud_name: "fkmbapdm", api_key: KEY.value(), api_secret: SECRET.value() });
  return cloudinary.uploader.destroy(id, { invalidate: true });
});
