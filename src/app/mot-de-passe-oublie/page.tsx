'use client';

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        {sent ? (
          <p className="rounded bg-green-50 p-3 text-green-700">
            Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Entrez votre email, vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full rounded border p-3"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 p-3 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </>
        )}
      </form>
      <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
        Retour à la connexion
      </Link>
    </div>
  );
}
