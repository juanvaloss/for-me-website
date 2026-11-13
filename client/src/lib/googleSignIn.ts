// Google Identity Services, the script behind the "Sign in with Google" button.
const SCRIPT_URL = "https://accounts.google.com/gsi/client?hl=es";

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export interface GoogleButtonOptions {
  theme: "outline" | "filled_blue" | "filled_black";
  size: "large" | "medium" | "small";
  shape: "rectangular" | "pill";
  text: "signin_with" | "continue_with";
  locale: string;
  width: string;
}

interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let ready: Promise<GoogleId> | null = null;
let credentialHandler: ((credential: string) => void) | null = null;

/** Google allows one initialize() per page, so the mounted button takes the callback. */
export function setCredentialHandler(handler: ((credential: string) => void) | null) {
  credentialHandler = handler;
}

/** Loads the script once; rejects when it is blocked (ad blockers, offline). */
export function loadGoogleSignIn(): Promise<GoogleId> {
  ready ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const id = window.google!.accounts.id;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => credentialHandler?.(credential),
      });
      resolve(id);
    };
    script.onerror = () => {
      ready = null;
      script.remove();
      reject(new Error("Google Identity Services did not load"));
    };
    document.head.append(script);
  });
  return ready;
}
