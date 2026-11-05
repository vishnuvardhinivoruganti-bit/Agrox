
import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

function AddProduct({ onProductAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    pricePerKg: "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const quantity = Number(formData.quantity);
    const pricePerKg = Number(formData.pricePerKg);

    if (!formData.name.trim() || !formData.category.trim()) {
      setError("Please enter the product name and category.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      setError("Price per kg must be greater than zero.");
      return;
    }

    const token = localStorage.getItem("agroxToken");

    if (!token) {
      setError("Please log in again to add a product.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        API_URL,
        {
          name: formData.name.trim(),
          category: formData.category.trim(),
          quantity,
          pricePerKg,
          location: formData.location.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(
        response.data.message || "Product added successfully!"
      );

      setFormData({
        name: "",
        category: "",
        quantity: "",
        pricePerKg: "",
        location: "",
      });

      if (typeof onProductAdded === "function") {
        await onProductAdded();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add the product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-form">
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="product-name">Product name</label>
          <input
            id="product-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Organic tomatoes"
            required
          />
        </div>

        <div>
          <label htmlFor="product-category">Category</label>
          <input
            id="product-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Vegetables"
            required
          />
        </div>

        <div>
          <label htmlFor="product-quantity">Quantity (kg)</label>
          <input
            id="product-quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="e.g. 50"
            required
          />
        </div>

        <div>
          <label htmlFor="product-price">Price per kg (₹)</label>
          <input
            id="product-price"
            name="pricePerKg"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.pricePerKg}
            onChange={handleChange}
            placeholder="e.g. 35"
            required
          />
        </div>

        <div>
          <label htmlFor="product-location">Location</label>
          <input
            id="product-location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Hyderabad, Telangana"
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

        <button type="submit" disabled={loading}>
          {loading ? "Adding product..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}

export default AddProduct;


