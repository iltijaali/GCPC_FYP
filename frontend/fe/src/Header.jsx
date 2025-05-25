import React, { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";

import NotificationDropdown from "./components/NotificationDropdown";

const Header = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/api/get-me/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) throw new Error("Unauthorized");

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth";
  };

  if (loading) return null;

  return (
    <header className="bg-gradient-to-r from-blue-900 to-indigo-800 shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center flex-wrap">
        <div className="text-white text-2xl font-bold tracking-wide">
          Govt Commodities
          <span className="text-yellow-300 ml-1">Price Calculator</span>
        </div>

        <nav className="flex items-center gap-4 mt-3 md:mt-0 text-sm md:text-base text-white">
          <a href="/" className="hover:text-yellow-300 transition duration-200">Home</a>

          {!user ? (
            <>
              <a href="/auth" className="hover:text-yellow-300 transition duration-200">Login/Signup</a>
            </>
          ) : (
            <>
              <a href="/products" className="hover:text-yellow-300 transition duration-200">Products</a>
              <a href="/cart" className="hover:text-yellow-300 transition duration-200">Cart</a>
              <a href="/complaints" className="hover:text-yellow-300 transition duration-200">Complaints</a>
              <a href="/history" className="hover:text-yellow-300 transition duration-200">History</a>

              <div className="flex items-center gap-2 text-yellow-300 font-medium">
                <FaUserCircle className="text-xl" />
                Hi, {user.username}
              </div>

              <NotificationDropdown />

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow transition"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
