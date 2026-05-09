"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

export default function RiderPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("rider-orders-realtime")
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

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["in consegna", "accettato", "in preparazione"])
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      alert("Errore caricamento consegne");
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
      alert("Errore aggiornamento consegna");
      return;
    }

    loadOrders();
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-6xl font-bold mb-2">
        Dashboard Rider
      </h1>

      <p className="text-zinc-400 mb-10">
        Gestione consegne Gustami Delivery
      </p>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <p className="text-zinc-400">
            Nessuna consegna disponibile
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
                    Cliente: {order.customer_name}
                  </p>

                  <p className="text-zinc-500 text-sm">
                    {order.customer_email}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold">
                    €{order.total}
                  </p>

                  <p className="text-purple-400 capitalize">
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
                  onClick={() => updateStatus(order.id, "ritirato")}
                  className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-bold"
                >
                  Ordine ritirato
                </button>

                <button
                  onClick={() => updateStatus(order.id, "completato")}
                  className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold"
                >
                  Consegnato
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
