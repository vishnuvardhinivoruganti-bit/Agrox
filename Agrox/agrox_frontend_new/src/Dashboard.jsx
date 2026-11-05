
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AddProduct from "./AddProduct";

const API_URL = "http://localhost:5000/api";

function Dashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = String(user?.role || "").trim().toLowerCase();
  const isFarmer = role === "farmer";
  const isBuyer = role === "buyer";

  const getAuthConfig = () => {
    const token = localStorage.getItem("agroxToken");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchOrders = useCallback(async () => {
    if (!isFarmer && !isBuyer) {
      setLoading(false);
      setError("Invalid account role. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = isFarmer
        ? `${API_URL}/orders/farmer`
        : `${API_URL}/orders/mine`;

      const response = await axios.get(
        endpoint,
        getAuthConfig()
      );

      setOrders(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isFarmer, isBuyer]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (!isFarmer) {
      setError("Only farmers can update order status.");
      return;
    }

    if (!orderId) {
      setError("Order ID is missing.");
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingOrderId(orderId);

    try {
      const response = await axios.patch(
        `${API_URL}/orders/${orderId}/status`,
        { status: newStatus },
        getAuthConfig()
      );

      const updatedOrder = response.data?.order;

      if (updatedOrder) {
        setOrders((previousOrders) =>
          previousOrders.map((order) =>
            order._id === updatedOrder._id
              ? updatedOrder
              : order
          )
        );
      }

      setSuccess(
        response.data?.message ||
          `Order ${newStatus} successfully.`
      );

      // Reload the server data to ensure the displayed status
      // matches the order stored in MongoDB.
      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update order status. Please try again."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalOrderValue = orders.reduce(
    (total, order) => total + Number(order.totalPrice || 0),
    0
  );

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusClass = (status) => {
    switch (status) {
      case "accepted":
        return "accepted";
      case "rejected":
        return "rejected";
      case "completed":
        return "completed";
      default:
        return "pending";
    }
  };

  return (
    <section
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 20px",
        color: "#183d2b",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              color: "#64806d",
              fontSize: "13px",
              letterSpacing: "1px",
            }}
          >
            AGROX {isFarmer ? "FARMER" : "BUYER"} DASHBOARD
          </p>

          <h1 style={{ marginBottom: "8px" }}>
            Welcome, {user?.name || "User"}!
          </h1>

          <p style={{ color: "#718477" }}>
            {isFarmer
              ? "Manage your products and incoming orders."
              : "Explore farm produce and manage your orders."}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: "12px 20px",
            background: "#ffffff",
            border: "1px solid #d7e2d8",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      <div
        style={{
          background: "#f3f8f1",
          border: "1px solid #e0e9dc",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "28px",
          lineHeight: 1.9,
        }}
      >
        <p>
          Account type: <strong>{role || "unknown"}</strong>
        </p>

        <p>
          Location: <strong>{user?.location || "Not specified"}</strong>
        </p>

        <p>
          {isFarmer ? "Incoming orders" : "Total orders"}:{" "}
          <strong>{orders.length}</strong>
        </p>

        <p>
          {isFarmer ? "Pending orders" : "Total order value"}:{" "}
          <strong>
            {isFarmer
              ? pendingOrders
              : `₹${totalOrderValue.toFixed(2)}`}
          </strong>
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "8px",
            color: "#b42318",
            background: "#fff1f0",
            border: "1px solid #ffc9c5",
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            style={{
              float: "right",
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "8px",
            color: "#216e39",
            background: "#edf9ef",
            border: "1px solid #c9e9cf",
          }}
        >
          {success}
        </div>
      )}

      {isFarmer && (
        <section style={{ marginBottom: "36px" }}>
          <h2>Add a new agricultural product</h2>
          <AddProduct />
        </section>
      )}

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <h2>
            {isFarmer ? "Incoming Orders" : "My Order History"}
          </h2>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "#ffffff",
              border: "1px solid #d7e2d8",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Refreshing..." : "Refresh orders"}
          </button>
        </div>

        {loading && <p>Loading orders...</p>}

        {!loading && !error && orders.length === 0 && (
          <div
            style={{
              padding: "30px 20px",
              textAlign: "center",
              background: "#f7faf6",
              border: "1px solid #e0e9dc",
              borderRadius: "12px",
            }}
          >
            <h3>No orders yet</h3>
            <p style={{ color: "#718477" }}>
              {isFarmer
                ? "Orders placed for your products will appear here."
                : "Your placed orders will appear here."}
            </p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            {orders.map((order) => (
              <article
                key={order._id}
                style={{
                  padding: "20px",
                  border: "1px solid #dce6da",
                  borderRadius: "12px",
                  background: "#ffffff",
                  boxShadow: "0 2px 8px rgba(20, 60, 35, 0.04)",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {order.productName || "Agricultural product"}
                </h3>

                <p>
                  Quantity: <strong>{order.quantity} kg</strong>
                </p>

                <p>
                  Price per kg:{" "}
                  <strong>
                    ₹{Number(order.pricePerKg || 0).toFixed(2)}
                  </strong>
                </p>

                <p>
                  Total:{" "}
                  <strong>
                    ₹{Number(order.totalPrice || 0).toFixed(2)}
                  </strong>
                </p>

                <p>
                  Order date:{" "}
                  <strong>{formatDate(order.createdAt)}</strong>
                </p>

                <p>
                  Status:{" "}
                  <strong
                    className={`order-status ${statusClass(order.status)}`}
                  >
                    {order.status || "pending"}
                  </strong>
                </p>

                {isFarmer && order.status === "pending" && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "18px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={updatingOrderId !== null}
                      onClick={() =>
                        handleUpdateOrderStatus(
                          order._id,
                          "accepted"
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "11px",
                        color: "#ffffff",
                        background: "#287747",
                        border: "none",
                        borderRadius: "7px",
                        cursor: "pointer",
                        opacity: updatingOrderId ? 0.6 : 1,
                      }}
                    >
                      {updatingOrderId === order._id
                        ? "Updating..."
                        : "Accept Order"}
                    </button>

                    <button
                      type="button"
                      disabled={updatingOrderId !== null}
                      onClick={() =>
                        handleUpdateOrderStatus(
                          order._id,
                          "rejected"
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "11px",
                        color: "#b42318",
                        background: "#fff1f0",
                        border: "1px solid #ffc9c5",
                        borderRadius: "7px",
                        cursor: "pointer",
                        opacity: updatingOrderId ? 0.6 : 1,
                      }}
                    >
                      Reject Order
                    </button>
                  </div>
                )}

                {isFarmer && order.status === "accepted" && (
                  <button
                    type="button"
                    disabled={updatingOrderId !== null}
                    onClick={() =>
                      handleUpdateOrderStatus(
                        order._id,
                        "completed"
                      )
                    }
                    style={{
                      width: "100%",
                      marginTop: "18px",
                      padding: "11px",
                      color: "#ffffff",
                      background: "#287747",
                      border: "none",
                      borderRadius: "7px",
                      cursor: "pointer",
                    }}
                  >
                    {updatingOrderId === order._id
                      ? "Updating..."
                      : "Complete Order"}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Dashboard;

