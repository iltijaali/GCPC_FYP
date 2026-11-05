import { Link, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import ComplaintsPage from './pages/ComplaintsPage';
import OrdersPage from './pages/OrdersPage';
import Overview from './pages/Overview';
import ProductsPage from './pages/ProductsPage';
import UsersPage from './pages/UsersPage';

function NotFound() {
  return (
    <div className="adm-card adm-card-pad text-center">
      <h1 className="text-[20px]">Page not found</h1>
      <p className="muted mt-1 mb-4">There is no such page in the admin dashboard.</p>
      <Link to="/admin" className="adm-btn adm-btn-primary">Go to the overview</Link>
    </div>
  );
}

// Lazy-loaded from App.jsx, so visitors who never open /admin never download any of this.
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
