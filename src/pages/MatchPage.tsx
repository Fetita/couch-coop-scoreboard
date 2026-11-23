import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Stepper } from '../components/Stepper';
import { clearResult, recordResult, removeMatch, setTeams } from '../games/rlMatches';
import { goalsWinner, isPlayed, resultError, teamGoals } from '../games/rlStandings';
import { GAMES } from '../model/games';
import type { Player, RocketLeagueMatch, RocketLeagueStat } from '../model/types';
import { mapTournament } from '../store/actions';
import { update, useData } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

type Side = 1 | 2 | 0; // 0 = descansa
const TEAM_NAMES = { 1: 'Azul', 2: 'Naranja' } as const;

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
        <Link to={tournament ? `/torneo/${tournament.id}` : '/'} className="back"><Icon name="back" size={18} />Volver</Link>
        <p className="muted">Este partido no existe.</p>
      </div>
    );
  }

  return (
    <MatchEditor key={match.id} tournamentId={tournament.id} match={match} index={tournament.rlMatches.indexOf(match)}
      playerIds={tournament.playerIds} players={players} onDone={() => navigate(`/torneo/${tournament.id}`)} />
  );
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
    <section className={`card team-card t${side}${winner === side ? ' winner' : ''}`}>
      <div className="card-head">
        <h2>Equipo {TEAM_NAMES[side]}</h2>
        {winner === side && <span className="pill done"><Icon name="trophy" size={14} />Ganó</span>}
      </div>
      {(side === 1 ? match.team1 : match.team2).map((pid) => {
        const p = players.get(pid);
        return (
          <div key={pid} className="stat-row">
            <PlayerName player={p} size={32} bold />
            <span className="stat-cell">
              <span className="hint"><Icon name="ball" size={12} />Goles</span>
              <Stepper compact label={`goles de ${p?.name}`} value={stats[pid]?.goals ?? 0} onChange={(v) => setStat(pid, 'goals', v)} />
            </span>
            <span className="stat-cell">
              <span className="hint"><Icon name="glove" size={12} />Saves</span>
              <Stepper compact label={`saves de ${p?.name}`} value={stats[pid]?.saves ?? 0} onChange={(v) => setStat(pid, 'saves', v)} />
            </span>
          </div>
        );
      })}
    </section>
  );

  return (
    <div className={`page ${GAMES['rocket-league'].theme}`}>
      <PageHeader
        title={`Partido ${index + 1}`}
        back={{ to: `/torneo/${tournamentId}`, label: 'Torneo' }}
        subtitle={
          <>
            <span>Ronda {match.round}</span>
            {match.resting.length > 0 && (
              <span className="row" style={{ gap: 6 }}>
                · descansa{match.resting.length > 1 ? 'n' : ''}
                {match.resting.map((r) => <Avatar key={r} player={players.get(r)} size={20} />)}
                {match.resting.map((r) => players.get(r)?.name).join(', ')}
              </span>
            )}
          </>
        }
      />

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
          <div className="scoreboard">
            <div className={`score-side t1${winner === 1 ? ' win' : ''}`}>
              <span className="team-label">{TEAM_NAMES[1]}</span>
              <span className="score-num">{g1}</span>
              <span className="avatar-stack">{match.team1.map((id) => <Avatar key={id} player={players.get(id)} size={26} />)}</span>
            </div>
            <span className="score-dash">–</span>
            <div className={`score-side t2${winner === 2 ? ' win' : ''}`}>
              <span className="team-label">{TEAM_NAMES[2]}</span>
              <span className="score-num">{g2}</span>
              <span className="avatar-stack">{match.team2.map((id) => <Avatar key={id} player={players.get(id)} size={26} />)}</span>
            </div>
          </div>

          {team(1)}
          {team(2)}

          <section className="card">
            <h2>¿Quién ganó?</h2>
            <div className="winner-buttons">
              {([1, 2] as const).map((side) => (
                <button key={side} type="button" className={`winner-btn t${side}${winner === side ? ' on' : ''}`} disabled={byGoals !== null} onClick={() => setWinner(side)}>
                  <span className="avatar-stack">
                    {(side === 1 ? match.team1 : match.team2).map((id) => <Avatar key={id} player={players.get(id)} size={30} />)}
                  </span>
                  Equipo {TEAM_NAMES[side]}
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
          </section>

          <section className="stack-sm">
            <button type="button" className="btn btn-block" onClick={() => setEditingTeams(true)}>
              <Icon name="users" size={18} />Cambiar equipos
            </button>
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
              <Icon name="trash" size={18} />Quitar partido
            </button>
          </section>

          <div style={{ height: 70 }} />
          <div className="actionbar">
            <div className="actionbar-inner">
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={problem !== null}
                onClick={() => { if (run((t) => recordResult(t, match.id, winner!, stats))) onDone(); }}
              >
                <Icon name="check" size={20} />
                {problem && byGoals === 'tie' ? 'Falta el gol de oro' : !winner ? 'Elegí el ganador' : 'Guardar resultado'}
              </button>
            </div>
          </div>
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
    <section className="card">
      <h2>Cambiar equipos</h2>
      {all.map((pid) => (
        <div key={pid} className="side-row">
          <PlayerName player={players.get(pid)} size={28} bold />
          <div className="segmented">
            {([[1, TEAM_NAMES[1]], [2, TEAM_NAMES[2]], [0, 'Descansa']] as const).map(([side, label]) => (
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
