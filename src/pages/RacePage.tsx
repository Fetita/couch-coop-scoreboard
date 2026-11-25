import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StartOrder } from '../components/StartOrder';
import { carSlot, racePoints, raceState } from '../games/tmRace';
import { deleteRace, eliminate, swapRaceOrder, undoElimination } from '../games/tmTournament';
import { GAMES } from '../model/games';
import { update, useData } from '../store/store';
import { Avatar, PlayerName } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

export function RacePage() {
  const { id, raceId } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const tournament = data.tournaments.find((t) => t.id === id);
  const race = tournament?.tmRaces.find((r) => r.id === raceId);
  const players = new Map(data.players.map((p) => [p.id, p]));
  const [reordering, setReordering] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!tournament || !race) {
    return (
      <div className="page">
        <Link to={tournament ? `/torneo/${tournament.id}` : '/'} className="back"><Icon name="back" size={18} />Volver</Link>
        <p className="muted">Esta carrera no existe.</p>
      </div>
    );
  }

  const tid = tournament.id;
  const track = data.tmTracks.find((t) => t.id === race.trackId);
  const state = raceState(race);
  const scale = tournament.format.game === 'trackmania' ? tournament.format.pointsScale : [];
  const points = racePoints(race, scale);
  const name = (pid: string | null | undefined) => (pid ? players.get(pid)?.name ?? '?' : '?');
  const slotOf = (pid: string) => carSlot(race.order.indexOf(pid));
  const canReorder = race.eliminated.length === 0;
  const raceNumber = tournament.tmRaces.indexOf(race) + 1;

  const run = (fn: Parameters<typeof update>[0]) => {
    try {
      update(fn);
      setError(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  // Para cambiar el orden: tocar uno y después otro intercambia sus lugares (y sus colores).
  const tapOrder = (pid: string) => {
    if (!picked) return setPicked(pid);
    if (picked !== pid) run((d) => swapRaceOrder(d, tid, race.id, picked, pid));
    setPicked(null);
  };

  // Lista de resultados: el ganador (si hay) y los eliminados del mejor al peor puesto.
  const results = [...(state.winner ? [state.winner] : []), ...[...state.eliminated].reverse()];

  return (
    <div className={`page ${GAMES.trackmania.theme}`}>
      <PageHeader
        title={track?.name ?? 'Pista'}
        back={{ to: `/torneo/${tid}`, label: tournament.name }}
        subtitle={
          <>
            <span className="pill"><Icon name="car" size={14} />{race.carMode}</span>
            <span className="pill">Carrera {raceNumber}</span>
          </>
        }
      />

      {state.finished ? (
        <section className="winner-banner">
          <Avatar player={players.get(state.winner!)} size={64} color={slotOf(state.winner!).hex} />
          <Icon name="trophy" size={28} className="trophy" />
          <h2>Ganó {name(state.winner)}</h2>
          <p className="muted small">En la próxima carrera larga primero, con el auto azul.</p>
        </section>
      ) : reordering && canReorder ? (
        <section className="card highlight">
          <div className="card-head">
            <h2>Orden de salida</h2>
            <button type="button" className="link" onClick={() => { setReordering(false); setPicked(null); }}>Listo</button>
          </div>
          <p className="muted small">
            {picked ? `Tocá con quién cambia de lugar ${name(picked)}.` : 'Tocá dos jugadores para cambiarlos de lugar. El color va con el lugar.'}
          </p>
          <StartOrder order={race.order} players={players} selected={picked} onTap={tapOrder} />
        </section>
      ) : (
        <section className="card highlight">
          <div className="card-head">
            <h2>¿Quién quedó afuera?</h2>
            <span className="hint">{state.remaining.length} en carrera</span>
          </div>
          <p className="muted small">Tocá a cada uno cuando queda eliminado. Cuando queda uno solo, ganó.</p>
          <div className="elim-grid">
            {state.remaining.map((pid) => {
              const slot = slotOf(pid);
              return (
                <button key={pid} type="button" className="elim-btn" onClick={() => run((d) => eliminate(d, tid, race.id, pid))}>
                  <span className="car-swatch" style={{ background: slot.hex }} />
                  <PlayerName player={players.get(pid)} size={32} color={slot.hex} bold />
                  <span className="x"><Icon name="x" size={16} />Afuera</span>
                </button>
              );
            })}
          </div>
          {canReorder && (
            <button type="button" className="btn btn-sm" onClick={() => setReordering(true)}>
              <Icon name="shuffle" size={16} />Cambiar orden de salida
            </button>
          )}
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>{state.finished ? 'Resultado' : 'Eliminados'}</h2>
            {race.eliminated.length > 0 && (
              <button type="button" className="link"
                onClick={() => run((d) => undoElimination(d, tid, race.id, race.eliminated[race.eliminated.length - 1]))}>
                Deshacer último
              </button>
            )}
          </div>
          <ol className="board">
            {results.map((pid) => {
              const pos = state.positions.get(pid)!;
              return (
                <li key={pid} className={`board-row${pos === 1 ? ' p1' : ''}`}>
                  <span className="pos">{pos}</span>
                  <span className="car-swatch" style={{ background: slotOf(pid).hex }} />
                  <span className="grow"><PlayerName player={players.get(pid)} size={28} color={slotOf(pid).hex} bold={pos === 1} /></span>
                  {state.finished && <span className="board-pts">{points.get(pid) ?? 0} pts</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!(reordering && canReorder) && (
        <section className="card">
          <div className="card-head">
            <h2>Orden de salida</h2>
            <span className="hint">{raceNumber === 1 ? 'Cómo están sentados' : 'Según la carrera anterior'}</span>
          </div>
          <StartOrder order={race.order} players={players} out={state.finished ? [] : state.eliminated} />
        </section>
      )}

      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => {
          if (window.confirm('¿Borrar esta carrera?')) {
            update((d) => deleteRace(d, tid, race.id));
            navigate(`/torneo/${tid}`, { replace: true });
          }
        }}
      >
        <Icon name="trash" size={18} />Borrar carrera
      </button>
    </div>
  );
}
