import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayerChip } from '../components/PlayerChip';
import { tournamentLeaders } from '../games/stats';
import { formatTime } from '../games/tmRace';
import { trackRecords } from '../games/tmTournament';
import { GAMES } from '../model/games';
import type { GameId } from '../model/types';
import { useData } from '../store/store';

export function HistoryPage() {
  const data = useData();
  const [game, setGame] = useState<GameId | null>(null);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const finished = data.tournaments
    .filter((t) => t.status === 'finished' && (!game || t.game === game))
    .sort((a, b) => (b.finishedAt ?? b.createdAt).localeCompare(a.finishedAt ?? a.createdAt));

  // Campeonatos por jugador, para el ranking histórico.
  const titles = new Map<string, number>();
  for (const t of finished) for (const p of tournamentLeaders(t)) titles.set(p, (titles.get(p) ?? 0) + 1);
  const ranking = [...titles.entries()].sort((a, b) => b[1] - a[1]);

  const modes = [...new Set(data.tmTracks.map((t) => t.carMode))];

  return (
    <div className="page">
      <header className="page-header">
        <h1>Historial</h1>
      </header>
      <div className="chips">
        <button type="button" className={`chip ${game === null ? 'chip-on' : ''}`} onClick={() => setGame(null)}>Todos</button>
        {Object.values(GAMES).map((g) => (
          <button key={g.id} type="button" className={`chip ${game === g.id ? 'chip-on' : ''}`} onClick={() => setGame(g.id)}>
            {g.emoji} {g.name}
          </button>
        ))}
      </div>

      {ranking.length > 0 && (
        <section className="card stack">
          <h2>Campeonatos</h2>
          <ol className="board">
            {ranking.map(([pid, n]) => {
              const p = players.get(pid);
              return (
                <li key={pid} className="board-row">
                  <Link to={`/jugador/${pid}`} className="name-cell grow">
                    <span className="dot" style={{ background: p?.color }} /> {p?.name ?? '?'}
                  </Link>
                  <span className="board-pts">{n} 🏆</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section>
        <h2>Torneos terminados</h2>
        {finished.length === 0 ? (
          <p className="muted">Cuando termines un torneo aparece acá.</p>
        ) : (
          <ul className="cards">
            {finished.map((t) => {
              const leaders = tournamentLeaders(t);
              return (
                <li key={t.id}>
                  <Link to={`/torneo/${t.id}`} className="card card-link">
                    <span className="card-emoji">{GAMES[t.game].emoji}</span>
                    <span className="card-body grow">
                      <strong>{t.name}</strong>
                      <span className="muted">
                        {new Date(t.finishedAt ?? t.createdAt).toLocaleDateString('es-AR')} · {t.playerIds.length} jugadores
                      </span>
                      {leaders.length > 0 && (
                        <span className="chips">
                          {leaders.map((id) => {
                            const p = players.get(id);
                            return p ? <PlayerChip key={id} player={p} /> : null;
                          })}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(game === null || game === 'trackmania') && modes.length > 0 && (
        <section className="card stack">
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
                        <span className="muted">sin tiempos</span>
                      ) : (
                        <span className="record-list">
                          {recs.map((r, i) => (
                            <span key={r.playerId} className={i === 0 ? 'record-top' : 'muted'}>
                              {['🥇', '🥈', '🥉'][i]} {players.get(r.playerId)?.name} {formatTime(r.timeMs)}
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
