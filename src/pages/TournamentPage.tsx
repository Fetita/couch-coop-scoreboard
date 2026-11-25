import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormatEditor } from '../components/FormatEditor';
import { PlayerPicker } from '../components/PlayerPicker';
import { RlPlay, RlTable } from '../components/RocketLeagueSection';
import { TmPlay, TmTable } from '../components/TrackmaniaSection';
import { describeFormat } from '../model/format';
import { GAMES } from '../model/games';
import { tournamentProgress } from '../model/progress';
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
import { PlayerName } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Tabs } from '../ui/Tabs';

type Tab = 'play' | 'table' | 'setup';

export function TournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const [params, setParams] = useSearchParams();
  const tournament = data.tournaments.find((t) => t.id === id);
  const [editing, setEditing] = useState<'none' | 'players' | 'format' | 'name'>('none');
  const [draftPlayers, setDraftPlayers] = useState<string[]>([]);
  const [draftFormat, setDraftFormat] = useState<TournamentFormat | null>(null);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!tournament) {
    return (
      <div className="page">
        <Link to="/" className="back"><Icon name="back" size={18} />Torneos</Link>
        <p className="muted">Este torneo no existe.</p>
      </div>
    );
  }

  const game = GAMES[tournament.game];
  const finished = tournament.status === 'finished';
  const tab = (params.get('tab') as Tab | null) ?? (finished ? 'table' : 'play');
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true });
  const players = tournament.playerIds.map((pid) => data.players.find((p) => p.id === pid)).filter((p) => p !== undefined);
  const playerMap = new Map(data.players.map((p) => [p.id, p]));
  const progress = tournamentProgress(tournament);
  const isRL = tournament.game === 'rocket-league';

  const save = (fn: Parameters<typeof update>[0]) => {
    try {
      update(fn);
      setEditing('none');
      setError(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div className={`page ${game.theme}`}>
      <section className="t-hero">
        <Link to="/" className="back"><Icon name="back" size={18} />Torneos</Link>
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
          <h1 onClick={() => { setDraftName(tournament.name); setEditing('name'); }}>{tournament.name}</h1>
        )}
        <div className="t-hero-meta">
          <span className="pill">{game.name}</span>
          <span className="pill">{finished ? 'Terminado' : 'En curso'}</span>
          <span className="pill">{players.length} jugadores</span>
          <span className="pill">{progress.label}</span>
        </div>
        <div className="progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
      </section>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[['play', isRL ? 'Partidos' : 'Carreras'], ['table', 'Tabla'], ['setup', 'Ajustes']]}
      />

      {error && <p className="error">{error}</p>}

      {tab === 'play' && (isRL
        ? <RlPlay tournament={tournament} players={playerMap} />
        : <TmPlay tournament={tournament} players={playerMap} />)}

      {tab === 'table' && (isRL
        ? <RlTable tournament={tournament} players={playerMap} />
        : <TmTable tournament={tournament} players={playerMap} />)}

      {tab === 'setup' && (
        <>
          <section className="card">
            <div className="card-head">
              <h2>Jugadores <span className="count">{players.length}</span></h2>
              {editing !== 'players' && (
                <button type="button" className="link" onClick={() => { setDraftPlayers(tournament.playerIds); setEditing('players'); }}>
                  <Icon name="edit" size={16} />Editar
                </button>
              )}
            </div>
            {editing === 'players' ? (
              <>
                <PlayerPicker selected={draftPlayers} onChange={setDraftPlayers} />
                {isRL && <p className="hint">Los partidos sin jugar se rearman con los nuevos jugadores. Los jugados no cambian.</p>}
                <div className="row">
                  <button type="button" className="btn grow" onClick={() => setEditing('none')}>Cancelar</button>
                  <button type="button" className="btn btn-primary grow" disabled={draftPlayers.length < 2}
                    onClick={() => save((d) => setTournamentPlayers(d, tournament.id, draftPlayers))}>
                    Guardar
                  </button>
                </div>
              </>
            ) : (
              <>
                <ol className="stack-sm">
                  {players.map((p, i) => (
                    <li key={p.id} className="row">
                      <span className="pos">{i + 1}</span>
                      <PlayerName player={p} />
                    </li>
                  ))}
                </ol>
                {isRL && (
                  <button type="button" className="link" onClick={() => save((d) => reshufflePlayers(d, tournament.id))}>
                    <Icon name="shuffle" size={16} />Volver a sortear el orden
                  </button>
                )}
              </>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Formato</h2>
              {editing !== 'format' && (
                <button type="button" className="link" onClick={() => { setDraftFormat(tournament.format); setEditing('format'); }}>
                  <Icon name="edit" size={16} />Editar
                </button>
              )}
            </div>
            {editing === 'format' && draftFormat ? (
              <>
                <FormatEditor format={draftFormat} players={players.length} onChange={setDraftFormat} />
                <div className="row">
                  <button type="button" className="btn grow" onClick={() => setEditing('none')}>Cancelar</button>
                  <button type="button" className="btn btn-primary grow" onClick={() => save((d) => setTournamentFormat(d, tournament.id, draftFormat))}>
                    Guardar
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">{describeFormat(tournament.format)}</p>
            )}
          </section>

          <section className="stack-sm">
            {finished ? (
              <button type="button" className="btn btn-block" onClick={() => save((d) => reopenTournament(d, tournament.id))}>
                Reabrir torneo
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-block"
                onClick={() => { if (save((d) => finishTournament(d, tournament.id))) setTab('table'); }}>
                <Icon name="trophy" size={18} />Terminar torneo
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
              <Icon name="trash" size={18} />Borrar torneo
            </button>
          </section>
        </>
      )}
    </div>
  );
}
