
"use client";

import React, { useState } from "react";

// Define our Wi-Fi data bundle plans
const BUNDLE_PLANS = [
  { id: "1hr", name: "1 Hour Super", speed: "Unlimited Speed", price: "10", detail: "Best for quick browsing" },
  { id: "3hr", name: "3 Hours Max", speed: "Unlimited Speed", price: "20", detail: "Great for streaming a movie" },
  { id: "24hr", name: "24 Hours Day Pass", speed: "Unlimited Speed", price: "50", detail: "Non-stop access all day" },
  { id: "7day", name: "7 Days Weekly", speed: "Unlimited Speed", price: "250", detail: "Perfect for remote work" },
];

export default function PayPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(BUNDLE_PLANS[0]); // Default to first plan
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  phoneNumber: phoneNumber,
  packageId: selectedPlan.id, // This passes the unique ID (like "offer_1hr") the backend is searching for
}),
      });

      const data = await response.json();

      if (data.success && data.safaricom_gateway_response?.ResponseCode === "0") {
        setStatus({
          success: true,
          message: `STK Push for KES ${selectedPlan.price} sent! Enter your M-Pesa PIN to activate your ${selectedPlan.name}.`,
        });
      } else {
        setStatus({
          success: false,
          message: data.error || data.safaricom_gateway_response?.CustomerMessage || "Transaction failed. Please try again.",
        });
      }
    } catch (error) {
      setStatus({
        success: false,
        message: "Network error. Could not connect to the local API server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "32px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "480px"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: "0 0 4px 0", color: "#111827", fontSize: "26px", fontWeight: "800" }}>
            Fulifi Wi-Fi Hotspot
          </h2>
          <p style={{ margin: "0", color: "#4b5563", fontSize: "14px" }}>
            Select a data bundle and enter your Safaricom number
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handlePayment} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Bundle Selection Panels */}
          <div>
            <label style={{ display: "block", marginBottom: "10px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
              Choose Your Package
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {BUNDLE_PLANS.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      display: "flex",
                      justifyContent: "between",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #4ade80" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? "0 2px 4px rgba(74, 222, 128, 0.1)" : "none"
                    }}
                  >
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "700", color: "#111827" }}>{plan.name}</span>
                        <span style={{ fontSize: "11px", backgroundColor: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontWeight: "500" }}>
                          {plan.speed}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>{plan.detail}</span>
                    </div>
                    <div style={{ textAlign: "right", minWidth: "70px" }}>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: isSelected ? "#166534" : "#111827" }}>
                        {plan.price} KES
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phone Input */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
              Safaricom Mobile Number
            </label>
            <input
              type="tel"
              required
              placeholder="e.g., 07XXXXXXXX or 2547..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: loading ? "#9ca3af" : "#111827",
              color: "#ffffff",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}
          >
            {loading ? "Processing STK Push..." : `Pay ${selectedPlan.price} KES via M-PESA`}
          </button>
        </form>

        {/* Status Messages */}
        {status && (
          <div style={{
            marginTop: "20px",
            padding: "14px",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.5",
            backgroundColor: status.success ? "#f0fdf4" : "#fef2f2",
            color: status.success ? "#166534" : "#991b1b",
            border: `1px solid ${status.success ? "#bbf7d0" : "#fecaca"}`
          }}>
            <strong>{status.success ? "Success! " : "Notice: "}</strong>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}