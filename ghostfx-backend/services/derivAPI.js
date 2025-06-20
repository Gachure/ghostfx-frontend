// services/derivAPI.js
const WebSocket = require("ws");

function getBalance() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://ws.deriv.com/websockets/v3");

    ws.on("open", () => {
      ws.send(JSON.stringify({ authorize: process.env.DERIV_API_TOKEN }));
    });

    ws.on("message", (msg) => {
      const data = JSON.parse(msg);

      if (data.msg_type === "authorize") {
        ws.send(JSON.stringify({ balance: 1, subscribe: 0 }));
      }

      if (data.msg_type === "balance") {
        resolve({ balance: data.balance.balance });
        ws.close();
      }

      if (data.error) {
        reject(data.error.message);
        ws.close();
      }
    });

    ws.on("error", (err) => {
      reject("WebSocket connection failed: " + err.message);
    });
  });
}

// Mock placeTrade for now
function placeTrade({ contract_type }) {
  return Promise.resolve({
    contract_type,
    result: "Trade placed (mocked)"
  });
}

module.exports = { getBalance, placeTrade };

