const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
// const fs = require("fs"); // Uncomment if you want to persist settings to file

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 5000;

// State
let reports = [];
let summary = { trades: 0, profit: 0, rate: "0" };
let sessions = [];
let sessionTracker = { morning: false, afternoon: false, evening: false };

// SETTINGS (load from file if needed)
// const SETTINGS_FILE = "./settings.json";
// let settings = fs.existsSync(SETTINGS_FILE)
//   ? JSON.parse(fs.readFileSync(SETTINGS_FILE))
//   : {
let settings = {
  currency: "USD",
  stakeAmount: 0.35,
  maxTrades: 5,
  stopLoss: 2,
  takeProfit: 5,
  riskPerTrade: 10,
  notificationsEnabled: true,
  soundEnabled: false,
  theme: "dark",
  sessionDuration: 60,
};
// };

// UTILS
const getTime = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

const getSessionPeriod = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

// 🟢 GET BALANCE
app.get("/api/balance", (req, res) => {
  const { token } = req.query;
  const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");

  ws.on("open", () => ws.send(JSON.stringify({ authorize: token })));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.msg_type === "authorize") {
      ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    }
    if (data.msg_type === "balance") {
      ws.close();
      return res.json({ balance: data.balance.balance });
    }
  });

  ws.on("error", () => {
    res.status(500).json({ error: "Balance fetch failed" });
  });
});

// 🟢 GET DASHBOARD
app.get("/api/dashboard", (req, res) => {
  res.json({ summary, reports, sessions });
});

// ... everything above remains the same

// ✅ GET SETTINGS - wraps in `settings` object to match frontend expectations
app.get("/api/settings", (req, res) => {
  res.json({ settings }); // 🔥 This was the bug: you were returning settings directly
});

// ✅ POST SETTINGS - still merges + validates
app.post("/api/settings", (req, res) => {
  const newSettings = req.body.settings ?? req.body;

  const isValid =
    typeof newSettings.stakeAmount === "number" &&
    typeof newSettings.maxTrades === "number" &&
    typeof newSettings.stopLoss === "number" &&
    typeof newSettings.takeProfit === "number";

  if (!isValid) {
    return res.status(400).json({ error: "Invalid settings format" });
  }

  settings = { ...settings, ...newSettings };

  // Optional: save to file later
  // fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

  console.log("✅ Settings updated:", settings);
  res.json({ message: "Settings updated", settings });
});


// 🔁 AUTO TRADE SESSION
app.post("/api/session", async (req, res) => {
  const { token } = req.body;
  const period = getSessionPeriod();

  if (sessionTracker[period]) {
    return res.status(400).json({
      error: `Already traded in ${period} session`,
    });
  }

  if (summary.trades >= settings.maxTrades) {
    return res.status(400).json({ error: "Max trades reached" });
  }

  if (summary.profit <= -Math.abs(settings.stopLoss)) {
    return res.status(400).json({ error: "Stop loss hit" });
  }

  if (summary.profit >= settings.takeProfit) {
    return res.status(400).json({ error: "Take profit reached" });
  }

  try {
    const result = await autoTradeSession(token, period);
    sessionTracker[period] = true;
    return res.json({ message: result });
  } catch (err) {
    console.error("Trade session error", err);
    return res.status(500).json({ error: "Trade session failed" });
  }
});

// ⚙️ AUTO TRADE FUNCTION
function autoTradeSession(token, period) {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");

    let ticks = [];
    let tradePlaced = false;
    let contractType = null;
    let entryMethod = "none";

    const calculateRSI = (closes, period = 14) => {
      if (closes.length < period + 1) return null;
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        diff >= 0 ? gains += diff : losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return Math.round(100 - 100 / (1 + rs));
    };

    const placeTrade = (type) => {
      contractType = type;
      tradePlaced = true;
      entryMethod = entryMethod || "fallback_digit";

      ws.send(JSON.stringify({
        buy: 1,
        price: settings.stakeAmount,
        parameters: {
          amount: settings.stakeAmount,
          basis: "stake",
          contract_type: type,
          currency: settings.currency || "USD",
          duration: 1,
          duration_unit: "m",
          symbol: "R_50"
        }
      }));
    };

    ws.on("open", () => {
      ws.send(JSON.stringify({ authorize: token }));
    });

    ws.on("message", (msg) => {
      const data = JSON.parse(msg);

      if (data.msg_type === "authorize") {
        ws.send(JSON.stringify({
          ticks_history: "R_50",
          style: "close",
          count: 20,
          adjust_start_time: 1
        }));
      }

      if (data.msg_type === "history" && !tradePlaced) {
        const prices = Object.values(data.history.prices).map(Number);
        ticks = prices;
        const rsi = calculateRSI(prices);

        if (rsi < 30) {
          contractType = "CALL";
          entryMethod = "RSI_LOW";
          placeTrade("CALL");
        } else if (rsi > 70) {
          contractType = "PUT";
          entryMethod = "RSI_HIGH";
          placeTrade("PUT");
        } else {
          const lastDigit = parseInt(prices[prices.length - 1].toString().slice(-1));
          contractType = lastDigit % 2 === 0 ? "DIGITEVEN" : "DIGITODD";
          entryMethod = "DIGIT";
          placeTrade(contractType);
        }
      }

      if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract.is_sold) {
        const profit = data.proposal_open_contract.profit;
        const outcome = profit > 0 ? "win" : "loss";
        const now = getTime();

        reports.push({
          time: now,
          type: contractType,
          result: outcome,
          profit,
          method: entryMethod
        });

        summary.trades++;
        summary.profit += profit;
        const wins = reports.filter(r => r.profit > 0).length;
        summary.rate = ((wins / summary.trades) * 100).toFixed(1);

        sessions.push({
          period,
          time: now,
          result: `${contractType} → ${outcome}`,
          method: entryMethod
        });

        ws.close();
        resolve("Trade executed and recorded");
      }
    });

    ws.on("error", () => {
      resolve("WebSocket failed");
    });
  });
}

app.listen(PORT, () =>
  console.log(`✅ Ghost FX backend live at http://localhost:${PORT}`)
);
