"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  id: number;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    checkUser();
    loadOrders();

    const channel = supabase
      .channel("orders-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
    }
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      alert("Errore caricamento ordini");
      return;
    }

    setOrders(data || []);
  }

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Errore aggiornamento stato");
      return;
    }

    loadOrders();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }
  function playBeep() {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
  
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
  
    oscillator.frequency.value = 900;
    oscillator.type = "sine";
  
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.4
    );
  
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  }
  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-6xl font-bold mb-2">
        Dashboard Ristorante
      </h1>
      <button
  onClick={logout}
  className="mb-8 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-bold"
>
  Logout
</button>

<button
  onClick={playBeep}
  className="mb-8 ml-3 bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl font-bold"
>
  Test suono
</button>

      <p className="text-zinc-400 mb-10">
        Gestione ordini Gustami Delivery
      </p>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <p className="text-zinc-400">
            Nessun ordine presente
          </p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Ordine #{order.id}
                  </h2>

                  <p className="text-zinc-400">
                    {order.customer_name}
                  </p>

                  <p className="text-zinc-500 text-sm">
                    {order.customer_email}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold">
                    €{order.total}
                  </p>

                  <p className="text-green-400 capitalize">
                    {order.status}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {order.items?.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-zinc-300"
                  >
                    <span>
                      {item.name} x {item.quantity}
                    </span>

                    <span>
                      €{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => updateStatus(order.id, "accettato")}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-bold"
                >
                  Accetta ordine
                </button>

                <button
                  onClick={() => updateStatus(order.id, "in preparazione")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-xl font-bold"
                >
                  In preparazione
                </button>

                <button
                  onClick={() => updateStatus(order.id, "in consegna")}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-bold"
                >
                  In consegna
                </button>

                <button
                  onClick={() => updateStatus(order.id, "completato")}
                  className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold"
                >
                  Completato
                </button>

                <button
  onClick={async () => {
    const confirmed = confirm("Vuoi davvero cancellare questo ordine?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", order.id);

    if (error) {
      console.error(error);
      alert("Errore cancellazione ordine");
      return;
    }

    () => {
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {});
        loadOrders();
      }
  }}
  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-bold"
>
  Cancella ordine
</button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}