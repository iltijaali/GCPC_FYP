import React, { useEffect, useState } from "react";

const PurchaseHistory = () => {
  const [histories, setHistories] = useState([]); // Now an array
  const [selectedCart, setSelectedCart] = useState(null);
  const TOKEN = localStorage.getItem("token");

  useEffect(() => {
    fetch("http://localhost:8000/api/cart-history/", {
      headers: {
        Authorization: `MyToken ${TOKEN}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then((data) => setHistories(data)) // Set array of history entries
      .catch((err) => {
        console.error(err);
        setHistories([]);
      });
  }, []);

  return (
    <section
      id="history-section"
      className="max-w-3xl mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg"
    >
      <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">
        Purchase History
      </h2>

      {histories.length === 0 ? (
        <p className="text-center text-gray-600">No history available yet.</p>
      ) : (
        <div id="history-list" className="space-y-4">
          {histories.map((history) =>
            history.carts.map((cart) => (
              <div
                key={cart.id}
                className="flex justify-between items-center bg-blue-50 p-4 rounded shadow cursor-pointer hover:bg-blue-100"
                onClick={() => setSelectedCart(cart)}
              >
                <span className="font-semibold text-blue-800">
                  Order #{cart.id}
                </span>
                <span className="text-gray-700">
                  Items: {cart.products.length}
                </span>
                <span className="text-gray-600">
                  Date: {new Date(cart.created_at).toLocaleDateString()}
                </span>
                <span className="text-yellow-600 font-bold">
                  Total: {cart.total_price.toFixed(2)}Rs
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {selectedCart && (
        <div
          id="history-details"
          className="mt-8 p-6 bg-blue-100 rounded-lg shadow-md"
        >
          <h3 className="text-xl font-semibold text-blue-900 mb-2">
            Details for Order #{selectedCart.id}
          </h3>
          <ul className="mb-4">
            {selectedCart.products.map((item) => (
              <li key={item.id} className="flex justify-between mb-2">
                <span>{item.product}</span>
                <span>Qty: {item.quantity}</span>
                <span>{item.total_price.toFixed(2)}Rs</span>
              </li>
            ))}
          </ul>
          <p>
            Purchase Date:{" "}
            <strong>{new Date(selectedCart.created_at).toLocaleString()}</strong>
          </p>
          <button
            onClick={() => setSelectedCart(null)}
            className="mt-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          >
            Close Details
          </button>
        </div>
      )}
    </section>
  );
};

export default PurchaseHistory;
