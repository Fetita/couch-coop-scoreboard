import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormatEditor } from '../components/FormatEditor';
import { PlayerPicker } from '../components/PlayerPicker';
import { proposeFormat } from '../model/format';
import { GAME_LIST, GAMES } from '../model/games';
import type { GameId, TournamentFormat } from '../model/types';
import { createTournament, defaultTournamentName } from '../store/actions';
import { update } from '../store/store';

type Step = 'game' | 'players' | 'format';

export function NewTournamentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('game');
  const [game, setGame] = useState<GameId | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [format, setFormat] = useState<TournamentFormat | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chooseGame = (g: GameId) => {
    setGame(g);
    setName(defaultTournamentName(g));
    setStep('players');
  };

  const toFormat = () => {
    // La propuesta se recalcula con la cantidad de jugadores elegida.
    setFormat(proposeFormat(game!, playerIds.length));
    setStep('format');
  };

  const create = () => {
    try {
      let id = '';
      update((d) => {
        const [next, t] = createTournament(d, { game: game!, name, playerIds, format: format! });
        id = t.id;
        return next;
      });
      navigate(`/torneo/${id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        {step === 'game' ? (
          <Link to="/" className="back">‹ Torneos</Link>
        ) : (
          <button type="button" className="back" onClick={() => setStep(step === 'format' ? 'players' : 'game')}>‹ Atrás</button>
        )}
        <h1>Nuevo torneo</h1>
        <ol className="steps" aria-label="Pasos">
          <li className={step === 'game' ? 'on' : ''}>Juego</li>
          <li className={step === 'players' ? 'on' : ''}>Jugadores</li>
          <li className={step === 'format' ? 'on' : ''}>Formato</li>
        </ol>
      </header>

      {step === 'game' && (
        <ul className="cards">
          {GAME_LIST.map((g) => (
            <li key={g.id}>
              <button type="button" className="card card-link" onClick={() => chooseGame(g.id)}>
                <span className="card-emoji">{g.emoji}</span>
                <span className="card-body">
                  <strong>{g.name}</strong>
                  <span className="muted">{g.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 'players' && game && (
        <section className="stack">
          <h2>¿Quiénes juegan? <span className="count">{playerIds.length}</span></h2>
          <PlayerPicker selected={playerIds} onChange={setPlayerIds} />
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={playerIds.length < GAMES[game].minPlayers}
            onClick={toFormat}
          >
            Siguiente
          </button>
          <p className="hint">El orden se sortea al crear el torneo.</p>
        </section>
      )}

      {step === 'format' && game && format && (
        <section className="stack">
          <label className="field">
            <span className="field-label">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="muted">
            Propuesta para {playerIds.length} jugadores en {GAMES[game].name}. Cambiá lo que quieras; también se puede ajustar durante el torneo.
          </p>
          <FormatEditor format={format} players={playerIds.length} onChange={setFormat} />
          {error && <p className="error">{error}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={create}>
            Crear torneo y sortear orden
          </button>
        </section>
      )}
    </div>
  );
}
