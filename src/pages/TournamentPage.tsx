import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormatEditor } from '../components/FormatEditor';
import { PlayerChip } from '../components/PlayerChip';
import { PlayerPicker } from '../components/PlayerPicker';
import { RocketLeagueSection } from '../components/RocketLeagueSection';
import { TrackmaniaSection } from '../components/TrackmaniaSection';
import { describeFormat } from '../model/format';
import { GAMES } from '../model/games';
import type { TournamentFormat } from '../model/types';
import {
  deleteTournament,
  finishTournament,
  reopenTournament,
  reshufflePlayers,
  setTournamentFormat,
  setTournamentPlayers,
  updateTournament,
} from '../store/actions';
import { update, useData } from '../store/store';

export function TournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const tournament = data.tournaments.find((t) => t.id === id);
  const [editing, setEditing] = useState<'none' | 'players' | 'format' | 'name'>('none');
  const [draftPlayers, setDraftPlayers] = useState<string[]>([]);
  const [draftFormat, setDraftFormat] = useState<TournamentFormat | null>(null);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!tournament) {
    return (
      <div className="page">
        <Link to="/" className="back">‹ Torneos</Link>
        <p className="muted">Este torneo no existe.</p>
      </div>
    );
  }

  const game = GAMES[tournament.game];
  const players = tournament.playerIds
    .map((pid) => data.players.find((p) => p.id === pid))
    .filter((p) => p !== undefined);
  const finished = tournament.status === 'finished';
  const playerMap = new Map(data.players.map((p) => [p.id, p]));

  const save = (fn: Parameters<typeof update>[0]) => {
    try {
      update(fn);
      setEditing('none');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back">‹ Torneos</Link>
        {editing === 'name' ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              save((d) => updateTournament(d, tournament.id, { name: draftName.trim() || tournament.name }));
            }}
          >
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus aria-label="Nombre del torneo" />
            <button className="btn" type="submit">Listo</button>
          </form>
        ) : (
          <h1 onClick={() => { setDraftName(tournament.name); setEditing('name'); }}>
            {game.emoji} {tournament.name}
          </h1>
        )}
        <p className="muted">
          {finished ? 'Terminado' : 'En curso'} · {new Date(tournament.createdAt).toLocaleDateString('es-AR')}
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      {tournament.game === 'rocket-league' ? (
        <RocketLeagueSection tournament={tournament} players={playerMap} />
      ) : (
        <TrackmaniaSection tournament={tournament} players={playerMap} />
      )}

      <section className="card stack">
        <div className="section-head">
          <h2>Jugadores <span className="count">{players.length}</span></h2>
          {editing !== 'players' && (
            <button type="button" className="link" onClick={() => { setDraftPlayers(tournament.playerIds); setEditing('players'); }}>
              Editar
            </button>
          )}
        </div>
        {editing === 'players' ? (
          <>
            <PlayerPicker selected={draftPlayers} onChange={setDraftPlayers} />
            <div className="row">
              <button type="button" className="btn" onClick={() => setEditing('none')}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={draftPlayers.length < 2}
                onClick={() => save((d) => setTournamentPlayers(d, tournament.id, draftPlayers))}
              >
                Guardar
              </button>
            </div>
          </>
        ) : (
          <>
            <ol className="order">
              {players.map((p) => (
                <li key={p.id}><PlayerChip player={p} /></li>
              ))}
            </ol>
            <button type="button" className="link" onClick={() => save((d) => reshufflePlayers(d, tournament.id))}>
              Volver a sortear el orden
            </button>
          </>
        )}
      </section>

      <section className="card stack">
        <div className="section-head">
          <h2>Formato</h2>
          {editing !== 'format' && (
            <button type="button" className="link" onClick={() => { setDraftFormat(tournament.format); setEditing('format'); }}>
              Editar
            </button>
          )}
        </div>
        {editing === 'format' && draftFormat ? (
          <>
            <FormatEditor format={draftFormat} players={players.length} onChange={setDraftFormat} />
            <div className="row">
              <button type="button" className="btn" onClick={() => setEditing('none')}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={() => save((d) => setTournamentFormat(d, tournament.id, draftFormat))}>
                Guardar
              </button>
            </div>
          </>
        ) : (
          <p>{describeFormat(tournament.format)}</p>
        )}
      </section>


      <section className="stack">
        {finished ? (
          <button type="button" className="btn btn-block" onClick={() => save((d) => reopenTournament(d, tournament.id))}>
            Reabrir torneo
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={() => save((d) => finishTournament(d, tournament.id))}>
            Terminar torneo
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            if (window.confirm(`¿Borrar "${tournament.name}"? No se puede deshacer.`)) {
              update((d) => deleteTournament(d, tournament.id));
              navigate('/', { replace: true });
            }
          }}
        >
          Borrar torneo
        </button>
      </section>
    </div>
  );
}
