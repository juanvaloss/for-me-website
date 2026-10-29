import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";

import { useAuth } from "../context/auth";
import { fieldError, formError } from "../lib/errors";
import styles from "./AuthForms.module.css";
import { Field } from "./Field";

type Mode = "login" | "register";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "login", label: "Iniciar sesión" },
  { mode: "register", label: "Crear cuenta" },
];

export function AuthForms() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className={styles.auth}>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={mode === tab.mode}
            className={`${styles.tab} ${mode === tab.mode ? styles.activeTab : ""}`}
            onClick={() => setMode(tab.mode)}
          >
            {tab.label}
            {mode === tab.mode && (
              <motion.span layoutId="auth-tab" className={styles.underline} />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
        >
          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      await login({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
    } catch (caught) {
      setError(caught);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldError(error, "email")}
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldError(error, "password")}
      />
      {formError(error) && <p className="form-error">{formError(error)}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        first_name: String(data.get("first_name")),
        last_name: String(data.get("last_name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
    } catch (caught) {
      setError(caught);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field
          label="Nombre"
          name="first_name"
          autoComplete="given-name"
          required
          error={fieldError(error, "first_name")}
        />
        <Field
          label="Apellido"
          name="last_name"
          autoComplete="family-name"
          error={fieldError(error, "last_name")}
        />
      </div>
      <Field
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldError(error, "email")}
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres y que no sean solo números."
        error={fieldError(error, "password")}
      />
      {formError(error) && <p className="form-error">{formError(error)}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
        {isSubmitting ? "Creando tu cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
