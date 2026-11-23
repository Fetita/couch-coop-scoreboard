import { useState } from 'react';
import { generalStandings } from '../games/stats';
import { GAMES } from '../model/games';
import type { GameId } from '../model/types';
import { useData } from '../store/store';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { Podium } from '../ui/Podium';
import { RankTable } from '../ui/RankTable';

export function GeneralPage() {
  const data = useData();
  const [game, setGame] = useState<GameId | null>(null);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const rows = generalStandings(data, game ?? undefined);
  const any = rows.some((r) => r.points > 0 || r.titles > 0);

  return (
    <div className="page">
      <PageHeader title="Tabla general" subtitle="Todo lo jugado, sumado: partidos ganados en Rocket League y puntos por puesto en Trackmania." />
      <div className="filter-row">
        <button type="button" className={`chip text-only ${game === null ? 'chip-on' : ''}`} onClick={() => setGame(null)}>Todos los juegos</button>
        {Object.values(GAMES).map((g) => (
          <button key={g.id} type="button" className={`chip text-only ${game === g.id ? 'chip-on' : ''}`} onClick={() => setGame(g.id)}>{g.name}</button>
        ))}
      </div>
      {!any ? (
        <div className="hero-empty">
          <div className="hero-icon"><Icon name="chart" size={30} /></div>
          <strong>Todavía no hay puntos</strong>
          <span>La tabla se arma sola a medida que se juegan partidos y carreras.</span>
        </div>
      ) : (
        <>
          <section className="card">
            <Podium players={players} spots={rows.slice(0, 3).map((r) => ({ playerId: r.playerId, value: `${r.points} pts` }))} />
          </section>
          <section className="card">
            <RankTable
              rows={rows}
              players={players}
              link
              columns={[
                { label: 'Pts', title: 'Puntos totales', value: (r) => r.points, strong: true },
                ...(game === null
                  ? [
                      { label: 'RL', title: 'Puntos en Rocket League', value: (r: (typeof rows)[number]) => r.rlPoints },
                      { label: 'TM', title: 'Puntos en Trackmania', value: (r: (typeof rows)[number]) => r.tmPoints },
                    ]
                  : []),
                { label: '🏆', title: 'Campeonatos', value: (r) => r.titles },
                { label: 'Torn', title: 'Torneos jugados', value: (r) => r.tournaments },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
