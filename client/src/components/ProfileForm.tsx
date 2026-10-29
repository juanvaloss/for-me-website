import { useState, type ChangeEvent, type FormEvent } from "react";

import type { Profile, ProfileUpdate } from "../api/types";
import { useAuth } from "../context/auth";
import { fieldError, formError } from "../lib/errors";
import { Field } from "./Field";
import { CheckIcon } from "./icons";

const EDITABLE_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "address_line",
  "neighborhood",
  "city",
  "state",
  "postal_code",
] as const;

type Values = Required<Pick<ProfileUpdate, (typeof EDITABLE_FIELDS)[number]>>;

function toValues(profile: Profile): Values {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, profile[field]]),
  ) as Values;
}

interface ProfileFormProps {
  profile: Profile;
  submitLabel?: string;
  onSaved?: (profile: Profile) => void;
}

export function ProfileForm({
  profile,
  submitLabel = "Guardar cambios",
  onSaved,
}: ProfileFormProps) {
  const { updateProfile } = useAuth();
  const [values, setValues] = useState<Values>(() => toValues(profile));
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const bind = (field: keyof Values) => ({
    name: field,
    value: values[field],
    error: fieldError(error, field),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setStatus("idle");
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const saved = await updateProfile(values);
      setValues(toValues(saved));
      setStatus("saved");
      onSaved?.(saved);
    } catch (caught) {
      setError(caught);
      setStatus("idle");
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Nombre" autoComplete="given-name" {...bind("first_name")} />
        <Field label="Apellido" autoComplete="family-name" {...bind("last_name")} />
        <Field
          label="Teléfono (WhatsApp)"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="33 1234 5678"
          className="span-2"
          {...bind("phone")}
        />
        <Field
          label="Calle y número"
          autoComplete="address-line1"
          className="span-2"
          {...bind("address_line")}
        />
        <Field label="Colonia" autoComplete="address-line2" {...bind("neighborhood")} />
        <Field
          label="Código postal"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={5}
          {...bind("postal_code")}
        />
        <Field label="Ciudad" autoComplete="address-level2" placeholder="Guadalajara" {...bind("city")} />
        <Field label="Estado" autoComplete="address-level1" placeholder="Jalisco" {...bind("state")} />
      </div>
      {formError(error) && <p className="form-error">{formError(error)}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : submitLabel}
        </button>
      </div>
      {status === "saved" && (
        <p className="form-success" role="status">
          <CheckIcon size={16} /> Tus datos quedaron guardados.
        </p>
      )}
    </form>
  );
}
