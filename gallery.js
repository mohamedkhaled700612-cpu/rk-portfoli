import { db } from "./firebase-config.js";
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const col = collection(db, "gallery");
const rows = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
export const listPublished = async () => rows(await getDocs(query(col, where("isPublished", "==", true), orderBy("createdAt", "desc"))));
export const listAll = async () => rows(await getDocs(query(col, orderBy("createdAt", "desc"))));
export const addImage = x => addDoc(col, { ...x, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateImage = (id, x) => updateDoc(doc(db, "gallery", id), { ...x, updatedAt: serverTimestamp() });
export const deleteImage = id => deleteDoc(doc(db, "gallery", id));
