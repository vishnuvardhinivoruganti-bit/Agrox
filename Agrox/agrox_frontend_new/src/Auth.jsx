
import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "register" && !formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/login" : "/register";

      const payload =
        mode === "login"
          ? {
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
            }
          : {
              name: formData.name.trim(),
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
              role: formData.role,
              location: formData.location.trim(),
            };

      const response = await axios.post(
        `${API_URL}${endpoint}`,
        payload
      );

      if (mode === "register") {
        setSuccess(
          response.data.message ||
            "Registration successful! You can now log in."
        );

        setMode("login");
        setFormData((previous) => ({
          ...previous,
          name: "",
          password: "",
        }));

        return;
      }

      const data = response.data;
      const token = data.token || data.accessToken;
      const returnedUser = data.user || data.profile;

      if (!token) {
        setError(
          "Login response did not include a token. Check your backend login route."
        );
        return;
      }

      if (!returnedUser || typeof returnedUser !== "object") {
        setError(
          "Login succeeded, but user information was not returned. Check your backend login response."
        );
        return;
      }

      const user = {
        ...returnedUser,
        name: returnedUser.name || "",
        role: returnedUser.role || "",
        location: returnedUser.location || "",
      };

      if (!user.role || !user.name) {
        setError(
          "Your login response is missing the user's name or role. Please check the backend response."
        );
        return;
      }

      localStorage.setItem("agroxToken", token);
      localStorage.setItem("agroxUser", JSON.stringify(user));

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(user, token);
      }
    } catch (err) {
      console.error(
        "Agrox authentication error:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-card">
      <div className="auth-heading">
        <p className="section-eyebrow">WELCOME TO AGROX</p>
        <h2>
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </h2>
        <p>
          {mode === "login"
            ? "Access your agricultural marketplace dashboard."
            : "Join Agrox as a farmer or buyer."}
        </p>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "auth-tab active" : "auth-tab"}
          onClick={() => handleModeChange("login")}
          disabled={loading}
        >
          Login
        </button>

        <button
          type="button"
          className={mode === "register" ? "auth-tab active" : "auth-tab"}
          onClick={() => handleModeChange("register")}
          disabled={loading}
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <>
            <div className="form-group">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-role">Account type</label>
              <select
                id="auth-role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="buyer">Buyer</option>
                <option value="farmer">Farmer</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="auth-location">Location</label>
              <input
                id="auth-location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Hyderabad, Telangana"
                autoComplete="address-level2"
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
          />
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="success-message" role="status">
            {success}
          </p>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login"
          ? "New to Agrox? "
          : "Already have an account? "}

        <button
          type="button"
          className="auth-switch-button"
          onClick={() =>
            handleModeChange(mode === "login" ? "register" : "login")
          }
          disabled={loading}
        >
          {mode === "login" ? "Register here" : "Login here"}
        </button>
      </p>
    </section>
  );
}

export default Auth;

