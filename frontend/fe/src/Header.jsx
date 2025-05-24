import React from 'react';

const Header = () => {
  return (
    <nav className="flex justify-between items-center bg-blue-900 text-white p-4 px-8">
      <div className="text-2xl font-bold">Govt Commodities Price Calculator</div>
      <ul className="flex gap-6 font-bold">
        <li><a href="/" className="hover:bg-blue-700 px-3 py-1 rounded">Home</a></li>
        <li><a href="/auth" className="hover:bg-blue-700 px-3 py-1 rounded">Login/Register</a></li>
        <li><a href="/products" className="hover:bg-blue-700 px-3 py-1 rounded">Products</a></li>
        <li><a href="/cart" className="hover:bg-blue-700 px-3 py-1 rounded">Cart</a></li>
        <li><a href="/complaints" className="hover:bg-blue-700 px-3 py-1 rounded">Complaints</a></li>
        <li><a href="/history" className="hover:bg-blue-700 px-3 py-1 rounded">History</a></li>
      </ul>
    </nav>
  );
};

export default Header;
