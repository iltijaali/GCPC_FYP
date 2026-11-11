import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/useToast';
import Loading from './Loading';

const PurchaseHistory = () => {
  const toast = useToast();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/cart-history/')
      .then((histories) => {
        if (cancelled) return;
        const all = histories.flatMap((h) => h.carts);
        setCarts(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      })
      .catch((err) => !cancelled && toast.error(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <section id="history-section" className="max-w-3xl mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-blue-900 mb-6 text-center">Purchase History</h2>

      {loading ? (
        <Loading />
      ) : carts.length === 0 ? (
        <p className="text-center text-gray-600">No history available yet. Save a cart to see it here.</p>
      ) : (
        <ul id="history-list" className="space-y-4">
          {carts.map((cart) => (
            <li key={cart.id}>
              <button
                type="button"
                onClick={() => setSelectedCart(cart)}
                className="w-full flex justify-between items-center gap-2 flex-wrap text-left bg-blue-50 p-4 rounded shadow hover:bg-blue-100"
              >
                <span className="font-semibold text-blue-800">Order #{cart.id}</span>
                <span className="text-gray-700">Items: {cart.products.length}</span>
                <span className="text-gray-600">{new Date(cart.created_at).toLocaleDateString()}</span>
                <span className="text-yellow-700 font-bold">Total: {cart.total_price.toFixed(2)} Rs</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedCart && (
        <div id="history-details" className="mt-8 p-6 bg-blue-100 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-blue-900 mb-2">Details for Order #{selectedCart.id}</h3>
          <ul className="mb-4">
            {selectedCart.products.map((item) => (
              <li key={item.id} className="flex justify-between mb-2 gap-2">
                <span>{item.product}</span>
                <span>Qty: {item.quantity}</span>
                <span>{item.total_price.toFixed(2)} Rs</span>
              </li>
            ))}
          </ul>
          <p>
            Purchase Date: <strong>{new Date(selectedCart.created_at).toLocaleString()}</strong>
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
