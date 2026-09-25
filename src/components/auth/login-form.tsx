"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="login-form">
      <fieldset disabled={pending}>
        <label htmlFor="email">Alamat email</label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="nama@email.com"
          maxLength={254}
          required
        />
        <label htmlFor="password">Kata sandi</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            maxLength={128}
            required
          />
          <button
            className="icon-button"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </fieldset>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button button-primary full-width" disabled={pending}>
        {pending ? <LoaderCircle size={19} className="spin" /> : <ArrowRight size={19} />}
        {pending ? "Sedang masuk…" : "Masuk ke buku kas"}
      </button>
      <p className="login-note">
        <LockKeyhole size={15} />
        Tetap masuk selama 30 hari di perangkat pribadi.
      </p>
    </form>
  );
}
