import { useCallback, useEffect, useRef, useState } from 'react';
import { AiOutlineDelete } from 'react-icons/ai';
import { api } from '../api';
import { useToast } from '../context/useToast';
import Loading from './Loading';

const AUTOSAVE_MS = 500;

// The quantity box. Every change (typing, the up/down arrows, the keyboard arrows) is saved on its own half a
// second after the last one, so the total keeps up without having to click elsewhere, and a burst of quick clicks
// becomes ONE save. Leaving the box or pressing Enter saves immediately. Empty, 0 and negative values are never
// saved: while you are typing they are left alone, and on leaving the box the real quantity comes back.
const QuantityInput = ({ item, onCommit }) => {
  const [value, setValue] = useState(String(item.quantity));
  const [synced, setSynced] = useState(0);   // bumped when an edit ends, so the box re-reads the server's value
  const latest = useRef(value);              // what is in the box right now
  const editing = useRef(false);             // a ref, not state: an effect that runs late must still see the truth
  const timer = useRef(null);

  // Follow the server's quantity whenever the user is not in the middle of an edit.
  useEffect(() => {
    if (!editing.current) {
      latest.current = String(item.quantity);
      setValue(latest.current);
    }
  }, [item.quantity, synced]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = () => {
    editing.current = false;
    setSynced((n) => n + 1);
  };

  const save = async (text, leaving) => {
    clearTimeout(timer.current);
    const qty = Number.parseInt(text, 10);
    const valid = Number.isInteger(qty) && qty >= 1;
    if (!valid && !leaving) return;                            // still typing: wait
    if (valid && qty !== item.quantity) await onCommit(item.id, qty);
    if (leaving || latest.current === text) finish();          // done (or nothing newer was typed meanwhile)
  };

  const onChange = (e) => {
    const text = e.target.value;
    editing.current = true;
    latest.current = text;
    setValue(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(text, false), AUTOSAVE_MS);
  };

  return (
    <input
      type="number"
      min="1"
      step="1"
      value={value}
      aria-label={`Quantity of ${item.product}`}
      onChange={onChange}
      onBlur={() => save(latest.current, true)}
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
  // Cart changes run one after another, so "Save Cart" can never overtake a quantity change that is still on its way.
  const queue = useRef(Promise.resolve());
  const enqueue = (task) => {
    const run = queue.current.then(task);
    queue.current = run.catch(() => {});
    return run;
  };

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

  const updateQuantity = (itemId, quantity) =>
    enqueue(async () => {
      try {
        await api.patch(`/cart-items/${itemId}/`, { quantity });
        await fetchCart();
      } catch (err) {
        toast.error(err.message);
        await fetchCart();   // show what the server really has
      }
    });

  const removeItem = (itemId) =>
    enqueue(async () => {
      try {
        await api.del(`/cart-items/${itemId}/`);
        await fetchCart();
      } catch (err) {
        toast.error(err.message);
      }
    });

  const saveCart = () => {
    if (!cart) return undefined;
    setSaving(true);
    return enqueue(async () => {
      try {
        await api.post(`/cart/${cart.id}/save_cart/`);
        toast.success('Cart saved. You can find it in your history.');
        setCart(null);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setSaving(false);
      }
    });
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
