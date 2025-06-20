import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CustomCursor from "../../../components/CustomCursor";
import "./Dashboard.css";

type Session = { period: string; time: string; result: string };
type Report = { time: string; type: string; result: string; profit: number };
type Summary = { trades: number; profit: number; rate: string };
type Settings = {
  currency: string;
  maxTrades: number;
  riskPerTrade: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: string;
  sessionDuration: number;
};

const MIN_BALANCE = 0.35;
const TABS = ["overview", "sessions", "reports", "strategy", "settings"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState<Summary>({ trades: 0, profit: 0, rate: "0" });
  const [reports, setReports] = useState<Report[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [balance, setBalance] = useState(0);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<Settings>({
    currency: "USD",
    maxTrades: 5,
    riskPerTrade: 10,
    notificationsEnabled: true,
    soundEnabled: false,
    theme: "dark",
    sessionDuration: 60,
  });

  const fetchDashboard = async () => {
    const token = localStorage.getItem("derivToken");
    if (!token) return;

    try {
      const [{ data: dash }, { data: bal }] = await Promise.all([
        axios.get("http://localhost:5000/api/dashboard"),
        axios.get(`http://localhost:5000/api/balance?token=${token}`)
      ]);

      setSummary(dash?.summary ?? { trades: 0, profit: 0, rate: "0" });
      setReports(dash?.reports ?? []);
      setSessions(dash?.sessions ?? []);
      setBalance(bal?.balance ?? 0);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    }
  };

  const fetchSettings = async () => {
    const token = localStorage.getItem("derivToken");
    if (!token) return;

    try {
      const { data } = await axios.get(`http://localhost:5000/api/settings?token=${token}`);
      setSettings(data.settings);
    } catch (err) {
      console.warn("No settings found for user, using defaults.");
    }
  };

  const saveSettings = async () => {
    const token = localStorage.getItem("derivToken");
    if (!token) {
      alert("User not authenticated");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/settings", { token, settings });
      alert("✅ Settings saved!");
    } catch (err) {
      alert("❌ Failed to save settings.");
      console.error(err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("derivToken");
    if (!token) {
      navigate("/");
      return;
    }

    fetchDashboard();
    fetchSettings();
  }, [navigate]);

  const placeAutoTrades = async () => {
    const token = localStorage.getItem("derivToken");
    if (!token) {
      navigate("/");
      return;
    }

    if (balance < MIN_BALANCE) {
      setMessage(`❌ Balance too low. Minimum $${MIN_BALANCE.toFixed(2)}`);
      return;
    }

    try {
      setIsAutoTrading(true);
      setMessage("⏳ Starting Auto Trade...");

      await axios.post("http://localhost:5000/api/session", { token });
      await new Promise((res) => setTimeout(res, 12000));

      await fetchDashboard();
      setMessage("✅ Auto RSI session ended");
    } catch (err) {
      setMessage("❌ Auto trade failed. Check connection or backend.");
      console.error(err);
    } finally {
      setIsAutoTrading(false);
    }
  };

  const downloadCSV = () => {
    const csv = "Time,Type,Result,Profit\n" +
      reports.map(r => `${r.time},${r.type},${r.result},${r.profit}`).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "reports.csv";
    a.click();
  };

  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  return (
    <>
      <CustomCursor />
      <div className="dashboard-container">
        <aside className="sidebar">
          <img src="/ghost.jpg" alt="Ghost FX Logo" className="logo" />
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "active" : ""}
            >
              {capitalize(tab)}
            </button>
          ))}
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("derivToken");
              navigate("/");
            }}
          >
            Logout
          </button>
        </aside>

        <main className="main-content">
          <div className="topbar">
            <h2>{capitalize(activeTab)}</h2>
            <span className="balance">Balance: ${balance.toFixed(2)}</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="tab-content fade-in"
            >
              {activeTab === "overview" && (
                <div className="overview-tab">
                  <h2>Today's Summary</h2>
                  <div className="summary-cards">
                    <div className="card"><h3>Trades</h3><p>{summary.trades}</p></div>
                    <div className="card"><h3>Profit</h3><p>${summary.profit.toFixed(2)}</p></div>
                    <div className="card"><h3>Rate</h3><p>{summary.rate}%</p></div>
                  </div>
                </div>
              )}

              {activeTab === "sessions" && (
                <div>
                  <h3>Today's Sessions</h3>
                  <ul className="session-list">
                    {sessions.map((s, i) => (
                      <li key={i}>
                        <strong>{s.period}</strong> {s.time}: {s.result}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "reports" && (
                <div>
                  <h3>Reports</h3>
                  <button className="download-btn" onClick={downloadCSV}>Download CSV</button>

                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reports.slice(0, 10).reverse()}>
                      <CartesianGrid stroke="#ccc" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" />
                    </LineChart>
                  </ResponsiveContainer>

                  <table className="report-table">
                    <thead>
                      <tr><th>Time</th><th>Type</th><th>Result</th><th>Profit/Loss</th></tr>
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
              )}

              {activeTab === "strategy" && (
                <div>
                  <h3>Auto Trade Strategy</h3>
                  <p>Automatically trades across Volatility Indices with AI-logic and contract types.</p>
                  <button onClick={placeAutoTrades} disabled={isAutoTrading}>
                    {isAutoTrading ? "Running..." : "Start Auto Trade"}
                  </button>
                  {message && <p className="status-msg">{message}</p>}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="settings-tab">
                  <h3>App Settings</h3>

                  <div className="setting-group">
                    <label>Display Currency:</label>
                    <select value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                      <option value="USD">$ - USD</option>
                      <option value="EUR">€ - EUR</option>
                      <option value="KES">Ksh - KES</option>
                    </select>
                  </div>

                  <div className="setting-group">
                    <label>Max Auto Trades Per Session:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.maxTrades}
                      onChange={e => setSettings({ ...settings, maxTrades: Number(e.target.value) })}
                    />
                  </div>

                  <div className="setting-group">
                    <label>Risk per Trade (%):</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.riskPerTrade}
                      onChange={e => setSettings({ ...settings, riskPerTrade: Number(e.target.value) })}
                    />
                  </div>

                  <div className="setting-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.notificationsEnabled}
                        onChange={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
                      />
                      Enable Trade Notifications
                    </label>
                  </div>

                  <div className="setting-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                      />
                      Enable Sound Alerts
                    </label>
                  </div>

                  <div className="setting-group">
                    <label>Theme:</label>
                    <select value={settings.theme} onChange={e => setSettings({ ...settings, theme: e.target.value })}>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>

                  <div className="setting-group">
                    <label>Session Duration (mins):</label>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={settings.sessionDuration}
                      onChange={e => setSettings({ ...settings, sessionDuration: Number(e.target.value) })}
                    />
                  </div>

                  <button className="save-btn" onClick={saveSettings}>
                    Save Changes
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
