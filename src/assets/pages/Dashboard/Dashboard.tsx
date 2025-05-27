import { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

type Session = {
  period: string;
  time: string;
  result: string;
};

type Report = {
  time: string;
  type: string;
  result: string;
  profit: number;
};

type Summary = {
  trades: number;
  profit: number;
  rate: number;
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState<Summary>({ trades: 0, profit: 0, rate: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [balance, setBalance] = useState(0);
  const [tradeData, setTradeData] = useState({
    symbol: "R_50",
    duration: 5,
    stake: 1,
    contract_type: "CALL",
  });

  useEffect(() => {
    // Fetch dashboard data (summary, sessions, reports)
    axios.get("http://localhost:5000/api/dashboard")
      .then((res) => {
        setSummary(res.data.summary);
        setReports(res.data.reports);
        setSessions(res.data.sessions);
      })
      .catch((err) => console.error("Dashboard fetch error:", err));

    // Fetch balance using the Deriv token
    const token = "H2eemDJQJ6BwsJC"; // Later make this dynamic from login/session
    axios.get(`http://localhost:5000/api/balance?token=${token}`)
      .then((res) => setBalance(res.data.balance))
      .catch((err) => console.error("Balance fetch error:", err));
  }, []);

  const handlePlaceTrade = () => {
    axios.post("http://localhost:5000/api/trade", tradeData)
      .then((res) => {
        alert("Trade placed! Contract ID: " + res.data.contract_id);
      })
      .catch((err) => {
        const message = err.response?.data?.error || err.message;
        alert("Trade failed: " + message);
      });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="overview-tab">
            <h2 className="tab-title">Today's Summary</h2>
            <div className="summary-cards">
              <div className="card"><h3>Trades</h3><p>{summary.trades}</p></div>
              <div className="card"><h3>Profit</h3><p>${summary.profit.toFixed(2)}</p></div>
              <div className="card"><h3>Success Rate</h3><p>{summary.rate}%</p></div>
            </div>
          </div>
        );
      case "sessions":
        return (
          <div className="tab-content">
            <h3>Today's Sessions</h3>
            <ul className="session-list">
              {sessions.map((s, i) => (
                <li key={i}><strong>{s.period}</strong>: {s.time} – {s.result}</li>
              ))}
            </ul>
          </div>
        );
      case "reports":
        return (
          <div className="tab-content">
            <h3>Reports</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Profit/Loss</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td>{r.time}</td>
                    <td>{r.type}</td>
                    <td>{r.result}</td>
                    <td>{r.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "strategy":
        return (
          <div className="tab-content">
            <h3>Auto Trade Strategy</h3>
            <div className="trade-form">
              <label>Symbol:
                <input
                  type="text"
                  value={tradeData.symbol}
                  onChange={(e) => setTradeData({ ...tradeData, symbol: e.target.value })}
                />
              </label>

              <label>Contract Type:
                <select
                  value={tradeData.contract_type}
                  onChange={(e) => setTradeData({ ...tradeData, contract_type: e.target.value })}
                >
                  <option value="CALL">CALL</option>
                  <option value="PUT">PUT</option>
                </select>
              </label>

              <label>Stake ($):
                <input
                  type="number"
                  value={tradeData.stake}
                  onChange={(e) => setTradeData({ ...tradeData, stake: +e.target.value })}
                />
              </label>

              <label>Duration (ticks):
                <input
                  type="number"
                  value={tradeData.duration}
                  onChange={(e) => setTradeData({ ...tradeData, duration: +e.target.value })}
                />
              </label>

              <button onClick={handlePlaceTrade}>Place Trade</button>
            </div>
          </div>
        );
      default:
        return <p>No tab selected.</p>;
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <img src="/ghost.jpg" alt="Ghost FX Logo" className="logo" />
        <nav className="nav-links">
          {["overview", "sessions", "reports", "strategy", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "active" : ""}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <button className="logout-btn">Logout</button>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          <span className="balance">Balance: ${balance.toFixed(2)}</span>
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
