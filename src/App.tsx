import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { GeneralPage } from './pages/GeneralPage';
import { HistoryPage } from './pages/HistoryPage';
import { MatchPage } from './pages/MatchPage';
import { NewTournamentPage } from './pages/NewTournamentPage';
import { PlayerStatsPage } from './pages/PlayerStatsPage';
import { PlayersPage } from './pages/PlayersPage';
import { RacePage } from './pages/RacePage';
import { SettingsPage } from './pages/SettingsPage';
import { TournamentPage } from './pages/TournamentPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { Icon, type IconName } from './ui/Icon';

const TABS: [string, IconName, string][] = [
  ['/', 'trophy', 'Torneos'],
  ['/general', 'chart', 'General'],
  ['/historial', 'clock', 'Historial'],
  ['/jugadores', 'users', 'Jugadores'],
  ['/ajustes', 'settings', 'Ajustes'],
];

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
          <Route path="/general" element={<GeneralPage />} />
          <Route path="/historial" element={<HistoryPage />} />
          <Route path="/jugador/:id" element={<PlayerStatsPage />} />
          <Route path="/jugadores" element={<PlayersPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Secciones">
        {TABS.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <span className="tab-icon"><Icon name={icon} size={22} /></span>
            {label}
          </NavLink>
        ))}
      </nav>
    </HashRouter>
  );
}
