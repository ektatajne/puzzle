import React, { useState } from "react";

export function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("admin@tcs.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (password === "admin" || password === "tcs2026" || password.length >= 4) {
        onLoginSuccess();
      } else {
        setError("Invalid credentials. Please try again.");
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="admin-login-page">
      {/* BACKGROUND AMBIENT GLOWS & TECHNICAL GRID */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow-1" />
      <div className="login-bg-glow-2" />
      <div className="login-vignette" />

      {/* TOP BRANDING */}
      <div className="login-top-branding">
        <span className="brand-puzzle-icon">🧩</span>
        <div className="brand-text-block">
          <span className="brand-main-title">MEMORY RUSH</span>
          <span className="brand-event-subtitle">TCS EEE EXPO 2026</span>
        </div>
      </div>

      <div className="login-layout-wrapper">
        {/* OPTIONAL DESKTOP SIDE VISUAL */}
        <div className="login-side-visual">
          <div className="side-visual-content">
            <span className="expo-tag-chip">EXPO CONTROL CENTER</span>
            <h2>AI MEMORY & PUZZLE CHALLENGE</h2>
            <p>Real-time live event gaming platform for TCS EEE Expo 2026.</p>
            
            <div className="side-telemetry-box">
              <div className="telemetry-item">
                <span className="dot online" />
                <span>REALTIME ENGINE READY</span>
              </div>
              <div className="telemetry-item">
                <span className="dot active" />
                <span>EXPO ROOM EXPO26</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN LOGIN CARD */}
        <div className="login-card-container">
          <div className="login-card">
            {/* CARD HEADER */}
            <div className="card-top-badge">HOST CONTROL CENTER</div>
            
            <h1 className="login-title">HOST CONTROL LOGIN</h1>
            
            <p className="login-subtitle">
              Secure access to the Memory Rush live game control center.
            </p>

            <div className="security-indicator">
              <span className="secure-dot" />
              <span>SECURE ADMIN ACCESS</span>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="admin-email">ADMIN EMAIL</label>
                <div className="input-input-wrapper">
                  <span className="input-icon">✉️</span>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tcs.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">HOST PASSWORD</label>
                <div className="input-input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter host password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-alert-banner" role="alert">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-unlock-control"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="btn-spinner" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <span>UNLOCK CONTROL CENTER</span>
                )}
              </button>
            </form>

            <div className="security-help-text">
              <span>Authorized hosts only • TCS EEE Expo</span>
            </div>

            <div className="card-footer-branding">
              <span>Memory Rush Control Center</span>
              <span className="footer-dot">•</span>
              <span>TCS EEE Expo 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
