import React, { useState } from "react";
import { DIFFICULTY_PRESETS } from "../../utils/puzzleEngine";

export function RoundsView({
  images = [],
  currentRoundConfig,
  onSaveRoundConfig,
  onStartRound,
  playerCount = 0
}) {
  const [roundNumber, setRoundNumber] = useState(currentRoundConfig?.round || 1);
  const [selectedImage, setSelectedImage] = useState(
    images.find((x) => x.public_url === currentRoundConfig?.image) || images[0] || {}
  );
  const [difficultyKey, setDifficultyKey] = useState(currentRoundConfig?.difficulty || "MEDIUM");
  const [piecesCount, setPiecesCount] = useState(
    currentRoundConfig?.pieces || DIFFICULTY_PRESETS[currentRoundConfig?.difficulty || "MEDIUM"]?.pieces || 16
  );
  const [memorySeconds, setMemorySeconds] = useState(currentRoundConfig?.memory || 20);
  const [puzzleSeconds, setPuzzleSeconds] = useState(currentRoundConfig?.puzzle || 45);

  const selectedPreset = DIFFICULTY_PRESETS[difficultyKey] || DIFFICULTY_PRESETS["MEDIUM"];

  const handleSelectDifficulty = (key) => {
    setDifficultyKey(key);
    const preset = DIFFICULTY_PRESETS[key];
    if (preset) {
      setPiecesCount(preset.pieces);
      setMemorySeconds(preset.memorySec || 20);
      setPuzzleSeconds(preset.puzzleSec || 45);
    }
  };

  const handleSelectPieces = (num) => {
    setPiecesCount(num);
    const matchedKey = Object.keys(DIFFICULTY_PRESETS).find(
      (k) => DIFFICULTY_PRESETS[k].pieces === num
    );
    if (matchedKey) {
      setDifficultyKey(matchedKey);
    } else {
      setDifficultyKey("CUSTOM");
    }
  };

  const handlePickImage = (img) => {
    setSelectedImage(img);
    onSaveRoundConfig({
      round: roundNumber,
      image: img.public_url || images[0]?.public_url,
      imageName: img.name || "AI Image",
      pieces: piecesCount,
      difficulty: difficultyKey,
      memory: memorySeconds,
      puzzle: puzzleSeconds
    });
  };

  const handleSave = () => {
    onSaveRoundConfig({
      round: roundNumber,
      image: selectedImage.public_url || images[0]?.public_url,
      imageName: selectedImage.name || "AI Image",
      pieces: piecesCount,
      difficulty: difficultyKey,
      memory: memorySeconds,
      puzzle: puzzleSeconds
    });
  };

  return (
    <div className="rounds-view-container">
      {/* 1. PRIMARY ROUND CONFIGURATION CARD */}
      <div className="round-config-card glass-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <h2>ROUND CONFIGURATION</h2>
            <p className="header-subtitle">Configure rules and image selection for the upcoming round</p>
          </div>
        </div>

        {/* HORIZONTAL ROUND SELECTOR */}
        <div className="config-section">
          <label className="section-label">Target Round</label>
          <div className="round-selector-bar">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                className={`round-selector-btn ${roundNumber === num ? "active" : ""}`}
                onClick={() => setRoundNumber(num)}
              >
                Round {num}
              </button>
            ))}
          </div>
        </div>

        {/* IMAGE SELECTION GRID (4 COLS DESKTOP, CONTROLLED 16:9 ASPECT RATIO) */}
        <div className="config-section">
          <label className="section-label">Select AI Image for Round</label>
          <div className="admin-image-selection-grid">
            {images.map((img) => {
              const isSelected = selectedImage.id === img.id || selectedImage.public_url === img.public_url;
              return (
                <div
                  key={img.id || img.public_url}
                  className={`admin-image-option-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePickImage(img)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handlePickImage(img);
                  }}
                >
                  <div className="image-thumb-holder">
                    <img src={img.public_url} alt={img.name} className="image-thumb-img" />
                    {isSelected && <span className="selected-check-badge">✓ SELECTED</span>}
                  </div>
                  <div className="image-card-title-bar">
                    <span className="image-card-name">{img.name}</span>
                    <span className="image-card-category">{img.category || "AI"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROUND SETTINGS (2-COLUMN RESPONSIVE LAYOUT) */}
        <div className="round-settings-two-col">
          {/* LEFT: PUZZLE DIFFICULTY SELECTOR */}
          <div className="settings-col">
            <label className="section-label">Number of Puzzle Pieces (Grid Size)</label>
            <div className="piece-selector-bar" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {[9, 16, 25, 36, 49, 64].map((num) => {
                const gSize = Math.round(Math.sqrt(num));
                const isSelected = piecesCount === num;
                return (
                  <button
                    key={num}
                    type="button"
                    className={`round-selector-btn ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectPieces(num)}
                    style={{ flex: "1 1 70px", minWidth: "65px", padding: "8px 4px", textAlign: "center" }}
                  >
                    <strong>{num}</strong>
                    <span style={{ display: "block", fontSize: "0.75rem", opacity: 0.85 }}>
                      {gSize}×{gSize}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="section-label">Difficulty Presets</label>
            <div className="difficulty-options-grid">
              {Object.keys(DIFFICULTY_PRESETS).map((key) => {
                const preset = DIFFICULTY_PRESETS[key];
                const isCurrent = difficultyKey === key;
                return (
                  <div
                    key={key}
                    className={`difficulty-option-card ${isCurrent ? "active" : ""}`}
                    onClick={() => handleSelectDifficulty(key)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isCurrent}
                  >
                    <div className="diff-card-header">
                      <strong className="diff-name">{preset.name}</strong>
                      {isCurrent && <span className="diff-active-dot">●</span>}
                    </div>
                    <div className="diff-details">
                      <span className="diff-pieces">{preset.pieces} Pieces</span>
                      <span className="diff-grid">{preset.grid} × {preset.grid} Grid</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: TIMERS CONFIGURATION */}
          <div className="settings-col">
            <label className="section-label">Round Timers</label>
            <div className="timers-control-box glass-card-subtle">
              <div className="timer-slider-group">
                <div className="slider-label-row">
                  <span className="slider-title">Memory Duration</span>
                  <span className="slider-val-badge">{memorySeconds} sec</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={memorySeconds}
                  onChange={(e) => setMemorySeconds(Number(e.target.value))}
                  className="modern-range-slider"
                  aria-label="Memory Duration Seconds"
                />
                <div className="slider-minmax-row">
                  <span>5s</span>
                  <span>60s</span>
                </div>
              </div>

              <div className="timer-slider-group">
                <div className="slider-label-row">
                  <span className="slider-title">Puzzle Solving Duration</span>
                  <span className="slider-val-badge">{puzzleSeconds} sec</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  value={puzzleSeconds}
                  onChange={(e) => setPuzzleSeconds(Number(e.target.value))}
                  className="modern-range-slider"
                  aria-label="Puzzle Solving Duration Seconds"
                />
                <div className="slider-minmax-row">
                  <span>15s</span>
                  <span>120s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAVE & START ACTIONS BAR */}
        <div className="config-actions-bar">
          <button type="button" className="btn btn-secondary btn-md" onClick={handleSave}>
            💾 Save Round Configuration
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg pulse-glow main-start-cta"
            onClick={() => {
              handleSave();
              onStartRound();
            }}
          >
            <span>▶ START ROUND {roundNumber}</span>
            {playerCount > 0 && <span className="ready-players-pill">{playerCount} PLAYERS READY</span>}
          </button>
        </div>
      </div>

      {/* 2. ROUND PREVIEW CARD */}
      <div className="round-preview-card glass-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <h2>ROUND PREVIEW</h2>
            <span className="status-ready-pill">● READY FOR PLAYERS</span>
          </div>
        </div>

        <div className="preview-two-col-layout">
          {/* LEFT: PREVIEW IMAGE (CONSTRAINED ASPECT-RATIO 16/9, MAX-WIDTH 320PX) */}
          <div className="preview-image-container">
            <div className="preview-img-wrapper">
              <img
                src={selectedImage.public_url || images[0]?.public_url}
                alt={selectedImage.name || "Target AI Image"}
                className="preview-constrained-img"
              />
              <span className="preview-img-title-tag">{selectedImage.name || "AI Starter Asset"}</span>
            </div>
          </div>

          {/* RIGHT: ROUND INFORMATION SPECS */}
          <div className="preview-info-container">
            <div className="preview-specs-grid">
              <div className="spec-card">
                <span className="spec-label">TARGET ROUND</span>
                <strong className="spec-val">Round {roundNumber}</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">DIFFICULTY</span>
                <strong className="spec-val">{difficultyKey}</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">PUZZLE GRID</span>
                <strong className="spec-val">{piecesCount} Pieces ({Math.round(Math.sqrt(piecesCount))}×{Math.round(Math.sqrt(piecesCount))})</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">MEMORY TIME</span>
                <strong className="spec-val">{memorySeconds} Seconds</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">SOLVE TIME LIMIT</span>
                <strong className="spec-val">{puzzleSeconds} Seconds</strong>
              </div>
              <div className="spec-card">
                <span className="spec-label">PLAYERS READY</span>
                <strong className="spec-val green-text">{playerCount} Active Joined</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-lg pulse-glow mt-4"
              onClick={() => {
                handleSave();
                onStartRound();
              }}
            >
              🚀 START ROUND NOW ({playerCount} PLAYERS READY)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
