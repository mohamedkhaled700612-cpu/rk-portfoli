import { db, app } from "./firebase-config.js";
import { login, logout, watchAdmin } from "./auth.js";
import { listRequests, updateRequest, deleteRequest } from "./requests.js";
import { listAll, addImage, updateImage, deleteImage } from "./gallery.js";
import { uploadFile, optimized } from "./cloudinary.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (m, t = "ok") => { const e = document.createElement("div"); e.className = "toast " + t; e.textContent = m; $("#toasts").append(e); setTimeout(() => e.remove(), 4500); };
const fmt = ts => ts?.toDate ? ts.toDate().toLocaleString() : "—";
let reqs = [], imgs = [];

watchAdmin(async (admin, user) => {
  $("#loginView").hidden = !!admin; $("#app").hidden = !admin;
  if (user && !admin) { $("#loginErr").textContent = "This account is not authorised for the dashboard."; await logout(); }
  if (admin) refresh();
});
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#loginErr").textContent = ""; const f = e.target, b = $("button", f); b.disabled = true;
  try { await login(f.email.value.trim(), f.password.value); f.password.value = ""; }
  catch { $("#loginErr").textContent = "Email or password is incorrect."; } finally { b.disabled = false; }
};
$("#logout").onclick = () => logout();
$("#tabs").onclick = e => { const t = e.target.dataset.t; if (!t) return;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b === e.target));
  document.querySelectorAll("main > section").forEach(s => s.hidden = s.id !== "t-" + t); };

async function refresh() {
  try { [reqs, imgs] = await Promise.all([listRequests(), listAll()]); } catch (e) { console.error(e); return toast("Data could not be loaded. Check the Firestore rules and admin UID.", "err"); }
  const n = s => reqs.filter(r => r.status === s).length;
  $("#stats").innerHTML = [["Total requests", reqs.length], ["Pending", n("Pending")], ["Approved", n("Approved")], ["Rejected", n("Rejected")], ["Gallery images", imgs.length]].map(([l, v]) => `<div class="stat"><b>${v}</b>${l}</div>`).join("");
  renderReqs(); renderImgs(); loadSite();
}

function renderReqs() {
  const q = $("#q").value.toLowerCase(), sf = $("#sf").value;
  const list = reqs.filter(r => (!sf || r.status === sf) && (!q || [r.fullName, r.contactInfo, r.description, r.requestType].join(" ").toLowerCase().includes(q)));
  $("#reqList").innerHTML = list.length ? list.map(r => `<details class="rq" data-id="${r.id}"><summary><span><b>${esc(r.fullName)}</b> · ${esc(r.requestType)}</span><span><span class="tag ${r.status}">${r.status}</span> ${fmt(r.createdAt)}</span></summary>
    <div class="body"><p><b>Contact:</b> ${esc(r.contactInfo)}</p><p>${esc(r.description)}</p>${r.attachmentUrl ? `<a href="${esc(r.attachmentUrl)}" target="_blank" rel="noopener">Open attachment</a>` : ""}
    <label>Status <select class="st">${["Pending", "Approved", "Rejected"].map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label>Internal notes (private)<textarea class="nt" rows="3">${esc(r.adminNotes)}</textarea></label>
    <div class="row"><button class="btn sm" data-a="save">Save</button><button class="btn ghost sm" data-a="Approved">Approve</button><button class="btn ghost sm" data-a="Rejected">Reject</button><button class="btn ghost sm" data-a="del">Delete</button></div></div></details>`).join("") : `<p class="muted">No requests match.</p>`;
}
$("#q").oninput = renderReqs; $("#sf").onchange = renderReqs;
$("#reqList").onclick = async e => {
  const a = e.target.dataset.a; if (!a) return; const box = e.target.closest(".rq"), id = box.dataset.id;
  try {
    if (a === "del") { if (!confirm("Delete this request permanently?")) return; await deleteRequest(id); toast("Request deleted."); }
    else { const status = a === "save" ? $(".st", box).value : a; await updateRequest(id, { status, adminNotes: $(".nt", box).value.slice(0, 2000) }); toast(a === "save" ? "Saved." : status + "."); }
    const open = !!box.open; await refresh(); if (open) $(`[data-id="${id}"]`)?.setAttribute("open", "");
  } catch (err) { console.error(err); toast("The change was not saved.", "err"); }
};

