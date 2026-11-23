import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormatEditor } from '../components/FormatEditor';
import { PlayerPicker } from '../components/PlayerPicker';
import { describeFormat, proposeFormat } from '../model/format';
import { GAME_LIST, GAMES } from '../model/games';
import type { GameId, TournamentFormat } from '../model/types';
import { createTournament, defaultTournamentName } from '../store/actions';
import { update } from '../store/store';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

type Step = 'game' | 'players' | 'format';
const ORDER: Step[] = ['game', 'players', 'format'];

export function NewTournamentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('game');
  const [game, setGame] = useState<GameId | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [format, setFormat] = useState<TournamentFormat | null>(null);
  const [formatFor, setFormatFor] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chooseGame = (g: GameId) => {
    if (g !== game) setName(defaultTournamentName(g));
    setGame(g);
    setStep('players');
  };

  const toFormat = () => {
    // La propuesta se recalcula solo si cambió el juego o la cantidad de jugadores,
    // así volver a "Formato" no pierde lo que ya se ajustó.
    const key = `${game}:${playerIds.length}`;
    if (!format || key !== formatFor) {
      setFormat(proposeFormat(game!, playerIds.length));
      setFormatFor(key);
    }
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

  const canPlayers = game !== null;
  const canFormat = game !== null && playerIds.length >= 2;
  const stepIndex = ORDER.indexOf(step);
  const theme = game ? GAMES[game].theme : '';

  return (
    <div className={`page ${theme}`}>
      <PageHeader
        title="Nuevo torneo"
        back={step === 'game' ? { to: '/', label: 'Torneos' } : { onClick: () => setStep(ORDER[stepIndex - 1]), label: 'Atrás' }}
      />
      <ol className="steps" aria-label="Pasos">
        {([
          ['game', 'Juego', true],
          ['players', 'Jugadores', canPlayers],
          ['format', 'Formato', canFormat],
        ] as const).map(([id, label, enabled], i) => (
          <li key={id}>
            <button
              type="button"
              className={step === id ? 'on' : i < stepIndex ? 'done' : ''}
              disabled={!enabled}
              aria-current={step === id ? 'step' : undefined}
              onClick={() => (id === 'format' ? step !== 'format' && toFormat() : setStep(id))}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 'game' && (
        <ul className="list">
          {GAME_LIST.map((g) => (
            <li key={g.id}>
              <button type="button" className={`game-tile ${g.theme}`} onClick={() => chooseGame(g.id)}>
                <span className="game-badge lg">{g.short}</span>
                <span className="stack-sm grow">
                  <strong>{g.name}</strong>
                  <span className="desc">{g.description}</span>
                </span>
                <Icon name="chevron" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 'players' && game && (
        <>
          <section className="card">
            <div className="card-head">
              <h2>¿Quiénes juegan? <span className="count">{playerIds.length}</span></h2>
              {playerIds.length > 0 && (
                <button type="button" className="link" onClick={() => setPlayerIds([])}>Ninguno</button>
              )}
            </div>
            <PlayerPicker selected={playerIds} onChange={setPlayerIds} />
            <p className="hint">Tocá para elegir. El orden se sortea al crear el torneo.</p>
          </section>
          <div className="actionbar">
            <div className="actionbar-inner">
              <button type="button" className="btn btn-primary btn-block" disabled={playerIds.length < GAMES[game].minPlayers} onClick={toFormat}>
                {playerIds.length < 2 ? 'Elegí al menos 2 jugadores' : `Seguir con ${playerIds.length} jugadores`}
              </button>
            </div>
          </div>
          <div style={{ height: 70 }} />
        </>
      )}

      {step === 'format' && game && format && (
        <>
          <section className="card">
            <label className="field">
              <span className="field-label">Nombre del torneo</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Formato</h2>
              <span className="hint">{describeFormat(format)}</span>
            </div>
            <p className="muted small">
              Propuesta para {playerIds.length} jugadores. Cambiá lo que quieras; también se puede ajustar durante el torneo.
            </p>
            <FormatEditor format={format} players={playerIds.length} onChange={setFormat} />
          </section>
          {error && <p className="error">{error}</p>}
          <div className="actionbar">
            <div className="actionbar-inner">
              <button type="button" className="btn btn-primary btn-block" onClick={create}>
                <Icon name="shuffle" size={18} /> Crear torneo y sortear orden
              </button>
            </div>
          </div>
          <div style={{ height: 70 }} />
        </>
      )}
    </div>
  );
}
