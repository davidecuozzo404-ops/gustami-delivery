"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@gustami.it");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      alert("Login admin non riuscito");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md border border-zinc-800">
        <h1 className="text-4xl font-bold mb-2">Login Admin</h1>

        <p className="text-zinc-400 mb-8">
          Accedi alla dashboard ristorante
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 rounded-xl bg-black border border-zinc-700 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            className="w-full bg-green-500 hover:bg-green-600 py-4 rounded-xl font-bold"
          >
            Entra come Admin
          </button>
        </div>
      </div>
    </main>
  );
}