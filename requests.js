import { db } from "./firebase-config.js";
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const col = collection(db, "requests");
export const submitRequest = x => addDoc(col, { fullName: x.fullName, contactInfo: x.contactInfo, requestType: x.requestType,
  description: x.description, attachmentUrl: x.attachmentUrl || "", status: "Pending", adminNotes: "",
  createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const listRequests = async () => (await getDocs(query(col, orderBy("createdAt", "desc")))).docs.map(d => ({ id: d.id, ...d.data() }));
export const updateRequest = (id, x) => updateDoc(doc(db, "requests", id), { ...x, updatedAt: serverTimestamp() });
export const deleteRequest = id => deleteDoc(doc(db, "requests", id));
