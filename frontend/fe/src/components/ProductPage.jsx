import React, { useState } from "react";

const mockData = {
  fruits: [
    {
      name: "Apple",
      price: "Rs. 120/kg",
      description: "Fresh and juicy red apples from Kashmir.",
      origin: "Kashmir",
    },
    {
      name: "Banana",
      price: "Rs. 60/dozen",
      description: "Ripe bananas rich in potassium.",
      origin: "Sindh",
    },
    {
      name: "Mango",
      price: "Rs. 150/kg",
      description: "Sweet mangoes of the Sindhri variety.",
      origin: "Multan",
    },
  ],
  vegetables: [
    {
      name: "Potato",
      price: "Rs. 40/kg",
      description: "Versatile and fresh potatoes.",
      origin: "Punjab",
    },
    {
      name: "Tomato",
      price: "Rs. 50/kg",
      description: "Juicy red tomatoes ideal for curries.",
      origin: "Lahore",
    },
    {
      name: "Onion",
      price: "Rs. 45/kg",
      description: "Sharp and flavorful onions.",
      origin: "Hyderabad",
    },
  ],
};

const ProductBrowser = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setProducts(mockData[category]);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setProducts([]);
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
    setToast(`${product.name} added to cart`);

    // Hide toast after 2 seconds
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center p-6 text-white"
    >
      <section className="mt-12 bg-white bg-opacity-90 text-black p-6 rounded shadow-lg max-w-4xl mx-auto">
        {!selectedCategory ? (
          <>
            <h2 className="text-3xl font-bold text-center mb-6">Explore Our Products</h2>
            <div className="flex justify-center gap-8">
              <button
                onClick={() => handleCategoryClick("fruits")}
                className="px-6 py-3 bg-blue-800 text-white font-semibold rounded hover:bg-blue-700"
              >
                Fruits
              </button>
              <button
                onClick={() => handleCategoryClick("vegetables")}
                className="px-6 py-3 bg-green-800 text-white font-semibold rounded hover:bg-green-700"
              >
                Vegetables
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              </h2>
              <button
                onClick={handleBack}
                className="text-sm underline text-blue-600 hover:text-blue-800"
              >
                ← Back to Categories
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map((item, index) => (
                <div
                  key={index}
                  className="bg-white border p-5 rounded shadow hover:shadow-lg transition"
                >
                  <h3 className="font-bold text-xl">{item.name}</h3>
                  <p className="text-gray-800 mb-1">{item.price}</p>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                  <p className="text-gray-500 text-xs italic mt-1">
                    Origin: {item.origin}
                  </p>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ProductBrowser;
