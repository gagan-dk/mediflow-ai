import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../firebase/config";

// Interface mimicking Gagan's backend auth response structure for the login payload
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

/**
 * Maps Firebase Auth errors to user-friendly messages.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (import.meta.env.DEV) {
    console.error("Firebase authentication error:", error);
  }

  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters).";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/password authentication is not enabled in Firebase Console.";
    case "auth/invalid-api-key":
      return "Firebase configuration is incorrect (Invalid API Key).";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not initialized. Please click 'Get Started' in the Firebase Console Authentication tab.";
    default:
      return `Authentication failed: ${error.message}`;
  }
}

export async function loginUser(payload: LoginPayload): Promise<FirebaseUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    return userCredential.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function registerUser(payload: RegisterPayload): Promise<FirebaseUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    
    if (payload.full_name) {
      await updateProfile(userCredential.user, {
        displayName: payload.full_name
      });
      await userCredential.user.reload();
    }
    
    return auth.currentUser || userCredential.user;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
