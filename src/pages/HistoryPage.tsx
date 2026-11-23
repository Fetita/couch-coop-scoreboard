import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tournamentLeaders } from '../games/stats';
import { formatTime } from '../games/tmRace';
import { trackRecords } from '../games/tmTournament';
import { GAMES } from '../model/games';
import type { GameId } from '../model/types';
import { useData } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { PageHeader } from '../ui/PageHeader';
import { TournamentCard } from './TournamentsPage';

export function HistoryPage() {
  const data = useData();
  const [game, setGame] = useState<GameId | null>(null);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const finished = data.tournaments
    .filter((t) => t.status === 'finished' && (!game || t.game === game))
    .sort((a, b) => (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt));

  // Campeonatos por jugador.
  const titles = new Map<string, number>();
  for (const t of finished) for (const p of tournamentLeaders(t)) titles.set(p, (titles.get(p) ?? 0) + 1);
  const ranking = [...titles.entries()].sort((a, b) => b[1] - a[1]);
  const modes = [...new Set(data.tmTracks.map((t) => t.carMode))];

  return (
    <div className="page">
      <PageHeader title="Historial" subtitle="Torneos terminados, campeones y récords" />
      <div className="filter-row">
        <button type="button" className={`chip text-only ${game === null ? 'chip-on' : ''}`} onClick={() => setGame(null)}>Todos</button>
        {Object.values(GAMES).map((g) => (
          <button key={g.id} type="button" className={`chip text-only ${game === g.id ? 'chip-on' : ''}`} onClick={() => setGame(g.id)}>{g.name}</button>
        ))}
      </div>

      {ranking.length > 0 && (
        <section className="card">
          <h2>Campeonatos</h2>
          <ol className="board">
            {ranking.map(([pid, n], i) => (
              <li key={pid} className={`board-row${i === 0 ? ' p1' : ''}`}>
                <Link to={`/jugador/${pid}`} className="grow"><PlayerName player={players.get(pid)} size={30} bold /></Link>
                <span className="row" style={{ gap: 4 }}>
                  {Array.from({ length: Math.min(n, 5) }, (_, k) => <span key={k} className="trophy">🏆</span>)}
                  {n > 5 && <strong>×{n}</strong>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="stack-sm">
        <div className="section-title"><h2>Torneos terminados</h2></div>
        {finished.length === 0 ? (
          <p className="muted">Cuando termines un torneo aparece acá.</p>
        ) : (
          <ul className="list">
            {finished.map((t) => <li key={t.id}><TournamentCard t={t} players={players} /></li>)}
          </ul>
        )}
      </section>

      {(game === null || game === 'trackmania') && modes.length > 0 && (
        <section className="card theme-tm">
          <h2>Récords por pista</h2>
          {modes.map((mode) => (
            <div key={mode} className="stack-sm">
              <div className="round-label">{mode}</div>
              {data.tmTracks
                .filter((t) => t.carMode === mode)
                .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
                .map((track) => {
                  const recs = trackRecords(data, track.id).slice(0, 3);
                  return (
                    <div key={track.id} className="record-row">
                      <strong>{track.name}</strong>
                      {recs.length === 0 ? (
                        <span className="hint">sin tiempos</span>
                      ) : (
                        <span className="record-list">
                          {recs.map((r, i) => (
                            <span key={r.playerId} className={`row${i === 0 ? ' record-top' : ' muted'}`} style={{ gap: 6 }}>
                              <span className={`medal m${i + 1}`}>{i + 1}</span>
                              <Avatar player={players.get(r.playerId)} size={18} />
                              {players.get(r.playerId)?.name} {formatTime(r.timeMs)}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
