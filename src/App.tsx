import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { MatchPage } from './pages/MatchPage';
import { NewTournamentPage } from './pages/NewTournamentPage';
import { HistoryPage } from './pages/HistoryPage';
import { PlayerStatsPage } from './pages/PlayerStatsPage';
import { PlayersPage } from './pages/PlayersPage';
import { RacePage } from './pages/RacePage';
import { SettingsPage } from './pages/SettingsPage';
import { TournamentPage } from './pages/TournamentPage';
import { TournamentsPage } from './pages/TournamentsPage';

// HashRouter: GitHub Pages no sabe redirigir rutas a index.html.
export function App() {
  return (
    <HashRouter>
      <main className="app">
        <Routes>
          <Route path="/" element={<TournamentsPage />} />
          <Route path="/nuevo" element={<NewTournamentPage />} />
          <Route path="/torneo/:id" element={<TournamentPage />} />
          <Route path="/torneo/:id/partido/:matchId" element={<MatchPage />} />
          <Route path="/torneo/:id/carrera/:raceId" element={<RacePage />} />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/jugador/:id" element={<PlayerStatsPage />} />
          <Route path="/jugadores" element={<PlayersPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>🏆<span>Torneos</span></NavLink>
        <NavLink to="/historial">📜<span>Historial</span></NavLink>
        <NavLink to="/jugadores">👥<span>Jugadores</span></NavLink>
        <NavLink to="/ajustes">⚙️<span>Ajustes</span></NavLink>
      </nav>
    </HashRouter>
  );
}
