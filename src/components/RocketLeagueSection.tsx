import { Link } from 'react-router-dom';
import { addMatch, nextMatch, rebuildPending } from '../games/rlMatches';
import { award, isPlayed, rocketLeagueStandings, teamGoals, type Award } from '../games/rlStandings';
import type { Player, RocketLeagueFormat, Tournament } from '../model/types';
import { mapTournament } from '../store/actions';
import { update } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';
import { Podium } from '../ui/Podium';
import { RankTable } from '../ui/RankTable';

/** Columna de un equipo con avatares. */
export function TeamColumn({ ids, players, side, label }: { ids: string[]; players: Map<string, Player>; side: 1 | 2; label?: string }) {
  return (
    <div className={`team-col t${side}`}>
      <span className="team-label">{label ?? (side === 1 ? 'Azul' : 'Naranja')}</span>
      {ids.map((id) => <PlayerName key={id} player={players.get(id)} size={30} bold />)}
    </div>
  );
}

export function RlPlay({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const next = nextMatch(tournament);
  const finished = tournament.status === 'finished';
  const rounds = Math.max(0, ...tournament.rlMatches.map((m) => m.round));
  const index = next ? tournament.rlMatches.indexOf(next) + 1 : 0;

  return (
    <>
      {next && !finished && (
        <section className="card highlight">
          <div className="card-head">
            <h2>Próximo partido</h2>
            <span className="pill">{index} de {tournament.rlMatches.length}{rounds > 1 ? ` · ronda ${next.round}` : ''}</span>
          </div>
          <div className="versus">
            <TeamColumn ids={next.team1} players={players} side={1} />
            <span className="vs-badge">VS</span>
            <TeamColumn ids={next.team2} players={players} side={2} />
          </div>
          {next.resting.length > 0 && (
            <div className="resting">
              <span className="avatar-stack">{next.resting.map((id) => <Avatar key={id} player={players.get(id)} size={22} />)}</span>
              Descansa{next.resting.length > 1 ? 'n' : ''} {next.resting.map((id) => players.get(id)?.name).join(', ')}
            </div>
          )}
          <Link to={`/torneo/${tournament.id}/partido/${next.id}`} className="btn btn-primary btn-block">
            <Icon name="play" size={18} />Anotar resultado
          </Link>
        </section>
      )}
      {!next && tournament.rlMatches.length > 0 && !finished && (
        <section className="winner-banner">
          <Icon name="trophy" size={36} className="trophy" />
          <h2>Se jugaron todos los partidos</h2>
          <p className="muted small">Mirá la tabla, terminá el torneo en Ajustes o sumá otro partido.</p>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Partidos</h2>
          <span className="hint">{tournament.rlMatches.filter(isPlayed).length} de {tournament.rlMatches.length} jugados</span>
        </div>
        <ol className="list" style={{ gap: 6 }}>
          {tournament.rlMatches.map((m, i) => {
            const showRound = rounds > 1 && (i === 0 || tournament.rlMatches[i - 1].round !== m.round);
            const played = isPlayed(m);
            return (
              <li key={m.id}>
                {showRound && <div className="round-label">Ronda {m.round}</div>}
                <Link to={`/torneo/${tournament.id}/partido/${m.id}`} className={`match-row${m === next ? ' is-next' : ''}`}>
                  <span className="match-num">{i + 1}</span>
                  <span className={`match-side${m.winner === 1 ? ' won' : ''}`}>
                    {m.team1.map((id) => <PlayerName key={id} player={players.get(id)} size={20} />)}
                  </span>
                  <span className={`match-score${played ? '' : ' pending'}`}>
                    {played ? <>{teamGoals(m, 1)}<span className="dash">-</span>{teamGoals(m, 2)}</> : m === next ? 'SIGUE' : 'VS'}
                  </span>
                  <span className={`match-side right${m.winner === 2 ? ' won' : ''}`}>
                    {m.team2.map((id) => <PlayerName key={id} player={players.get(id)} size={20} />)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {tournament.rlMatches.length === 0 && <p className="muted">No hay partidos. Revisá el formato o agregá uno.</p>}
        <div className="row">
          <button type="button" className="btn btn-sm grow" onClick={() => update((d) => mapTournament(d, tournament.id, addMatch))}>
            <Icon name="plus" size={16} />Agregar partido
          </button>
          {tournament.rlMatches.some((m) => !isPlayed(m)) && (
            <button
              type="button"
              className="btn btn-sm grow"
              onClick={() => {
                if (window.confirm('Se vuelven a armar los partidos sin jugar. Los jugados no cambian. ¿Seguir?')) {
                  update((d) => mapTournament(d, tournament.id, (t) => rebuildPending(t)));
                }
              }}
            >
              <Icon name="shuffle" size={16} />Rearmar pendientes
            </button>
          )}
        </div>
      </section>
    </>
  );
}

export function RlTable({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const format = tournament.format as RocketLeagueFormat;
  const rows = rocketLeagueStandings(tournament.playerIds, tournament.rlMatches, format.tiebreakers);
  const anyPlayed = tournament.rlMatches.some(isPlayed);
  const scorer = award(rows, 'goals');
  const keeper = award(rows, 'saves');

  return (
    <>
      {anyPlayed && (
        <section className="card">
          <Podium
            players={players}
            spots={rows.slice(0, 3).map((r) => ({ playerId: r.playerId, value: `${r.points} pts` }))}
          />
        </section>
      )}
      <section className="card">
        <div className="card-head">
          <h2>Tabla</h2>
          <span className="hint">1 punto por partido ganado</span>
        </div>
        <RankTable
          rows={rows}
          players={players}
          link
          columns={[
            { label: 'Pts', title: 'Puntos (partidos ganados)', value: (r) => r.points, strong: true },
            { label: 'PJ', title: 'Partidos jugados', value: (r) => r.played },
            { label: '%', title: 'Porcentaje de victorias', value: (r) => (r.played ? Math.round(r.winRate * 100) : '–') },
            { label: 'DG', title: 'Diferencia de gol', value: (r) => (r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff) },
            { label: 'G', title: 'Goles', value: (r) => r.goals },
          ]}
        />
      </section>
      <section className="card">
        <h2>Premios</h2>
        <div className="awards">
          <AwardBox title="Goleador" icon="ball" award={scorer} unit="goles" players={players} />
          <AwardBox title="Mejor arquero" icon="glove" award={keeper} unit="saves" players={players} />
        </div>
      </section>
    </>
  );
}

function AwardBox({ title, icon, award, unit, players }: {
  title: string;
  icon: IconName;
  award: Award | null;
  unit: string;
  players: Map<string, Player>;
}) {
  return (
    <div className="award">
      <span className="award-title"><Icon name={icon} size={16} />{title}</span>
      {award ? (
        <>
          {award.playerIds.map((id) => <PlayerName key={id} player={players.get(id)} size={30} bold />)}
          <span className="award-value">{award.value} {unit}</span>
        </>
      ) : (
        <span className="award-value">Todavía nadie. Se cargan al anotar cada partido.</span>
      )}
    </div>
  );
}
