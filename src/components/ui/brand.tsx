import { Wallet } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="Catat Uang">
      <span className="brand-icon">
        <Wallet size={24} strokeWidth={1.8} />
      </span>
      <span>
        catat<span className="brand-light">uang</span>
        <span className="brand-dot">.</span>
      </span>
    </div>
  );
}
