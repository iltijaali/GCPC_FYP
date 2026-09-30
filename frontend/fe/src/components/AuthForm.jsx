import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';

const MIN_PASSWORD = 6;
const EMPTY = { email: '', password: '', username: '', fullname: '' };
const INPUT =
  'w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const AuthForm = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const toggleForm = () => {
    setIsLogin((v) => !v);
    setFormData(EMPTY);
  };

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && formData.password.length < MIN_PASSWORD) {
      toast.error(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email.trim(), formData.password);
        navigate(redirectTo, { replace: true });
      } else {
        await api.post(
          '/register/',
          {
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
            full_name: formData.fullname.trim(),
          },
          { auth: false },
        );
        toast.success('Registration successful! Please log in.');
        toggleForm();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-lg max-w-md w-full p-8 text-indigo-900">
        <h2 className="text-3xl font-extrabold mb-6 text-center">{isLogin ? 'Login' : 'Register'}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label htmlFor="fullname" className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullname"
                  id="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className={INPUT}
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className="block font-semibold mb-1">User Name</label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a user name"
                  autoComplete="username"
                  className={INPUT}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block font-semibold mb-1">
              {isLogin ? 'Email Address or Username' : 'Email Address'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={isLogin ? 'Enter your email or username' : 'Enter your email address'}
              autoComplete={isLogin ? 'username' : 'email'}
              className={INPUT}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-semibold mb-1">Password</label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isLogin ? 'Enter your password' : `At least ${MIN_PASSWORD} characters`}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className={INPUT}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-900 text-white font-bold py-3 rounded hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300 disabled:opacity-60"
          >
            {loading ? (isLogin ? 'Logging in...' : 'Registering...') : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {isLogin && (
          <div className="text-right mt-2">
            <Link to="/forgot-password" className="text-sm text-indigo-700 underline hover:text-indigo-900">
              Forgot Password?
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-indigo-800 font-semibold">
          {isLogin ? 'New here?' : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={toggleForm}
            className="text-indigo-700 underline hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
