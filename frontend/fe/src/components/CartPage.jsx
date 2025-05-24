import React, { useState } from "react";

const Cart = () => {
  const [cartItems, setCartItems] = useState([
    { name: "Wheat", price: 12.5, quantity: 2 },
    { name: "Sugar", price: 8.99, quantity: 3 },
  ]);
  const [totalBill, setTotalBill] = useState(null);

  const calculateBill = () => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );
    setTotalBill(total);
  };

  return (
    <div className="min-h-screen flex justify-center items-start p-8">
      <section className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-3xl w-full p-8 text-indigo-900">
        <h2 className="text-4xl font-extrabold mb-8 text-center text-indigo-800">
          Your Cart
        </h2>

        <div className="mb-6">
          {cartItems.length === 0 ? (
            <p className="text-center text-lg text-gray-600">
              No items in the cart yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-300">
              {cartItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex justify-between py-4 font-semibold"
                >
                  <span>{item.name}</span>
                  <span>
                    {item.quantity} × ${item.price.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={calculateBill}
          className="w-full py-3 bg-indigo-900 text-white font-bold rounded-lg hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300"
        >
          Calculate Bill
        </button>

        {totalBill !== null && (
          <div className="mt-6 text-center text-2xl font-extrabold text-yellow-400 drop-shadow-lg">
            Total Bill: ${totalBill.toFixed(2)}
          </div>
        )}
      </section>
    </div>
  );
};

export default Cart;
