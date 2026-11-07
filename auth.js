import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export const login = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const logout = () => signOut(auth);
// Admin = a document exists at admins/{uid}; rules only let a user read their own.
export async function isAdmin(user) {
  try { return (await getDoc(doc(db, "admins", user.uid))).exists(); } catch { return false; }
}
export function watchAdmin(cb) {
  onAuthStateChanged(auth, async u => cb(u && (await isAdmin(u)) ? u : null, u));
}
