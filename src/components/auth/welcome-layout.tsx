import type { ReactNode } from "react";
import { Check, Sprout, Wallet } from "lucide-react";
import { Brand } from "@/components/ui/brand";

export function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <main className="welcome-layout">
      <section className="welcome-story">
        <Brand />
        <div className="welcome-copy">
          <span className="welcome-tag">
            <Sprout size={16} />
            Kebiasaan kecil, manfaat besar
          </span>
          <h1>
            Uang tercatat.
            <br />
            Pikiran lebih
            <br />
            <em>tenang.</em>
          </h1>
          <p>
            Buku kas sederhana untuk keseharian.
            <br />
            Mudah dicatat, mudah dilihat, dari mana saja.
          </p>
          <div className="welcome-features">
            <span>
              <Check size={17} />
              Saldo dihitung otomatis
            </span>
            <span>
              <Check size={17} />
              Nyaman di HP dan laptop
            </span>
            <span>
              <Check size={17} />
              Catatan tersimpan rapi
            </span>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-card">
            <span>
              <Wallet size={20} />
              Buku kas keluarga
            </span>
            <strong>
              Satu langkah
              <br />
              lebih teratur.
            </strong>
            <div className="art-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="art-circle" />
        </div>
        <span className="welcome-footer">Catat hari ini. Nikmati tenangnya nanti.</span>
      </section>
      <section className="welcome-form-area">
        <div className="welcome-form-inner">{children}</div>
        <span className="welcome-form-footer">
          catatuang. <span aria-hidden="true">·</span> Dibuat untuk keseharian.
        </span>
      </section>
    </main>
  );
}
