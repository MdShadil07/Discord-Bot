import React, { useState } from "react";

const ManageFunds = ({ members = [], userRole = "manager", onUpdatePayment }) => {
  // members = [{ name, cid, discordId, phone, initialAmount, weeklyFund, totalPaid, avatarUrl }]

  // Local state to hold weekly payment input per member (keyed by cid)
  const [payments, setPayments] = useState({});

  // Update input field value for a member
  const handlePaymentChange = (cid, value) => {
    if (!/^\d*$/.test(value)) return; // only digits allowed
    setPayments((prev) => ({ ...prev, [cid]: value }));
  };

  // Handle update payment submission for a member
  const handleUpdate = (cid) => {
    const paymentValue = Number(payments[cid]);
    if (isNaN(paymentValue) || paymentValue < 0) {
      alert("Please enter a valid non-negative number.");
      return;
    }
    if (onUpdatePayment) {
      onUpdatePayment(cid, paymentValue);
    }
    // Clear input after update
    setPayments((prev) => ({ ...prev, [cid]: "" }));
  };

  // Discord avatar fallback helper
  const getDiscordAvatarUrl = (id) => {
    if (!id) return null;
    const defaultAvatarIndex = parseInt(id.slice(-1)) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  };

  if (!members.length) {
    return <p>No members found.</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Manage Funds</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ccc" }}>
            <th style={{ padding: 8 }}>Avatar</th>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>CID</th>
            <th style={{ padding: 8 }}>Phone</th>
            <th style={{ padding: 8 }}>Initial Amount</th>
            <th style={{ padding: 8 }}>Weekly Fund</th>
            <th style={{ padding: 8 }}>Total Paid</th>
            <th style={{ padding: 8 }}>Update Weekly Payment</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.cid} style={{ borderBottom: "1px solid #eee", textAlign: "center" }}>
              <td style={{ padding: 8 }}>
                <img
                  src={m.avatarUrl || getDiscordAvatarUrl(m.discordId)}
                  alt={m.name}
                  style={{ width: 50, height: 50, borderRadius: "50%" }}
                />
              </td>
              <td style={{ padding: 8 }}>{m.name}</td>
              <td style={{ padding: 8 }}>{m.cid}</td>
              <td style={{ padding: 8 }}>{m.phone}</td>
              <td style={{ padding: 8 }}>${m.initialAmount.toFixed(2)}</td>
              <td style={{ padding: 8 }}>${m.weeklyFund.toFixed(2)}</td>
              <td style={{ padding: 8 }}>${(m.totalPaid || 0).toFixed(2)}</td>
              <td style={{ padding: 8 }}>
                {(userRole === "admin" || userRole === "manager") ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={payments[m.cid] || ""}
                      onChange={(e) => handlePaymentChange(m.cid, e.target.value)}
                      placeholder="Amount"
                      style={{ width: 80, marginRight: 8, padding: 4 }}
                    />
                    <button
                      onClick={() => handleUpdate(m.cid)}
                      style={{ padding: "4px 10px", cursor: "pointer" }}
                    >
                      Update
                    </button>
                  </>
                ) : (
                  <em>No access</em>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageFunds;
