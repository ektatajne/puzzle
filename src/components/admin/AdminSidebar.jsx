import React from "react";

export function AdminSidebar({ activeTab, setActiveTab, liveStatus = "LIVE" }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "live", label: "Live Game", icon: "🎮", badge: liveStatus === "LIVE" ? "LIVE" : null },
    { id: "tournament", label: "Tournament Bracket", icon: "⚔️" },
    { id: "players", label: "Players", icon: "👥" },
    { id: "images", label: "Image Library", icon: "🖼️" },
    { id: "rounds", label: "Round Config", icon: "⚙️" },
    { id: "results", label: "Live Results", icon: "🏆" },
    { id: "ranking", label: "Ranking & Winner", icon: "🏅" },
    { id: "history", label: "Game History", icon: "📜" },
    { id: "analytics", label: "Analytics", icon: "📈" }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">🧩</div>
        <div className="brand-text">
          <span className="brand-title">MEMORY RUSH</span>
          <span className="brand-subtitle">EXPO CONTROL CENTER</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge pulse-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="event-tag">
          <span className="event-label">EVENT</span>
          <strong className="event-name">TCS EEE Expo 2026</strong>
        </div>
        <div className={`status-indicator status-${liveStatus.toLowerCase()}`}>
          <span className="status-dot"></span>
          <span className="status-text">{liveStatus}</span>
        </div>
      </div>
    </aside>
  );
}
