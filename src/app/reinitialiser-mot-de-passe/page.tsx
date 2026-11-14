'use client';

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) return <p className="p-4 text-red-600">URL invalide : token manquant.</p>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setMessage("Mot de passe réinitialisé avec succès.");
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border p-6 shadow-xl">
      <h1 className="text-2xl font-bold">Réinitialiser le mot de passe</h1>
      {message && <p className="rounded bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nouveau mot de passe"
        required
        className="w-full rounded border p-3"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirmer le mot de passe"
        required
        className="w-full rounded border p-3"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 p-3 text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Envoi..." : "Réinitialiser"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Suspense fallback={<p>Chargement...</p>}>
        <ResetForm />
      </Suspense>
      <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
