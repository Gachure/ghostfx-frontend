function simpleRSIStrategy(priceHistory) {
    // Fake RSI logic: if last price up 3 times in a row → BUY, if down → SELL
    const last = priceHistory.slice(-3);
    const uptrend = last.every((val, i, arr) => i === 0 || val > arr[i - 1]);
    const downtrend = last.every((val, i, arr) => i === 0 || val < arr[i - 1]);
  
    if (uptrend) return "CALL";
    if (downtrend) return "PUT";
    return null;
  }
  
  module.exports = { simpleRSIStrategy };
  