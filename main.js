import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { listPublished } from "./gallery.js";
import { submitRequest } from "./requests.js";
import { uploadFile, optimized } from "./cloudinary.js";
const $ = (s, r = document) => r.querySelector(s);
export function toast(msg, type = "ok") {
  const t = document.createElement("div"); t.className = `toast ${type}`; t.setAttribute("role", "status"); t.textContent = msg;
  $("#toasts").append(t); setTimeout(() => t.remove(), 4500);
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);

$("#menuBtn").onclick = () => { const o = document.body.classList.toggle("nav-open"); $("#menuBtn").setAttribute("aria-expanded", o); };
document.querySelectorAll("#nav a").forEach(a => a.onclick = () => document.body.classList.remove("nav-open"));

async function loadSite() {
  let s = {};
  try { const d = await getDoc(doc(db, "settings", "site")); if (d.exists()) s = d.data(); } catch (e) { console.error(e); }
  const empty = "Coming soon.";
  $("#heroIntro").textContent = s.intro || "Fashion design and styling, crafted with intention.";
  $("#bio").textContent = s.bio || empty;
  for (const k of ["education", "experience", "skills", "achievements"]) {
    const items = lines(s[k]);
    $("#" + k).innerHTML = items.length ? items.map(i => `<li>${esc(i)}</li>`).join("") : `<li class="muted">${empty}</li>`;
  }
  if (s.photoUrl) document.querySelectorAll(".ph").forEach(i => i.src = optimized(s.photoUrl, 700));
  if (s.cvUrl) { const a = $("#cvLink"); a.href = s.cvUrl; a.hidden = false; }
  const links = [["Email", s.email && "mailto:" + s.email, s.email], ["Phone", s.phone && "tel:" + s.phone, s.phone],
    ["WhatsApp", s.whatsapp && "https://wa.me/" + s.whatsapp.replace(/\D/g, ""), s.whatsapp], ["Instagram", s.instagram, s.instagram]];
  lines(s.otherLinks).forEach(l => { const [n, u] = l.includes("|") ? l.split("|").map(x => x.trim()) : [l, l]; links.push([n, u, n]); });
  const ok = links.filter(l => l[1] && /^(https?:|mailto:|tel:)/.test(l[1]));
  $("#contactList").innerHTML = ok.length ? ok.map(([n, h, t]) => `<li><span>${esc(n)}</span><a href="${esc(h)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("") : `<li class="muted">Contact details will appear here.</li>`;
}

let items = [], cat = "All", idx = 0, vis = [];
function renderGallery() {
  const cats = ["All", ...new Set(items.map(i => i.category).filter(Boolean))];
  $("#filters").innerHTML = cats.map(c => `<button class="chip ${c === cat ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
  vis = items.filter(i => cat === "All" || i.category === cat);
  $("#grid").innerHTML = vis.length ? vis.map((i, n) => `<button class="card" data-n="${n}" aria-label="Open ${esc(i.title)}">
    <img loading="lazy" src="${esc(optimized(i.imageUrl, 700))}" alt="${esc(i.title)}"><span><b>${esc(i.title)}</b><small>${esc(i.category || "")}</small></span></button>`).join("") : `<p class="muted">No work has been published yet.</p>`;
}
$("#filters").onclick = e => { const c = e.target.closest("[data-c]"); if (c) { cat = c.dataset.c; renderGallery(); } };
$("#grid").onclick = e => { const c = e.target.closest("[data-n]"); if (c) openLb(+c.dataset.n); };
function openLb(n) {
  idx = (n + vis.length) % vis.length; const i = vis[idx];
  $("#lbImg").src = optimized(i.imageUrl, 1600); $("#lbImg").alt = i.title;
  $("#lbCap").innerHTML = `<b>${esc(i.title)}</b> ${esc(i.description || "")}`; $("#lb").hidden = false; $("#lbClose").focus();
}
$("#lbClose").onclick = () => $("#lb").hidden = true;
$("#lbPrev").onclick = () => openLb(idx - 1); $("#lbNext").onclick = () => openLb(idx + 1);
document.addEventListener("keydown", e => { if ($("#lb").hidden) return; if (e.key === "Escape") $("#lb").hidden = true; if (e.key === "ArrowLeft") openLb(idx - 1); if (e.key === "ArrowRight") openLb(idx + 1); });
async function loadGallery() {
  try { items = await listPublished(); renderGallery(); }
  catch (e) { console.error(e); $("#grid").innerHTML = `<p class="muted">The gallery could not be loaded. Refresh to try again.</p>`; }
}

const form = $("#reqForm");
form.onsubmit = async e => {
  e.preventDefault();
  const btn = $("button[type=submit]", form); if (btn.disabled) return;
  const v = Object.fromEntries(new FormData(form)); let bad = false;
  for (const k of ["fullName", "contactInfo", "requestType", "description"]) {
    const miss = !String(v[k] || "").trim() || (k === "description" && v[k].trim().length < 10);
    form.elements[k].closest(".field").classList.toggle("err", miss); bad ||= miss;
  }
  if (bad) return toast("Please complete the highlighted fields.", "err");
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    let attachmentUrl = ""; const file = form.elements.attachment.files[0];
    if (file) attachmentUrl = (await uploadFile(file, 5)).url;
    await submitRequest({ ...v, fullName: v.fullName.trim(), contactInfo: v.contactInfo.trim(), description: v.description.trim(), attachmentUrl });
    form.hidden = true; $("#reqDone").hidden = false; toast("Your request has been sent.");
  } catch (err) {
    console.error(err); toast(err.code === "permission-denied" ? "The request could not be saved. Please try again later." : err.message || "Something went wrong.", "err");
    btn.disabled = false; btn.textContent = "Send request";
  }
};
$("#again").onclick = () => { form.reset(); form.hidden = false; $("#reqDone").hidden = true; const b = $("button[type=submit]", form); b.disabled = false; b.textContent = "Send request"; };

const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && (x.target.classList.add("in"), io.unobserve(x.target))), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));
loadSite(); loadGallery();
