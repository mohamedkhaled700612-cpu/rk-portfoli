export const CLOUDINARY_CLOUD_NAME = "fkmbapdm";
export const CLOUDINARY_UPLOAD_PRESET = "rk-fashion";
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
const OK = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];
export function checkFile(f, maxMB = 8) {
  if (!OK.includes(f.type)) throw new Error("Use a JPG, PNG, WebP, AVIF or PDF file.");
  if (f.size > maxMB * 1048576) throw new Error(`File is larger than ${maxMB} MB.`);
}
export async function uploadFile(file, maxMB = 8) {
  checkFile(file, maxMB);
  const fd = new FormData();
  fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const r = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: fd });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "Upload failed.");
  return { url: d.secure_url, publicId: d.public_id };
}
export const optimized = (url, w = 800) => url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`);
