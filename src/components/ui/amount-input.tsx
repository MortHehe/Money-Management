"use client";

import { formatNumber } from "@/lib/format";

interface AmountInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  large?: boolean;
}

export function AmountInput({
  id,
  value,
  onChange,
  disabled,
  large = false,
}: AmountInputProps) {
  return (
    <div className={`amount-input ${large ? "amount-input-large" : ""}`}>
      <span aria-hidden="true">Rp</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-label="Nominal dalam rupiah"
        value={value ? formatNumber(Number(value)) : ""}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 12))}
        disabled={disabled}
      />
    </div>
  );
}
