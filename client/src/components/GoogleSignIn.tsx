import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/auth";
import { formError } from "../lib/errors";
import { loadGoogleSignIn, setCredentialHandler } from "../lib/googleSignIn";
import styles from "./AuthForms.module.css";

// Google draws its own button, at most 400px wide.
const MAX_BUTTON_WIDTH = 400;

export function GoogleSignIn() {
  const { loginWithGoogle } = useAuth();
  const buttonSlot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<unknown>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    setCredentialHandler((credential) => {
      setError(null);
      loginWithGoogle(credential).catch(setError);
    });
    return () => setCredentialHandler(null);
  }, [loginWithGoogle]);

  useEffect(() => {
    let isMounted = true;
    loadGoogleSignIn().then(
      (google) => {
        const slot = buttonSlot.current;
        if (isMounted && slot) {
          google.renderButton(slot, {
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            locale: "es",
            width: String(Math.min(slot.clientWidth, MAX_BUTTON_WIDTH)),
          });
        }
      },
      () => isMounted && setIsBlocked(true),
    );
    return () => {
      isMounted = false;
    };
  }, []);

  if (isBlocked) {
    return null;
  }
  return (
    <div className={styles.google}>
      <div ref={buttonSlot} className={styles.googleButton} />
      {formError(error) && <p className="form-error">{formError(error)}</p>}
      <p className={styles.divider}>o con tu correo</p>
    </div>
  );
}
