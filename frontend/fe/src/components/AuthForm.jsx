import React, { useState } from "react";
import { Link } from "react-router-dom";

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullname: "",
  });
  const [loading, setLoading] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({ email: "", password: "", username: "", fullname: "" });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Inline login function
  const login = async (email, password) => {
    const requestBody = {
      username_or_email: email,
      password: password,
    };

    const response = await fetch("http://localhost:8000/api/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error("Failed to login");

    const data = await response.json();
    localStorage.setItem("token", data.token);
    return data;
  };

  // Inline register function
  const register = async (username, email, password, fullname) => {
    const requestBody = {
      username,
      email,
      password,
      full_name: fullname,
    };

    const response = await fetch("http://localhost:8000/api/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error("Failed to register");

    const data = await response.json();
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      if (!formData.email || !formData.password) {
        alert("Email and password are required!");
        return;
      }
      try {
        setLoading(true);
        await login(formData.email, formData.password);
        window.location.href = "/"; // Redirect to home
      } catch (error) {
        alert("Login failed. Please check credentials.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      // Register validation
      if (!formData.username || !formData.email || !formData.password || !formData.fullname) {
        alert("All fields are required!");
        return;
      }
      try {
        setLoading(true);
        await register(formData.username, formData.email, formData.password, formData.fullname);
        alert("Registration successful! Please login.");
        toggleForm();
      } catch (error) {
        alert("Registration failed. Try again.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl shadow-lg max-w-md w-full p-8 text-indigo-900">
        <h2 className="text-3xl font-extrabold mb-6 text-center">
          {isLogin ? "Login" : "Register"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label htmlFor="fullname" className="block font-semibold mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullname"
                  id="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={!isLogin}
                />
              </div>

              <div>
                <label htmlFor="username" className="block font-semibold mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your user name"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={!isLogin}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block font-semibold mb-1">
              {isLogin ? "Email Address or Username" : "Email Address"}
            </label>
            <input
              type={isLogin? "text": "email"}
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={isLogin ? "Enter your email address" : "Enter your email address"}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-semibold mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-900 text-white font-bold py-3 rounded hover:bg-yellow-400 hover:text-indigo-900 transition-colors duration-300"
          >
            {loading ? (isLogin ? "Logging in..." : "Registering...") : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <div className="text-right mt-1">
          {isLogin && (
            <Link
              to="/forgot-password"
              className="text-sm text-yellow-400 hover:underline hover:text-yellow-300"
            >
              Forgot Password?
            </Link>
          )}
        </div>

        <p className="mt-6 text-center text-indigo-800 font-semibold">
          {isLogin ? "New here?" : "Already registered?"}{" "}
          <button
            onClick={toggleForm}
            className="text-yellow-400 underline hover:text-yellow-300 focus:outline-none"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
