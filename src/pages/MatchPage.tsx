import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeamLine } from '../components/RocketLeagueSection';
import { Stepper } from '../components/Stepper';
import { clearResult, recordResult, removeMatch, setTeams } from '../games/rlMatches';
import { goalsWinner, isPlayed, resultError, teamGoals } from '../games/rlStandings';
import type { Player, RocketLeagueMatch, RocketLeagueStat } from '../model/types';
import { mapTournament } from '../store/actions';
import { update, useData } from '../store/store';

type Side = 1 | 2 | 0; // 0 = descansa

export function MatchPage() {
  const { id, matchId } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const tournament = data.tournaments.find((t) => t.id === id);
  const match = tournament?.rlMatches.find((m) => m.id === matchId);
  const players = new Map(data.players.map((p) => [p.id, p]));

  if (!tournament || !match) {
    return (
      <div className="page">
        <Link to={tournament ? `/torneo/${tournament.id}` : '/'} className="back">‹ Volver</Link>
        <p className="muted">Este partido no existe.</p>
      </div>
    );
  }

  return <MatchEditor key={match.id} tournamentId={tournament.id} match={match} index={tournament.rlMatches.indexOf(match)}
    playerIds={tournament.playerIds} players={players} onDone={() => navigate(`/torneo/${tournament.id}`)} />;
}

