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
  driver_id: number | null;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
};

type Driver = {
  id: number;
  name: string;
  email: string;
  user_id: string;
};

export default function RiderPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    checkRiderAndLoadOrders();

    const channel = supabase
      .channel("rider-assigned-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          playBeep();
          checkRiderAndLoadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function checkRiderAndLoadOrders() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/rider-login");
      return;
    }

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();

    if (driverError || !driverData) {
      console.error(driverError);
      alert("Rider non collegato al database");
      router.push("/rider-login");
      return;
    }

    setDriver(driverData);

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driverData.id)
      .order("id", { ascending: false });

    if (ordersError) {
      console.error(ordersError);
      alert("Errore caricamento ordini rider");
      return;
    }

    setOrders(ordersData || []);
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

    checkRiderAndLoadOrders();
  }

  async function logoutRider() {
    await supabase.auth.signOut();
    router.push("/rider-login");
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
        Dashboard Rider
      </h1>

      <div className="flex gap-3 mb-8">
        <button
          onClick={logoutRider}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-bold"
        >
          Logout Rider
        </button>

        <button
          onClick={playBeep}
          className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl font-bold"
        >
          Test suono
        </button>
      </div>

      <p className="text-zinc-400 mb-4">
        Gestione consegne Gustami Delivery
      </p>

      {driver && (
        <div className="mb-10 bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
          <p className="text-zinc-400">Rider collegato</p>

          <h2 className="text-2xl font-bold">
            {driver.name}
          </h2>

          <p className="text-zinc-500">
            {driver.email}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {orders.length === 0 ? (
          <p className="text-zinc-400">
            Nessuna consegna assegnata a questo rider
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
                  onClick={() => updateStatus(order.id, "in consegna")}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-bold"
                >
                  In consegna
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