import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "../common/Toast";
import { getPublicJoinUrl, isLocalhostUrl } from "../../config/supabase";

export function AdminHeader({ roomCode, liveStatus, onlineCount, onOpenDisplay, onResetGame }) {
  const [showQrModal, setShowQrModal] = useState(false);
  const { addToast } = useToast();

  const joinUrl = getPublicJoinUrl(roomCode);
  const isLocal = isLocalhostUrl(joinUrl);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    addToast("Player join link copied to clipboard!", "success");
  };

  const handleOpenPlayerPage = () => {
    window.open(joinUrl, "_blank");
  };

  return (
    <>
      <header className="admin-header">
        <div className="header-left">
          <h1 className="header-title">MEMORY RUSH CONTROL CENTER</h1>
          <div className="header-breadcrumbs">
            <span className="breadcrumb-event">TCS EEE EXPO 2026</span>
            <span className="breadcrumb-sep">•</span>
            <span className="breadcrumb-room">
              ROOM: <strong>{roomCode}</strong>
            </span>
          </div>
        </div>

        <div className="header-right">
          <div className="connection-chip">
            <span className={`live-pulse-dot ${liveStatus === "LIVE" ? "online" : "idle"}`} />
            <span className="chip-label">{liveStatus}</span>
          </div>

          <div className="players-chip">
            <span className="chip-icon">👥</span>
            <span>{onlineCount} Online</span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowQrModal(true)}>
            <span>📱 Join QR</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onOpenDisplay}>
            <span>📺 Big Screen TV</span>
          </button>

          <button
            className="btn btn-success btn-sm pulse-glow"
            onClick={() => {
              if (window.confirm("Start a new game? This will clear the current room so new players can scan and join.")) {
                if (onResetGame) onResetGame();
              }
            }}
            style={{ background: "#10b981", borderColor: "#059669", color: "#ffffff", fontWeight: 800 }}
          >
            <span>🚀 START NEW GAME</span>
          </button>

          <div className="admin-profile">
            <div className="avatar">EX</div>
            <div className="admin-info">
              <span className="admin-name">Host Admin</span>
              <span className="admin-role">TCS Booth Operator</span>
            </div>
          </div>
        </div>
      </header>

      {/* JOIN QR MODAL */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content glass-card text-center" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="qr-title-wrap">
                <h3>PLAYER JOIN QR CODE</h3>
                <span className={`status-badge-chip ${isLocal ? "badge-warning" : "badge-success"}`}>
                  {isLocal ? "LOCAL DEV ADDRESS ⚠️" : "QR READY ✓"}
                </span>
              </div>
              <button className="drawer-close-btn" onClick={() => setShowQrModal(false)}>
                ✕
              </button>
            </div>

            {isLocal && (
              <div className="qr-warning-banner">
                <span className="warning-icon">⚠️</span>
                <span>
                  QR is currently using a local address (localhost). Set <code>VITE_PUBLIC_APP_URL</code> or deploy before using at the Expo.
                </span>
              </div>
            )}

            <div className="qr-preview-box">
              <QRCodeSVG value={joinUrl} size={240} level="H" includeMargin={true} />
              <p className="qr-url-text">{joinUrl}</p>
            </div>

            <div className="modal-actions justify-center flex-wrap">
              <button className="btn btn-secondary" onClick={handleCopyLink}>
                📋 Copy Link
              </button>
              <button className="btn btn-secondary" onClick={handleOpenPlayerPage}>
                🔗 Test Player Page
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowQrModal(false);
                  onOpenDisplay();
                }}
              >
                📺 Open Big Screen TV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
