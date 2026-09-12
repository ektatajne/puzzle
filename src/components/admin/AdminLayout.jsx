import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { DashboardView } from "./DashboardView";
import { LiveGameView } from "./LiveGameView";
import { PlayersView } from "./PlayersView";
import { ImagesView } from "./ImagesView";
import { RoundsView } from "./RoundsView";
import { ResultsView } from "./ResultsView";
import { RankingView } from "./RankingView";
import { HistoryView } from "./HistoryView";
import { TournamentHistoryView } from "./TournamentHistoryView";
import { AnalyticsView } from "./AnalyticsView";
import { AdminLogin } from "./AdminLogin";

export function AdminLayout({
  gameState,
  players,
  results,
  images,
  activeImage,
  onSelectImage,
  onUploadImage,
  onDeleteImage,
  onStartRound,
  onPause,
  onResume,
  onRestartRound,
  onEndRound,
  onNextRound,
  onSaveRoundConfig,
  onDisconnectPlayer,
  onResetPlayer,
  onRemovePlayer,
  onResetGame,
  onOpenDisplay
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      localStorage.removeItem("memoryrush_admin_auth");
      return sessionStorage.getItem("memoryrush_admin_auth") === "true";
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem("memoryrush_admin_tab") || "dashboard";
    } catch (e) {
      return "dashboard";
    }
  });

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem("memoryrush_admin_tab", tab);
    } catch (e) {}
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem("memoryrush_admin_auth", "true");
    } catch (e) {}
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const onlineCount = players.filter((p) => p.connected).length;
  const liveStatus = gameState.phase === "WAITING" || gameState.phase === "FINISHED" ? "IDLE" : "LIVE";

  return (
    <div className="admin-app-layout">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        liveStatus={liveStatus}
      />

      <div className="admin-main-viewport">
        <AdminHeader
          roomCode={gameState.roomCode || "EXPO26"}
          liveStatus={liveStatus}
          onlineCount={onlineCount}
          onOpenDisplay={onOpenDisplay}
          onResetGame={onResetGame}
        />

        <main className="admin-tab-content">
          {activeTab === "dashboard" && (
            <DashboardView
              gameState={gameState}
              players={players}
              results={results}
              onPause={onPause}
              onResume={onResume}
              onEndRound={onEndRound}
              onStartRound={onStartRound}
              onSelectPlayer={setSelectedPlayer}
              onRemovePlayer={onRemovePlayer}
              onNavigateTab={setActiveTab}
              onResetGame={onResetGame}
            />
          )}

          {activeTab === "live" && (
            <LiveGameView
              gameState={gameState}
              players={players}
              results={results}
              onStartRound={onStartRound}
              onPause={onPause}
              onResume={onResume}
              onRestartRound={onRestartRound}
              onEndRound={onEndRound}
              onNextRound={onNextRound}
              onResetGame={onResetGame}
            />
          )}

          {activeTab === "players" && (
            <PlayersView
              players={players}
              results={results}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              onCloseDrawer={() => setSelectedPlayer(null)}
              onDisconnectPlayer={onDisconnectPlayer}
              onResetPlayer={onResetPlayer}
              onRemovePlayer={onRemovePlayer}
            />
          )}

          {activeTab === "images" && (
            <ImagesView
              images={images}
              activeImage={activeImage}
              onSelectImage={onSelectImage}
              onUploadImage={onUploadImage}
              onDeleteImage={onDeleteImage}
            />
          )}

          {activeTab === "rounds" && (
            <RoundsView
              images={images}
              currentRoundConfig={gameState}
              onSaveRoundConfig={onSaveRoundConfig}
              onStartRound={onStartRound}
              playerCount={players.length}
            />
          )}

          {activeTab === "results" && (
            <ResultsView
              roomCode={gameState.roomCode || "EXPO26"}
              players={players}
              results={results}
              gameState={gameState}
            />
          )}

          {activeTab === "ranking" && (
            <RankingView
              roomCode={gameState.roomCode || "EXPO26"}
              players={players}
              results={results}
              gameState={gameState}
            />
          )}

          {activeTab === "tournament" && (
            <TournamentHistoryView
              roomCode={gameState.roomCode || "EXPO26"}
              players={players}
              results={results}
              gameState={gameState}
            />
          )}

          {activeTab === "history" && (
            <HistoryView
              roomCode={gameState.roomCode || "EXPO26"}
              players={players}
              results={results}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              players={players}
              results={results}
              images={images}
            />
          )}
        </main>
      </div>
    </div>
  );
}
