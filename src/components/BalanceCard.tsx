// src/components/BalanceCard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const BalanceCard: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = "H2eemDJQJ6BwsJC"; // Replace later with dynamic token from login
        const response = await axios.get(`http://localhost:5000/api/balance?token=${token}`);
        setBalance(response.data.balance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded-xl w-full max-w-xs">
      <h2 className="text-lg font-semibold mb-2">Account Balance</h2>
      {loading ? (
        <p>Loading...</p>
      ) : balance !== null ? (
        <p className="text-2xl font-bold text-green-600">${balance.toFixed(2)}</p>
      ) : (
        <p className="text-red-500">Failed to load balance</p>
      )}
    </div>
  );
};

export default BalanceCard;
