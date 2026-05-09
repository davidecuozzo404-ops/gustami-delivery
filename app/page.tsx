"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Product = {
  id: number;
  name: string;
  price: number;
};

type CartItem = Product & {
  quantity: number;
};

type OrderStatus = {
  id: string;
  status: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<OrderStatus | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!currentOrder?.id) return;

    const channel = supabase
      .channel("customer-order-tracking")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${currentOrder.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as OrderStatus;
          setCurrentOrder({
            id: updatedOrder.id,
            status: updatedOrder.status,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrder?.id]);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("Errore caricamento prodotti");
      return;
    }

    setProducts(data || []);
  }

  function addToCart(product: Product) {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  }

  function increaseQuantity(id: number) {
    setCart(
      cart.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQuantity(id: number) {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function confirmOrder() {
    if (cart.length === 0) {
      alert("Il carrello è vuoto");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: "Cliente test",
        customer_email: "cliente@test.com",
        items: cart,
        total: total,
        status: "pending",
      })
      .select("id, status")
      .single();

    if (error) {
      console.error(error);
      alert("Errore invio ordine");
      return;
    }

    alert("Ordine inviato con successo!");

    setCurrentOrder({
      id: data.id,
      status: data.status,
    });

    setCart([]);
  }

  function statusLabel(status: string) {
    if (status === "pending") return "Ordine ricevuto";
    if (status === "accettato") return "Ordine accettato";
    if (status === "in preparazione") return "In preparazione";
    if (status === "in consegna") return "In consegna";
    if (status === "completato") return "Completato";
    if (status === "annullato") return "Annullato";
    return status;
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-6xl font-bold mb-2">
        GUSTAMI DELIVERY
      </h1>

      <p className="text-zinc-400 mb-10">
        Piattaforma delivery indipendente
      </p>

      {currentOrder && (
        <div className="mb-10 bg-green-900/30 border border-green-500 p-6 rounded-3xl">
          <h2 className="text-3xl font-bold mb-2">
            Stato ordine
          </h2>

          <p className="text-green-400 text-2xl font-bold">
            {statusLabel(currentOrder.status)}
          </p>

          <p className="text-zinc-400 mt-2">
            Ordine #{currentOrder.id}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-zinc-900 p-6 rounded-3xl flex items-center justify-between"
          >
            <div>
              <h2 className="text-3xl font-bold">
                {product.name}
              </h2>

              <p className="text-zinc-400">
                €{product.price}
              </p>
            </div>

            <button
              onClick={() => addToCart(product)}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-2xl font-bold"
            >
              Aggiungi
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-zinc-900 p-6 rounded-3xl">
        <h2 className="text-3xl font-bold mb-4">
          Carrello
        </h2>

        {cart.length === 0 ? (
          <p className="text-zinc-400">
            Carrello vuoto
          </p>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-bold">
                    {item.name}
                  </p>

                  <p className="text-zinc-400">
                    €{item.price} x {item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="bg-zinc-700 w-10 h-10 rounded-xl text-xl"
                  >
                    -
                  </button>

                  <span className="text-xl font-bold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQuantity(item.id)}
                    className="bg-green-500 w-10 h-10 rounded-xl text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t border-zinc-700 pt-4 mt-4 flex justify-between text-2xl font-bold">
              <span>Totale</span>
              <span>€{total}</span>
            </div>

            <button
              onClick={confirmOrder}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 py-4 rounded-2xl text-xl font-bold"
            >
              Conferma Ordine
            </button>
          </div>
        )}
      </div>
    </main>
  );
}