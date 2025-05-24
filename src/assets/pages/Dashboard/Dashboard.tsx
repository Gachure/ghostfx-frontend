import { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState({ trades: 0, profit: 0, rate: 0 });
  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [balance, setBalance] = useState(0); // ✅ Add this line

  useEffect(() => {
    // Fetch dashboard summary, reports, sessions
    axios.get("http://localhost:5000/api/dashboard")
      .then((res) => {
        setSummary(res.data.summary);
        setReports(res.data.reports);
        setSessions(res.data.sessions);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard data:", err);
      });

    // Fetch live Deriv balance
    axios.get("http://localhost:5000/api/balance")
      .then((res) => {
        setBalance(res.data.balance);
      })
      .catch((err) => {
        console.error("Failed to fetch balance:", err);
      });
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="overview-tab">
            <h2 className="tab-title">Today's Summary</h2>
            <div className="summary-cards">
              <div className="card"><h3>Trades Executed</h3><p>{summary.trades}</p></div>
              <div className="card"><h3>Profit</h3><p>${summary.profit.toFixed(2)}</p></div>
              <div className="card"><h3>Success Rate</h3><p>{summary.rate}%</p></div>
            </div>
          </div>
        );

      case "sessions":
        return (
          <div className="tab-content">
            <h3>Today's Trading Sessions</h3>
            <ul className="session-list">
              {sessions.map((s, i) => (
                <li key={i}><strong>{s.period}:</strong> {s.time} – {s.result}</li>
              ))}
            </ul>
          </div>
        );

      case "reports":
        return (
          <div className="tab-content">
            <h3>Trade Reports</h3>
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

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
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

      {/* Main Content */}
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
