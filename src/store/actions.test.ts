import { describe, expect, it } from 'vitest';
import { emptyData, exportBackup, parseBackup } from './persistence';
import {
  addPlayer,
  createTournament,
  finishTournament,
  removePlayer,
  reopenTournament,
  setTournamentPlayers,
  updatePlayer,
} from './actions';
import type { AppData } from '../model/types';

function withPlayers(...names: string[]): AppData {
  return names.reduce((d, n) => addPlayer(d, n)[0], emptyData());
}

describe('jugadores', () => {
  it('agrega con colores distintos', () => {
    const d = withPlayers('Ana', 'Beto', 'Caro');
    expect(new Set(d.players.map((p) => p.color)).size).toBe(3);
  });

  it('no acepta nombres vacíos ni repetidos', () => {
    const d = withPlayers('Ana');
    expect(() => addPlayer(d, '  ')).toThrow();
    expect(() => addPlayer(d, 'ana')).toThrow(/Ya hay/);
    const two = withPlayers('Ana', 'Beto');
    expect(() => updatePlayer(two, two.players[1].id, { name: 'ANA' })).toThrow(/Ya hay/);
    expect(updatePlayer(two, two.players[1].id, { name: ' Bete ' }).players[1].name).toBe('Bete');
  });

  it('borra si nunca jugó y archiva si ya jugó', () => {
    let d = withPlayers('Ana', 'Beto', 'Caro');
    const [ana, beto, caro] = d.players;
    d = createTournament(d, { game: 'trackmania', playerIds: [ana.id, beto.id] })[0];
    expect(removePlayer(d, caro.id).players).toHaveLength(2);
    const archived = removePlayer(d, ana.id);
    expect(archived.players).toHaveLength(3);
    expect(archived.players.find((p) => p.id === ana.id)?.archived).toBe(true);
  });
});

describe('torneos', () => {
  it('crea con la propuesta y sortea el orden', () => {
    const d = withPlayers('A', 'B', 'C', 'D', 'E');
    const ids = d.players.map((p) => p.id);
    const [next, t] = createTournament(d, { game: 'rocket-league', playerIds: ids }, () => 0);
    expect(next.tournaments).toHaveLength(1);
    expect(t.status).toBe('active');
    expect(t.format).toMatchObject({ teamSize: 2, matchesPerRound: 5 });
    expect([...t.playerIds].sort()).toEqual([...ids].sort());
    expect(t.playerIds).not.toEqual(ids);
  });

  it('pide al menos 2 jugadores', () => {
    const d = withPlayers('A');
    expect(() => createTournament(d, { game: 'trackmania', playerIds: [d.players[0].id] })).toThrow();
  });

  it('cambia jugadores a mitad de torneo manteniendo el orden', () => {
    let d = withPlayers('A', 'B', 'C', 'D');
    const [a, b, c, dd] = d.players.map((p) => p.id);
    let t;
    [d, t] = createTournament(d, { game: 'rocket-league', playerIds: [a, b, c] });
    const order = t.playerIds.filter((x) => x !== b);
    d = setTournamentPlayers(d, t.id, [a, c, dd]);
    expect(d.tournaments[0].playerIds).toEqual([...order, dd]);
  });

  it('termina y reabre', () => {
    let d = withPlayers('A', 'B');
    let t;
    [d, t] = createTournament(d, { game: 'trackmania', playerIds: d.players.map((p) => p.id) });
    d = finishTournament(d, t.id);
    expect(d.tournaments[0]).toMatchObject({ status: 'finished' });
    expect(d.tournaments[0].finishedAt).toBeTruthy();
    d = reopenTournament(d, t.id);
    expect(d.tournaments[0]).toMatchObject({ status: 'active', finishedAt: undefined });
  });
});

describe('copia de seguridad', () => {
  it('exporta y restaura los mismos datos', () => {
    const d = withPlayers('A', 'B');
    expect(parseBackup(exportBackup(d))).toEqual(d);
  });

  it('rechaza archivos que no son copias', () => {
    expect(() => parseBackup('no json')).toThrow(/JSON/);
    expect(() => parseBackup('{"foo":1}')).toThrow(/Couch Co-op/);
  });
});