function MatchEditor({ tournamentId, match, index, playerIds, players, onDone }: {
  tournamentId: string;
  match: RocketLeagueMatch;
  index: number;
  playerIds: string[];
  players: Map<string, Player>;
  onDone: () => void;
}) {
  const [stats, setStats] = useState<Record<string, RocketLeagueStat>>(match.stats);
  const [winner, setWinner] = useState<1 | 2 | undefined>(match.winner);
  const [editingTeams, setEditingTeams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft: RocketLeagueMatch = { ...match, stats, winner };
  const g1 = teamGoals(draft, 1);
  const g2 = teamGoals(draft, 2);
  const byGoals = goalsWinner(draft);
  const problem = resultError(draft);

  const setStat = (pid: string, field: keyof RocketLeagueStat, value: number) => {
    const current: RocketLeagueStat | undefined = stats[pid];
    const next = { ...stats, [pid]: { ...(current ?? { goals: 0, saves: 0 }), [field]: value } };
    setStats(next);
    if (field === 'goals') {
      // Si hay goles cargados, el ganador lo definen los goles.
      const w = goalsWinner({ ...match, stats: next });
      if (w === 1 || w === 2) setWinner(w);
      else if (w === 'tie') setWinner(undefined);
    }
  };

  const run = (fn: Parameters<typeof mapTournament>[2]) => {
    try {
      update((d) => mapTournament(d, tournamentId, fn));
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const team = (side: 1 | 2) => (
    <div className={`card stack team-card${winner === side ? ' winner' : ''}`}>
      <div className="section-head">
        <h2>Equipo {side}</h2>
        <span className="team-score">{side === 1 ? g1 : g2}</span>
      </div>
      {(side === 1 ? match.team1 : match.team2).map((pid) => {
        const p = players.get(pid);
        return (
          <div key={pid} className="stat-row">
            <span className="stat-name">
              <span className="dot" style={{ background: p?.color }} /> {p?.name ?? '?'}
            </span>
            <span className="stat-cell">
              <span className="hint">Goles</span>
              <Stepper label={`goles de ${p?.name}`} value={stats[pid]?.goals ?? 0} onChange={(v) => setStat(pid, 'goals', v)} />
            </span>
            <span className="stat-cell">
              <span className="hint">Saves</span>
              <Stepper label={`saves de ${p?.name}`} value={stats[pid]?.saves ?? 0} onChange={(v) => setStat(pid, 'saves', v)} />
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="page">
      <header className="page-header">
        <Link to={`/torneo/${tournamentId}`} className="back">‹ Torneo</Link>
        <h1>Partido {index + 1}</h1>
        <p className="muted">
          Ronda {match.round}
          {match.resting.length > 0 && ` · descansa${match.resting.length > 1 ? 'n' : ''} ${match.resting.map((r) => players.get(r)?.name).join(', ')}`}
        </p>
      </header>

      {editingTeams ? (
        <TeamsEditor
          match={match}
          playerIds={playerIds}
          players={players}
          onCancel={() => setEditingTeams(false)}
          onSave={(t1, t2) => {
            if (run((t) => setTeams(t, match.id, t1, t2))) {
              setStats((s) => Object.fromEntries(Object.entries(s).filter(([p]) => t1.includes(p) || t2.includes(p))));
              setEditingTeams(false);
              setError(null);
            }
          }}
        />
      ) : (
        <>
          {team(1)}
          {team(2)}
          <section className="stack">
            <h2>¿Quién ganó?</h2>
            <div className="winner-buttons">
              {([1, 2] as const).map((side) => (
                <button key={side} type="button" className={`btn winner-btn${winner === side ? ' on' : ''}`} disabled={byGoals !== null} onClick={() => setWinner(side)}>
                  <span>Equipo {side}</span>
                  <TeamLine ids={side === 1 ? match.team1 : match.team2} players={players} />
                </button>
              ))}
            </div>
            <p className="hint">
              {byGoals !== null
                ? 'Con goles cargados, gana el equipo que hizo más. Si terminó igualado, sumá el gol de oro del overtime.'
                : 'No hay empates: gana el del gol de oro en overtime. Goles y saves son opcionales.'}
            </p>
            {problem && (winner || byGoals === 'tie') && <p className="error">{problem}</p>}
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={problem !== null}
              onClick={() => { if (run((t) => recordResult(t, match.id, winner!, stats))) onDone(); }}
            >
              Guardar resultado
            </button>
          </section>
          <section className="stack">
            <button type="button" className="btn btn-block" onClick={() => setEditingTeams(true)}>Cambiar equipos</button>
            {isPlayed(match) && (
              <button
                type="button"
                className="btn btn-block"
                onClick={() => {
                  if (window.confirm('¿Borrar el resultado? El partido vuelve a quedar sin jugar.')) {
                    run((t) => clearResult(t, match.id));
                    setWinner(undefined);
                    setStats({});
                  }
                }}
              >
                Borrar resultado
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => {
                if (window.confirm('¿Quitar este partido del torneo?')) {
                  if (run((t) => removeMatch(t, match.id))) onDone();
                }
              }}
            >
              Quitar partido
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function TeamsEditor({ match, playerIds, players, onCancel, onSave }: {
  match: RocketLeagueMatch;
  playerIds: string[];
  players: Map<string, Player>;
  onCancel: () => void;
  onSave: (team1: string[], team2: string[]) => void;
}) {
  // Los que jugaron y ya no están en el torneo también se muestran.
  const all = [...new Set([...playerIds, ...match.team1, ...match.team2])];
  const [sides, setSides] = useState<Record<string, Side>>(() =>
    Object.fromEntries(all.map((p) => [p, match.team1.includes(p) ? 1 : match.team2.includes(p) ? 2 : 0])),
  );
  const team1 = all.filter((p) => sides[p] === 1);
  const team2 = all.filter((p) => sides[p] === 2);

  return (
    <section className="card stack">
      <h2>Cambiar equipos</h2>
      {all.map((pid) => (
        <div key={pid} className="side-row">
          <span className="stat-name">
            <span className="dot" style={{ background: players.get(pid)?.color }} /> {players.get(pid)?.name ?? '?'}
          </span>
          <div className="segmented">
            {([[1, 'Eq. 1'], [2, 'Eq. 2'], [0, 'Descansa']] as const).map(([side, label]) => (
              <button key={side} type="button" className={sides[pid] === side ? 'on' : ''} onClick={() => setSides({ ...sides, [pid]: side })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {team1.length !== team2.length && team1.length > 0 && team2.length > 0 && (
        <p className="warning">Los equipos quedan desparejos ({team1.length} contra {team2.length}).</p>
      )}
      <div className="row">
        <button type="button" className="btn grow" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary grow" disabled={!team1.length || !team2.length} onClick={() => onSave(team1, team2)}>
          Guardar equipos
        </button>
      </div>
    </section>
  );
}
