import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/useToast';
import Loading from './Loading';

const CATEGORIES = [
  { value: 'Fruit', label: 'Fruits', style: 'bg-blue-800 hover:bg-blue-700' },
  { value: 'Vegetable', label: 'Vegetables', style: 'bg-green-800 hover:bg-green-700' },
];

const ProductBrowser = () => {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setProducts([]);
    setLoading(true);
    try {
      setProducts(await api.get(`/products/?category=${encodeURIComponent(category)}`));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setProducts([]);
  };

  const addToCart = async (product) => {
    setAddingId(product.id);
    try {
      await api.post('/cart-items/', { product: product.id });
      toast.success(`Added ${product.name} to cart`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingId(null);
    }
  };

  const categoryLabel = CATEGORIES.find((c) => c.value === selectedCategory)?.label;

  return (
    <div className="p-6 text-white">
      <section className="mt-12 bg-white bg-opacity-90 text-black p-6 rounded shadow-lg max-w-4xl mx-auto">
        {!selectedCategory ? (
          <>
            <h2 className="text-3xl font-bold text-center mb-6">Explore Our Products</h2>
            <div className="flex justify-center gap-8 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => handleCategoryClick(c.value)}
                  className={`px-6 py-3 text-white font-semibold rounded ${c.style}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-bold">{categoryLabel}</h2>
              <button onClick={handleBack} className="text-sm underline text-blue-700 hover:text-blue-900">
                ← Back to Categories
              </button>
            </div>

            {loading ? (
              <Loading label="Loading prices…" />
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-gray-600">No {categoryLabel?.toLowerCase()} are listed yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((item) => (
                    <div key={item.id} className="bg-white border p-5 rounded shadow hover:shadow-lg transition">
                      <h3 className="font-bold text-xl">{item.name}</h3>
                      <p className="text-gray-800 mb-1">Rs. {item.price}</p>
                      <p className="text-gray-600 text-sm">
                        Updated {new Date(item.date_updated).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={addingId === item.id}
                        className="mt-3 bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-60"
                      >
                        {addingId === item.id ? 'Adding…' : 'Add to Cart'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default ProductBrowser;
