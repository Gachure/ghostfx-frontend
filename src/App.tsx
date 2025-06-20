import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./assets/pages/Dashboard/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold">Ghost FX</h1>
                <p>Paste your Deriv Token to log in</p>
                <input
                  type="text"
                  placeholder="Deriv Token"
                  className="px-4 py-2 rounded text-black"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const token = (e.target as HTMLInputElement).value;
                      if (token) {
                        localStorage.setItem("derivToken", token);
                        window.location.href = "/dashboard";
                      }
                    }
                  }}
                />
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
