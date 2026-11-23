import { Link } from 'react-router-dom';
import { tournamentLeaders } from '../games/stats';
import { GAMES } from '../model/games';
import { tournamentProgress } from '../model/progress';
import type { Player, Tournament } from '../model/types';
import { useData } from '../store/store';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

export function TournamentsPage() {
  const data = useData();
  const players = new Map(data.players.map((p) => [p.id, p]));
  const active = data.tournaments.filter((t) => t.status === 'active');
  const finished = data.tournaments.filter((t) => t.status === 'finished').slice(0, 5);

  return (
    <div className="page">
      <PageHeader
        title="Torneos"
        subtitle="Couch Co-op"
        action={<Link to="/nuevo" className="fab"><Icon name="plus" size={20} />Nuevo</Link>}
      />

      {active.length === 0 ? (
        <div className="hero-empty">
          <div className="hero-icon"><Icon name="trophy" size={32} /></div>
          <strong>No hay torneos en curso</strong>
          <span>Armá uno en segundos: elegís el juego, quiénes juegan y la app propone el resto.</span>
          <Link to="/nuevo" className="btn btn-primary"><Icon name="plus" size={18} />Nuevo torneo</Link>
        </div>
      ) : (
        <section className="stack-sm">
          <div className="section-title"><h2>En curso</h2></div>
          <ul className="list">
            {active.map((t) => <li key={t.id}><TournamentCard t={t} players={players} /></li>)}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section className="stack-sm">
          <div className="section-title">
            <h2>Últimos terminados</h2>
            <Link to="/historial" className="link">Ver historial</Link>
          </div>
          <ul className="list">
            {finished.map((t) => <li key={t.id}><TournamentCard t={t} players={players} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

export function TournamentCard({ t, players }: { t: Tournament; players: Map<string, Player> }) {
  const game = GAMES[t.game];
  const progress = tournamentProgress(t);
  const leaders = tournamentLeaders(t);
  const finished = t.status === 'finished';
  return (
    <Link to={`/torneo/${t.id}`} className={`t-card ${game.theme}`}>
      <div className="t-card-top">
        <span className="game-badge">{game.short}</span>
        <span className="t-card-title grow">
          <strong>{t.name}</strong>
          <span className="muted small">
            {game.name} · {t.playerIds.length} jugadores · {new Date(t.finishedAt ?? t.createdAt).toLocaleDateString('es-AR')}
          </span>
        </span>
        <Icon name="chevron" size={18} className="muted" />
      </div>
      <div className="t-card-meta">
        {leaders.length > 0 ? (
          <span className="leader">
            <span className="avatar-stack">
              {leaders.slice(0, 3).map((id) => <Avatar key={id} player={players.get(id)} size={24} />)}
            </span>
            {finished ? 'Campeón' : 'Puntero'}: <strong>{leaders.map((id) => players.get(id)?.name).join(', ')}</strong>
          </span>
        ) : (
          <span className="leader">Sin resultados todavía</span>
        )}
        <span className={`pill ${finished ? 'done' : 'live'}`}>{finished ? 'Terminado' : 'En curso'}</span>
      </div>
      {!finished && (
        <div className="stack-sm">
          <div className="progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
          <span className="hint">{progress.label}</span>
        </div>
      )}
    </Link>
  );
}
