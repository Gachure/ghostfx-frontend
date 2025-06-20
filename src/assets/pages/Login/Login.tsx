import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from './logo.png';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // For now, simulate login by storing a fixed token
    localStorage.setItem("derivToken", "H2eemDJQJ6BwsJC");
    navigate('/dashboard');
  };

  return (
    <div className="login-page">
      <div className="glow-bg"></div>
      <div className="login-card">
        <img src={logo} alt="Ghost FX Logo" className="logo" />
        <h1>Welcome to Ghost FX</h1>
        <h4>Your AI-powered binary trading assistant</h4>
        <button onClick={handleLogin} className="deriv-login-btn">
          Login to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Login;
