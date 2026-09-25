import { ChevronDown, Share, Smartphone } from "lucide-react";

/** Safari memasang aplikasi melalui menu Bagikan milik browser. */
export function AppleInstallGuide() {
  return (
    <details className="apple-install-guide">
      <summary>
        <Smartphone size={21} aria-hidden="true" />
        <span>Pasang di iPhone / iPad</span>
        <ChevronDown size={18} className="install-chevron" aria-hidden="true" />
      </summary>
      <div className="apple-install-content">
        <p>Buka Catat Uang langsung dari ikon di layar utama.</p>
        <ol>
          <li>
            Buka alamat aplikasi ini di <strong>Safari</strong>.
          </li>
          <li>
            Ketuk <strong>Bagikan</strong> <Share size={17} aria-hidden="true" />. Jika
            tersembunyi, buka menu <strong>Lainnya (…)</strong> terlebih dahulu.
          </li>
          <li>
            Pilih <strong>Tambah ke Layar Utama</strong> (Add to Home Screen).
          </li>
          <li>
            Aktifkan <strong>Buka sebagai App Web</strong> jika tersedia, lalu ketuk{" "}
            <strong>Tambah</strong>.
          </li>
        </ol>
        <p>
          Buka ikon Catat Uang dan masuk ke akun keluarga. Pencatatan tetap memerlukan
          internet.
        </p>
      </div>
    </details>
  );
}
