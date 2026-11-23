import { Link } from 'react-router-dom';
import { addMatch, nextMatch, rebuildPending } from '../games/rlMatches';
import { award, isPlayed, rocketLeagueStandings, teamGoals, type Award } from '../games/rlStandings';
import type { Player, RocketLeagueFormat, RocketLeagueMatch, Tournament } from '../model/types';
import { mapTournament } from '../store/actions';
import { update } from '../store/store';
import { PlayerChip } from './PlayerChip';

export function TeamLine({ ids, players }: { ids: string[]; players: Map<string, Player> }) {
  return (
    <span className="team-line">
      {ids.map((id) => {
        const p = players.get(id);
        return (
          <span key={id} className="team-member">
            <span className="dot" style={{ background: p?.color ?? '#666' }} />
            {p?.name ?? '?'}
          </span>
        );
      })}
    </span>
  );
}

function matchNumber(t: Tournament, m: RocketLeagueMatch) {
  return t.rlMatches.indexOf(m) + 1;
}

export function RocketLeagueSection({ tournament, players }: { tournament: Tournament; players: Map<string, Player> }) {
  const format = tournament.format as RocketLeagueFormat;
  const rows = rocketLeagueStandings(tournament.playerIds, tournament.rlMatches, format.tiebreakers);
  const next = nextMatch(tournament);
  const played = tournament.rlMatches.filter(isPlayed).length;
  const scorer = award(rows, 'goals');
  const keeper = award(rows, 'saves');
  const finished = tournament.status === 'finished';
  const rounds = Math.max(0, ...tournament.rlMatches.map((m) => m.round));

  return (
    <>
      {next && !finished && (
        <section className="card stack next-match">
          <div className="section-head">
            <h2>Próximo partido</h2>
            <span className="muted">
              {matchNumber(tournament, next)} de {tournament.rlMatches.length}
              {rounds > 1 ? ` · ronda ${next.round}` : ''}
            </span>
          </div>
          <div className="versus">
            <TeamLine ids={next.team1} players={players} />
            <span className="vs">vs</span>
            <TeamLine ids={next.team2} players={players} />
          </div>
          {next.resting.length > 0 && (
            <p className="muted">
              Descansa{next.resting.length > 1 ? 'n' : ''}: {next.resting.map((id) => players.get(id)?.name).join(', ')}
            </p>
          )}
          <Link to={`/torneo/${tournament.id}/partido/${next.id}`} className="btn btn-primary btn-block">
            Anotar resultado
          </Link>
        </section>
      )}
      {!next && tournament.rlMatches.length > 0 && !finished && (
        <section className="card stack">
          <h2>Se jugaron todos los partidos 🎉</h2>
          <p className="muted">Podés terminar el torneo, o sumar otro partido o una ronda más en el formato.</p>
        </section>
      )}

      <section className="card stack">
        <div className="section-head">
          <h2>Tabla</h2>
          <span className="muted">{played} de {tournament.rlMatches.length} jugados</span>
        </div>
        <table className="standings">
          <thead>
            <tr>
              <th>#</th>
              <th className="left">Jugador</th>
              <th title="Puntos (partidos ganados)">Pts</th>
              <th title="Partidos jugados">PJ</th>
              <th title="Porcentaje de victorias">%</th>
              <th title="Diferencia de gol">DG</th>
              <th title="Goles">G</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = players.get(r.playerId);
              return (
                <tr key={r.playerId}>
                  <td>{r.position}</td>
                  <td className="left">
                    <span className="name-cell">
                      <span className="dot" style={{ background: p?.color }} /> {p?.name ?? '?'}
                    </span>
                  </td>
                  <td className="strong">{r.points}</td>
                  <td>{r.played}</td>
                  <td>{r.played ? Math.round(r.winRate * 100) : '–'}</td>
                  <td>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                  <td>{r.goals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {(scorer || keeper) && (
        <section className="card stack">
          <h2>Premios</h2>
          <div className="awards">
            <AwardBox title="⚽ Goleador" award={scorer} unit="goles" players={players} />
            <AwardBox title="🧤 Mejor arquero" award={keeper} unit="saves" players={players} />
          </div>
        </section>
      )}

      <section className="card stack">
        <h2>Partidos</h2>
        <ol className="match-list">
          {tournament.rlMatches.map((m, i) => {
            const showRound = rounds > 1 && (i === 0 || tournament.rlMatches[i - 1].round !== m.round);
            return (
              <li key={m.id}>
                {showRound && <div className="round-label">Ronda {m.round}</div>}
                <Link to={`/torneo/${tournament.id}/partido/${m.id}`} className={`match-row${m === next ? ' is-next' : ''}`}>
                  <span className="match-num">{i + 1}</span>
                  <span className={`match-team${m.winner === 1 ? ' won' : ''}`}><TeamLine ids={m.team1} players={players} /></span>
                  <span className="match-score">{isPlayed(m) ? `${teamGoals(m, 1)}-${teamGoals(m, 2)}` : 'vs'}</span>
                  <span className={`match-team right${m.winner === 2 ? ' won' : ''}`}><TeamLine ids={m.team2} players={players} /></span>
                </Link>
              </li>
            );
          })}
        </ol>
        {tournament.rlMatches.length === 0 && <p className="muted">No hay partidos. Revisá el formato o agregá uno.</p>}
        <div className="row">
          <button type="button" className="btn grow" onClick={() => update((d) => mapTournament(d, tournament.id, addMatch))}>
            + Agregar partido
          </button>
          {tournament.rlMatches.some((m) => !isPlayed(m)) && (
            <button
              type="button"
              className="btn grow"
              onClick={() => {
                if (window.confirm('Se vuelven a armar los partidos sin jugar. Los jugados no cambian. ¿Seguir?')) {
                  update((d) => mapTournament(d, tournament.id, (t) => rebuildPending(t)));
                }
              }}
            >
              Rearmar pendientes
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function AwardBox({ title, award, unit, players }: {
  title: string;
  award: Award | null;
  unit: string;
  players: Map<string, Player>;
}) {
  return (
    <div className="award">
      <div className="muted">{title}</div>
      {award ? (
        <>
          <div className="chips">
            {award.playerIds.map((id) => {
              const p = players.get(id);
              return p ? <PlayerChip key={id} player={p} /> : null;
            })}
          </div>
          <div className="muted">{award.value} {unit}</div>
        </>
      ) : (
        <div className="muted">Todavía nadie</div>
      )}
    </div>
  );
}
