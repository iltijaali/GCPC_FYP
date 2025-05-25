import React, { useState } from "react";

const ProductBrowser = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState("");

  const fetchProducts = async (category) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:8000/api/products/?category=${category}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `MyToken ${token}`,
        },
      });
  
      if (!response.ok) throw new Error("Failed to fetch products");
  
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };
  

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    fetchProducts(category);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setProducts([]);
  };

  const addToCart = async (product) => {
    const token = localStorage.getItem("token");
    console.log(token);
  
    try {
      const response = await fetch("http://localhost:8000/api/cart-items/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `MyToken ${token}`,
        },
        body: JSON.stringify({
          product: product.id,
        }),
      });
  
      if (!response.ok) throw new Error("Failed to add product to cart");
  
      const data = await response.json();
      console.log("Cart item updated or created:", data);
      setToast(`Added ${product.name} to cart!`);
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setToast("Failed to add product");
      setTimeout(() => setToast(""), 3000);
    }
  };
  

  return (
    <div className="min-h-screen bg-cover bg-center p-6 text-white">
      <section className="mt-12 bg-white bg-opacity-90 text-black p-6 rounded shadow-lg max-w-4xl mx-auto">
        {!selectedCategory ? (
          <>
            <h2 className="text-3xl font-bold text-center mb-6">Explore Our Products</h2>
            <div className="flex justify-center gap-8">
              <button
                onClick={() => handleCategoryClick("Fruit")}
                className="px-6 py-3 bg-blue-800 text-white font-semibold rounded hover:bg-blue-700"
              >
                Fruits
              </button>
              <button
                onClick={() => handleCategoryClick("Vegetable")}
                className="px-6 py-3 bg-green-800 text-white font-semibold rounded hover:bg-green-700"
              >
                Vegetables
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedCategory}s</h2>
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
                  <p className="text-gray-800 mb-1">Rs. {item.price}</p>
                  <p className="text-gray-600 text-sm">{item.description}</p>
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
