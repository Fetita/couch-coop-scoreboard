import { Link } from 'react-router-dom';
import { describeFormat } from '../model/format';
import { GAMES } from '../model/games';
import type { Tournament } from '../model/types';
import { useData } from '../store/store';

export function TournamentsPage() {
  const data = useData();
  const active = data.tournaments.filter((t) => t.status === 'active');
  const finished = data.tournaments.filter((t) => t.status === 'finished');

  return (
    <div className="page">
      <header className="page-header">
        <h1>Torneos</h1>
      </header>
      <Link to="/nuevo" className="btn btn-primary btn-block">+ Nuevo torneo</Link>

      <section>
        <h2>En curso</h2>
        {active.length === 0 ? <p className="muted">No hay torneos en curso.</p> : <List items={active} />}
      </section>
      {finished.length > 0 && (
        <section>
          <h2>Terminados</h2>
          <List items={finished} />
        </section>
      )}
    </div>
  );
}

function List({ items }: { items: Tournament[] }) {
  return (
    <ul className="cards">
      {items.map((t) => (
        <li key={t.id}>
          <Link to={`/torneo/${t.id}`} className="card card-link">
            <span className="card-emoji">{GAMES[t.game].emoji}</span>
            <span className="card-body">
              <strong>{t.name}</strong>
              <span className="muted">{t.playerIds.length} jugadores · {describeFormat(t.format)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
