import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import "./App.css";

const API_URL = "http://localhost:5000/api/products";

function Marketplace() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("default");

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("agroxUser");
      const savedToken = localStorage.getItem("agroxToken");

      return savedUser && savedToken
        ? JSON.parse(savedUser)
        : null;
    } catch {
      return null;
    }
  });

  // Fetch products from the existing backend API
  const fetchProducts = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const response = await axios.get(API_URL);

      setProducts(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load products. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle successful login
  const handleLoginSuccess = (user, token) => {
    localStorage.setItem("agroxUser", JSON.stringify(user));
    localStorage.setItem("agroxToken", token);

    setCurrentUser(user);
    fetchProducts();
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("agroxUser");
    localStorage.removeItem("agroxToken");
    setCurrentUser(null);
  };

const categories = useMemo(() => {
  const uniqueCategories = new Map();

  products.forEach((product) => {
    if (
      typeof product.category === "string" &&
      product.category.trim() !== ""
    ) {
      const normalizedCategory = product.category
        .trim()
        .toLowerCase();

      if (!uniqueCategories.has(normalizedCategory)) {
        uniqueCategories.set(
          normalizedCategory,
          normalizedCategory.charAt(0).toUpperCase() +
            normalizedCategory.slice(1)
        );
      }
    }
  });

  return [
    "All",
    ...Array.from(uniqueCategories.values()).sort((a, b) =>
      a.localeCompare(b)
    ),
  ];
}, [products]);

  // Search, filter and sort products
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = products.filter((product) => {
      const searchableFields = [
        product.name,
        product.category,
        product.farmerName,
        product.location,
      ];

      const matchesSearch = searchableFields.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

     const matchesCategory =
     selectedCategory === "All" ||
     (product.category || "").trim().toLowerCase() ===
      selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });

    if (sortOrder === "low-high") {
      result.sort(
        (a, b) =>
          Number(a.pricePerKg || 0) -
          Number(b.pricePerKg || 0)
      );
    } else if (sortOrder === "high-low") {
      result.sort(
        (a, b) =>
          Number(b.pricePerKg || 0) -
          Number(a.pricePerKg || 0)
      );
    }

    return result;
  }, [products, searchTerm, selectedCategory, sortOrder]);

  return (
    <div className="agrox-app">
      {/* Main navigation */}
      <nav className="agrox-nav">
        <a className="agrox-brand" href="#home">
          🌱 Agrox
        </a>

        <div className="agrox-nav-links">
          <a href="#home">Home</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#account">
            {currentUser ? "Dashboard" : "Login / Register"}
          </a>
        </div>
      </nav>

      {/* Homepage hero section */}
      <header className="hero" id="home">
        <p className="hero-eyebrow">
          FARM DIRECT. TRADE SMART.
        </p>

        <h1>Welcome to Agrox</h1>

        <p>
          Connecting farmers and buyers through a transparent
          agricultural marketplace.
        </p>

        <a href="#marketplace" className="hero-button">
          Explore Products
        </a>
      </header>

      {/* Authentication and buyer dashboard */}
      <section className="account-section" id="account">
        {currentUser ? (
          <Dashboard
            user={currentUser}
            onLogout={handleLogout}
          />
        ) : (
          <div className="auth-wrapper">
            <Auth onLoginSuccess={handleLoginSuccess} />
          </div>
        )}
      </section>

      {/* Agricultural marketplace */}
      <section className="marketplace-section" id="marketplace">
        <div className="section-heading">
          <p className="section-eyebrow">
            FRESH FROM THE FARM
          </p>

          <h2>Explore Agricultural Products</h2>

          <p>Discover produce listed by farmers.</p>
        </div>

        {/* Search, category filter and price sorting */}
        <div className="marketplace-controls">
          <input
            type="search"
            placeholder="Search products, farmers, or locations..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Search agricultural products"
          />

          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            aria-label="Filter products by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "All"
                  ? "All categories"
                  : category}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value)
            }
            aria-label="Sort products by price"
          >
            <option value="default">Default order</option>
            <option value="low-high">
              Price: Low to High
            </option>
            <option value="high-low">
              Price: High to Low
            </option>
          </select>
        </div>

        {/* Product count */}
        {!loading && !error && (
          <p className="product-count" aria-live="polite">
            Showing {filteredProducts.length} of{" "}
            {products.length} products
          </p>
        )}

        {/* Loading state */}
        {loading && (
          <p className="loading">Loading products...</p>
        )}

        {/* Error state */}
        {error && (
          <div className="error-message" role="alert">
            <p>{error}</p>

            <button type="button" onClick={fetchProducts}>
              Retry
            </button>
          </div>
        )}

        {/* No products in the database */}
        {!loading && !error && products.length === 0 && (
          <p className="empty-state">
            No products have been listed yet. Please check again
            later.
          </p>
        )}

        {/* No products match the search or filter */}
        {!loading &&
          !error &&
          products.length > 0 &&
          filteredProducts.length === 0 && (
            <div className="empty-state">
              <p>No matching products found.</p>
              <p>
                Try a different search term or category.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                  setSortOrder("default");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

        {/* Product cards */}
        {!loading &&
          !error &&
          filteredProducts.length > 0 && (
            <div className="products-grid">
              {filteredProducts.map((product) => {
                const quantity = Number(product.quantity || 0);
                const price = Number(product.pricePerKg || 0);

                return (
                  <article
                    className="product-card"
                    key={product._id}
                  >
                    <div
                      className="product-card-icon"
                      aria-hidden="true"
                    >
                      🌾
                    </div>

                    <p className="product-category">
                      {product.category || "Agricultural Produce"}
                    </p>

                    <h3>{product.name || "Unnamed Product"}</h3>

                    <p>
                      Farmer:{" "}
                      {product.farmerName || "Agrox Farmer"}
                    </p>

                    <p>
                      Location:{" "}
                      {product.location || "Not specified"}
                    </p>

                    <p className="product-price">
                      ₹{price.toFixed(2)} / kg
                    </p>

                    <p>
                      Available: {quantity} kg
                    </p>

                    {quantity <= 0 && (
                      <span className="out-of-stock">
                        Out of stock
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {/* Footer */}
      <footer className="agrox-footer">
        <p>🌱 Agrox — Farm Direct. Trade Smart.</p>
        <p>
          Connecting farmers and buyers through technology.
        </p>
      </footer>
    </div>
  );
}

export default Marketplace;
