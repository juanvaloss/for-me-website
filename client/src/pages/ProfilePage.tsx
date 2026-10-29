import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import type { Profile } from "../api/types";
import meliImage from "../assets/images/founder-meli.webp";
import { AuthForms } from "../components/AuthForms";
import { OrderHistory } from "../components/OrderHistory";
import { ParallaxImage } from "../components/ParallaxImage";
import { ProfileForm } from "../components/ProfileForm";
import { MaskedLines } from "../components/Reveal";
import { useAuth } from "../context/auth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./ProfilePage.module.css";

type Tab = "orders" | "details";

const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Mis pedidos" },
  { id: "details", label: "Mis datos" },
];

export function ProfilePage() {
  const { user, isReady } = useAuth();
  useDocumentTitle(user ? "Mi perfil · forme" : "Iniciar sesión · forme");

  if (!isReady) {
    return <div className={styles.loading} />;
  }
  return user ? <Account user={user} /> : <SignIn />;
}

function SignIn() {
  return (
    <div className={`container ${styles.signIn}`}>
      <div className={styles.visual}>
        <ParallaxImage
          src={meliImage}
          alt="Meli, fundadora de forme"
          shape="arch"
          strength={5}
          priority
          className={styles.visualImage}
        />
        <p className={styles.visualQuote}>
          <em>“sentirte segura siendo tú.”</em>
        </p>
      </div>
      <div className={styles.panel}>
        <span className="kicker">Mi cuenta</span>
        <h1 className={styles.title}>
          <MaskedLines
            immediate
            delay={0.1}
            lines={[
              "Tu espacio",
              <span key="brand">
                en <em>forme</em>
              </span>,
            ]}
          />
        </h1>
        <p className={styles.lead}>
          Guarda tus datos de envío, haz tus pedidos y revisa en qué va cada
          uno.
        </p>
        <AuthForms />
      </div>
    </div>
  );
}

function Account({ user }: { user: Profile }) {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>(user.has_shipping_details ? "orders" : "details");

  return (
    <div className={`container ${styles.account}`}>
      <header className={styles.accountHead}>
        <div>
          <span className="kicker">Mi cuenta</span>
          <h1 className={styles.title}>
            <MaskedLines
              immediate
              delay={0.1}
              lines={[
                <span key="hello">
                  Hola, <em>{user.first_name}</em>
                </span>,
              ]}
            />
          </h1>
          <p className={styles.email}>{user.email}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </header>

      {!user.has_shipping_details && (
        <p className={styles.notice}>
          Completa tus datos de envío para poder hacer pedidos.
        </p>
      )}

      <div className={styles.tabs} role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles.tab} ${tab === item.id ? styles.activeTab : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {tab === item.id && (
              <motion.span layoutId="account-tab" className={styles.underline} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={tab}
          className={styles.tabPanel}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
        >
          {tab === "orders" ? <OrderHistory /> : <ProfileForm profile={user} />}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
