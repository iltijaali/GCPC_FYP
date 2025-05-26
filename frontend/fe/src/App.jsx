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
import ProtectedRoute from './ProtectedRoute';
import ForgotPasswordPage from './components/ForgotPasswordPage';
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
            <Route path="/auth" element={<AuthForm />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/products" element={<ProtectedRoute element={<ProductBrowser />} />} />
            <Route path="/cart" element={<ProtectedRoute element={<Cart />} />} />
            <Route path="/complaints" element={<ProtectedRoute element={<ComplaintForm />} />} />
            <Route path="/history" element={<ProtectedRoute element={<PurchaseHistory />} />} />
            {/* Add other routes */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
