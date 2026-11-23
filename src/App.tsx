import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { MatchPage } from './pages/MatchPage';
import { NewTournamentPage } from './pages/NewTournamentPage';
import { PlayersPage } from './pages/PlayersPage';
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
          <Route path="/jugadores" element={<PlayersPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>🏆<span>Torneos</span></NavLink>
        <NavLink to="/jugadores">👥<span>Jugadores</span></NavLink>
        <NavLink to="/ajustes">⚙️<span>Ajustes</span></NavLink>
      </nav>
    </HashRouter>
  );
}
