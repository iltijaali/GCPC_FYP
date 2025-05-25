import React, { useEffect, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai";

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  const TOKEN = localStorage.getItem("token");

  const fetchCart = () => {
    fetch(`http://localhost:8000/api/cart/`, {
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const unsavedCart = data.find((c) => !c.saved);
        setCart(unsavedCart || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch cart", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = (itemId, newQuantity) => {
    fetch(`http://localhost:8000/api/cart-items/${itemId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `MyToken ${TOKEN}`,
      },
      body: JSON.stringify({ quantity: parseInt(newQuantity) }),
    })
      .then((res) => res.ok && fetchCart())
      .catch((err) => console.error("Update failed", err));
  };

  const removeItem = (itemId) => {
    fetch(`http://localhost:8000/api/cart-items/${itemId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
    })
      .then((res) => res.ok && fetchCart())
      .catch((err) => console.error("Delete failed", err));
  };

  const saveCart = () => {
    if (!cart) return;
    fetch(`http://localhost:8000/api/cart/${cart.id}/save_cart/`, {
      method: "POST",
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
    })
      .then((res) => res.json())
      .then(() => {
        alert("Cart saved!");
        setCart(null);
      })
      .catch((err) => console.error("Save failed", err));
  };

  return (
    <div className="min-h-screen flex justify-center items-start p-8 bg-gray-100">
      <section className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-3xl w-full p-8 text-indigo-900">
        <h2 className="text-4xl font-extrabold mb-8 text-center text-indigo-800">
          Your Cart
        </h2>

        {loading ? (
          <p className="text-center text-lg text-gray-600">Loading...</p>
        ) : !cart || cart.products.length === 0 ? (
          <p className="text-center text-lg text-gray-600">No items in the cart.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-300">
                {cart.products.map((item) => (
                    <li
                    key={item.id}
                    className="flex justify-between items-center py-4 font-semibold"
                    >
                    <span>{item.product}</span>

                    <div className="flex items-center gap-3">
                        <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                            updateQuantity(item.id, e.target.value)
                        }
                        className="border w-16 p-1 rounded text-center"
                        />

                        <span className="text-sm text-gray-700 font-medium">
                        ${item.total_price?.toFixed(2)}
                        </span>

                        <AiOutlineDelete
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 text-xl cursor-pointer hover:text-red-800"
                        />
                    </div>
                    </li>
                ))}
                </ul>

            <div className="mt-6 text-center text-2xl font-extrabold text-yellow-500 drop-shadow-lg">
              Total: ${cart.total_price.toFixed(2)}
            </div>

            <button
              onClick={saveCart}
              className="mt-6 w-full py-3 bg-indigo-900 text-white font-bold rounded-lg hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300"
            >
              Save Cart
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default Cart;
