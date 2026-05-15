"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RiderLoginPage() {
  const [email, setEmail] = useState("rider@gustami.it");
  const [password, setPassword] = useState("");

  async function loginRider() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      alert("Login rider non riuscito");
      return;
    }

    window.location.href = "/dashboard/riders";
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md border border-zinc-800">
        <h1 className="text-4xl font-bold mb-2">Login Rider</h1>

        <p className="text-zinc-400 mb-8">
          Accedi alla dashboard consegne
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email rider"
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
            onClick={loginRider}
            className="w-full bg-purple-500 hover:bg-purple-600 py-4 rounded-xl font-bold"
          >
            Entra come Rider
          </button>
        </div>
      </div>
    </main>
  );
}