import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Home from './pages/Home';
import PurchaseHistory from './components/PurchaseHistory';
import ComplaintForm from './components/ComplaintForm';
import Cart from './components/CartPage';
import AuthForm from './components/AuthForm';
import ProductBrowser from './components/ProductPage';
// import other pages...

function App() {
  return (
    <Router>
      <div
        className="flex flex-col min-h-screen bg-fixed bg-center bg-cover"
        style={{ backgroundImage: "url('BG.webp')" }}
      >
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<PurchaseHistory />} />
            <Route path="/complaints" element={<ComplaintForm />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/auth" element={<AuthForm />} />
            <Route path="/products" element={<ProductBrowser />} />
            {/* Add other routes */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
