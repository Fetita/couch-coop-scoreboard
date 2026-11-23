import { useState } from 'react';
import { Link } from 'react-router-dom';
import { generalStandings } from '../games/stats';
import { GAMES } from '../model/games';
import type { GameId } from '../model/types';
import { useData } from '../store/store';

export function GeneralPage() {
  const data = useData();
  const [game, setGame] = useState<GameId | null>(null);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const rows = generalStandings(data, game ?? undefined);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Tabla general</h1>
        <p className="muted">Suma todo lo jugado: partidos ganados en Rocket League y puntos por puesto en Trackmania.</p>
      </header>
      <div className="chips">
        <button type="button" className={`chip ${game === null ? 'chip-on' : ''}`} onClick={() => setGame(null)}>Todos</button>
        {Object.values(GAMES).map((g) => (
          <button key={g.id} type="button" className={`chip ${game === g.id ? 'chip-on' : ''}`} onClick={() => setGame(g.id)}>
            {g.emoji} {g.name}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="muted">Todavía no hay torneos.</p>
      ) : (
        <section className="card">
          <table className="standings">
            <thead>
              <tr>
                <th>#</th>
                <th className="left">Jugador</th>
                <th title="Puntos totales">Pts</th>
                {game === null && <th title="Puntos en Rocket League">RL</th>}
                {game === null && <th title="Puntos en Trackmania">TM</th>}
                <th title="Campeonatos">🏆</th>
                <th title="Torneos jugados">Torn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = players.get(r.playerId);
                return (
                  <tr key={r.playerId}>
                    <td>{r.position}</td>
                    <td className="left">
                      <Link to={`/jugador/${r.playerId}`} className="name-cell">
                        <span className="dot" style={{ background: p?.color }} /> {p?.name ?? '?'}
                      </Link>
                    </td>
                    <td className="strong">{r.points}</td>
                    {game === null && <td>{r.rlPoints}</td>}
                    {game === null && <td>{r.tmPoints}</td>}
                    <td>{r.titles}</td>
                    <td>{r.tournaments}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