function renderImgs() {
  $("#cats").innerHTML = [...new Set(imgs.map(i => i.category).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join("");
  $("#imgList").innerHTML = imgs.length ? imgs.map(i => `<div class="ai ${i.isPublished ? "" : "off"}" data-id="${i.id}"><a href="${esc(i.imageUrl)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(optimized(i.imageUrl, 400))}" alt="${esc(i.title)}"></a>
    <div><b>${esc(i.title)}</b><br><small>${esc(i.category || "No category")} · ${i.isPublished ? "Published" : "Unpublished"}</small>
    <div class="row"><button class="btn ghost sm" data-a="edit">Edit</button><button class="btn ghost sm" data-a="pub">${i.isPublished ? "Unpublish" : "Publish"}</button><button class="btn ghost sm" data-a="del">Delete</button></div></div></div>`).join("") : `<p class="muted">No images yet. Add the first one above.</p>`;
}
const imgForm = $("#imgForm");
const resetImg = () => { imgForm.reset(); imgForm.id.value = ""; imgForm.isPublished.checked = true; $("#imgHead").textContent = "Add an image"; $("#imgCancel").hidden = true; };
$("#imgCancel").onclick = resetImg;
imgForm.onsubmit = async e => {
  e.preventDefault(); const b = $("button[type=submit]", imgForm); b.disabled = true; b.textContent = "Saving…";
  try {
    const id = imgForm.id.value, f = imgForm.file.files[0];
    const data = { title: imgForm.title.value.trim(), description: imgForm.description.value.trim(), category: imgForm.category.value.trim(), isPublished: imgForm.isPublished.checked };
    if (!id && !f) throw new Error("Choose an image to upload.");
    if (f) { const up = await uploadFile(f, 8); data.imageUrl = up.url; data.cloudinaryPublicId = up.publicId; }
    if (id) { await updateImage(id, data); if (f) await removeAsset(imgs.find(i => i.id === id)?.cloudinaryPublicId); } else await addImage(data);
    toast("Image saved."); resetImg(); await refresh();
  } catch (err) { console.error(err); toast(err.message || "The image was not saved.", "err"); } finally { b.disabled = false; b.textContent = "Save image"; }
};
async function removeAsset(publicId) {
  if (!publicId) return;
  try { await httpsCallable(getFunctions(app), "deleteCloudinaryImage")({ publicId }); }
  catch (e) { console.error(e); toast("Record removed, but the Cloudinary file needs the delete function deployed.", "err"); }
}
$("#imgList").onclick = async e => {
  const a = e.target.dataset.a; if (!a) return; const id = e.target.closest(".ai").dataset.id, i = imgs.find(x => x.id === id);
  try {
    if (a === "edit") { for (const k of ["title", "category", "description"]) imgForm[k].value = i[k] || ""; imgForm.id.value = id; imgForm.isPublished.checked = i.isPublished; $("#imgHead").textContent = "Edit image (choose a file only to replace it)"; $("#imgCancel").hidden = false; imgForm.scrollIntoView({ behavior: "smooth" }); }
    if (a === "pub") { await updateImage(id, { isPublished: !i.isPublished }); toast(i.isPublished ? "Unpublished." : "Published."); await refresh(); }
    if (a === "del") { if (!confirm("Delete this image everywhere?")) return; await deleteImage(id); await removeAsset(i.cloudinaryPublicId); toast("Image deleted."); await refresh(); }
  } catch (err) { console.error(err); toast("That action failed.", "err"); }
};

const siteForm = $("#siteForm"); let site = {};
async function loadSite() {
  site = (await getDoc(doc(db, "settings", "site"))).data() || {};
  for (const k of ["intro", "bio", "education", "experience", "skills", "achievements", "email", "phone", "whatsapp", "instagram", "otherLinks"]) siteForm[k].value = site[k] || "";
  $("#cvNow").innerHTML = site.cvUrl ? `Current CV: <a href="${esc(site.cvUrl)}" target="_blank" rel="noopener">open</a>` : "No CV uploaded yet.";
}
siteForm.onsubmit = async e => {
  e.preventDefault(); const b = $("button", siteForm); b.disabled = true;
  try {
    const d = {}; for (const k of ["intro", "bio", "education", "experience", "skills", "achievements", "email", "phone", "whatsapp", "instagram", "otherLinks"]) d[k] = siteForm[k].value.trim();
    d.cvUrl = site.cvUrl || ""; d.photoUrl = site.photoUrl || ""; const ph = siteForm.photo.files[0]; if (ph) d.photoUrl = (await uploadFile(ph, 8)).url; const f = siteForm.cv.files[0]; if (f) d.cvUrl = (await uploadFile(f, 8)).url;
    await setDoc(doc(db, "settings", "site"), { ...d, updatedAt: serverTimestamp() }); siteForm.cv.value = ""; siteForm.photo.value = ""; toast("Site content saved."); loadSite();
  } catch (err) { console.error(err); toast(err.message || "Site content was not saved.", "err"); } finally { b.disabled = false; }
};
