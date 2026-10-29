import { ApiError } from "../api/http";

// The API answers in English with stable codes; the storefront speaks Spanish.
const MESSAGES: Record<string, string> = {
  email_taken: "Ya existe una cuenta con este correo.",
  invalid_credentials: "Correo o contraseña incorrectos.",
  password_too_short: "La contraseña debe tener al menos 8 caracteres.",
  password_too_common: "Esa contraseña es muy común, elige otra.",
  password_entirely_numeric: "La contraseña no puede tener solo números.",
  password_too_similar: "La contraseña se parece demasiado a tus datos.",
  invalid_phone: "Escribe un teléfono válido de 10 dígitos.",
  invalid_postal_code: "El código postal debe tener 5 dígitos.",
  incomplete_shipping_details: "Completa tus datos de envío para continuar.",
  variant_unavailable: "Algunas piezas de tu bolsa ya no están disponibles.",
  order_not_cancellable: "Este pedido ya no se puede cancelar.",
  not_authenticated: "Inicia sesión para continuar.",
  permission_denied: "Tu sesión expiró. Recarga la página e intenta de nuevo.",
  throttled: "Demasiados intentos. Espera un minuto e intenta de nuevo.",
  required: "Este campo es obligatorio.",
  blank: "Este campo es obligatorio.",
  null: "Este campo es obligatorio.",
  max_length: "Es demasiado largo.",
  max_value: "Es más de lo disponible.",
  network: "No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.",
  server_error: "Algo salió mal de nuestro lado. Intenta de nuevo en un momento.",
};

const FIELD_MESSAGES: Record<string, Record<string, string>> = {
  email: { invalid: "Escribe un correo válido." },
};

function translate(code: string, field?: string): string {
  return (
    (field && FIELD_MESSAGES[field]?.[code]) ??
    MESSAGES[code] ??
    "Revisa los datos e intenta de nuevo."
  );
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }
  const first = error.fields[field]?.[0];
  return first ? translate(first.code, field) : undefined;
}

export function formError(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }
  if (!(error instanceof ApiError)) {
    return MESSAGES.server_error;
  }
  if (error.code === "out_of_stock") {
    const { product_name, color_name, size, available } = error.meta;
    return `Ya no hay suficientes piezas de ${product_name} ${color_name} talla ${size} (quedan ${available}). Ajustamos tu bolsa.`;
  }
  const nonField = error.fields.non_field_errors?.[0];
  if (nonField) {
    return translate(nonField.code);
  }
  if (error.code === "invalid") {
    return Object.keys(error.fields).length ? undefined : translate("invalid");
  }
  return translate(error.code);
}
