import { useSyncExternalStore } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

/** undefined until Firebase has restored (or ruled out) a saved session. */
let user: User | null | undefined;
const listeners = new Set<() => void>();

onAuthStateChanged(auth, (u) => {
  user = u;
  listeners.forEach((l) => l());
});

export function onUserChange(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const currentUser = () => user;

export function useUser() {
  return useSyncExternalStore(onUserChange, currentUser);
}

export const signIn = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signUp = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const signOut = () => fbSignOut(auth);

/** Firebase error codes → something a person can act on. */
export function authErrorMessage(e: unknown) {
  const code = (e as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Sign in instead.";
    case "auth/weak-password":
      return "Pick a password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "Couldn't reach the server. Check your connection.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "New accounts are turned off.";
    default:
      return "Something went wrong. Try again.";
  }
}
