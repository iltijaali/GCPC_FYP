import { useCallback, useEffect, useState } from 'react';
import { AiOutlineDelete } from 'react-icons/ai';
import { api } from '../api';
import { useToast } from '../context/useToast';
import Loading from './Loading';

// Edits locally while typing and only calls the API once the value is committed.
const QuantityInput = ({ item, onCommit }) => {
  const [value, setValue] = useState(String(item.quantity));

  useEffect(() => setValue(String(item.quantity)), [item.quantity]);

  const commit = () => {
    const qty = Number.parseInt(value, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      setValue(String(item.quantity)); // reject empty, 0 and negatives
      return;
    }
    if (qty !== item.quantity) onCommit(item.id, qty);
  };

  return (
    <input
      type="number"
      min="1"
      step="1"
      value={value}
      aria-label={`Quantity of ${item.product}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="border w-16 p-1 rounded text-center"
    />
  );
};

const Cart = () => {
  const toast = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const data = await api.get('/cart/');
      setCart(data.find((c) => !c.saved) || null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.patch(`/cart-items/${itemId}/`, { quantity });
      await fetchCart();
    } catch (err) {
      toast.error(err.message);
      fetchCart();
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.del(`/cart-items/${itemId}/`);
      await fetchCart();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveCart = async () => {
    if (!cart) return;
    setSaving(true);
    try {
      await api.post(`/cart/${cart.id}/save_cart/`);
      toast.success('Cart saved. You can find it in your history.');
      setCart(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-start p-8">
      <section className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-xl max-w-3xl w-full p-8 text-indigo-900">
        <h2 className="text-4xl font-extrabold mb-8 text-center text-indigo-800">Your Cart</h2>

        {loading ? (
          <Loading />
        ) : !cart || cart.products.length === 0 ? (
          <p className="text-center text-lg text-gray-600">No items in the cart.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-300">
              {cart.products.map((item) => (
                <li key={item.id} className="flex justify-between items-center py-4 font-semibold gap-3">
                  <span>{item.product}</span>

                  <div className="flex items-center gap-3">
                    <QuantityInput item={item} onCommit={updateQuantity} />
                    <span className="text-sm text-gray-700 font-medium w-24 text-right">
                      {item.total_price?.toFixed(2)} Rs
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.product} from cart`}
                      className="text-red-600 text-xl hover:text-red-800"
                    >
                      <AiOutlineDelete aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-center text-2xl font-extrabold text-indigo-900">
              Total: {cart.total_price.toFixed(2)} Rs
            </div>

            <button
              onClick={saveCart}
              disabled={saving}
              className="mt-6 w-full py-3 bg-indigo-900 text-white font-bold rounded-lg hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Cart'}
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default Cart;
