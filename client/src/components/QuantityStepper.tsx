import { MinusIcon, PlusIcon } from "./icons";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, max, onChange }: QuantityStepperProps) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Quitar una pieza"
      >
        <MinusIcon size={14} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Agregar una pieza"
        title={value >= max ? "No hay más piezas disponibles" : undefined}
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}
