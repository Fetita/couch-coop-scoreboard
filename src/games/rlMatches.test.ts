import { describe, expect, it } from 'vitest';
import { addPlayer, createTournament, setTournamentFormat, setTournamentPlayers } from '../store/actions';
import { emptyData, migrate } from '../store/persistence';
import type { AppData, RocketLeagueFormat, Tournament } from '../model/types';
import { addMatch, clearResult, recordResult, removeMatch, setTeams } from './rlMatches';
import { isPlayed } from './rlStandings';

function setup(n = 5): [AppData, Tournament] {
  let d = emptyData();
  for (let i = 0; i < n; i++) d = addPlayer(d, `P${i}`)[0];
  return createTournament(d, { game: 'rocket-league', playerIds: d.players.map((p) => p.id) });
}

const fmt = (t: Tournament) => t.format as RocketLeagueFormat;

describe('partidos de Rocket League', () => {
  it('al crear el torneo arma los partidos propuestos', () => {
    const [, t] = setup(5);
    expect(t.rlMatches).toHaveLength(5);
    expect(t.rlMatches.every((m) => m.round === 1)).toBe(true);
  });

  it('guarda resultado con goles y saves, y lo borra', () => {
    let [, t] = setup(4);
    const m = t.rlMatches[0];
    t = recordResult(t, m.id, 2, { [m.team2[0]]: { goals: 2, saves: 0 }, [m.team1[0]]: { goals: 0, saves: 0 }, outsider: { goals: 9, saves: 9 } });
    const saved = t.rlMatches[0];
    expect(saved.winner).toBe(2);
    expect(saved.stats).toEqual({ [m.team2[0]]: { goals: 2, saves: 0 } });
    expect(saved.playedAt).toBeTruthy();
    t = clearResult(t, m.id);
    expect(isPlayed(t.rlMatches[0])).toBe(false);
  });

  it('más rondas agrega partidos al final y menos quita pendientes', () => {
    let [d, t] = setup(5);
    t = recordResult(t, t.rlMatches[0].id, 1, {});
    d = { ...d, tournaments: [t] };
    d = setTournamentFormat(d, t.id, { ...fmt(t), rounds: 2 });
    let t2 = d.tournaments[0];
    expect(t2.rlMatches).toHaveLength(10);
    expect(t2.rlMatches.map((m) => m.round)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
    expect(t2.rlMatches[0].id).toBe(t.rlMatches[0].id);
    d = setTournamentFormat(d, t.id, { ...fmt(t2), rounds: 1, matchesPerRound: 2 });
    t2 = d.tournaments[0];
    expect(t2.rlMatches).toHaveLength(2);
    expect(isPlayed(t2.rlMatches[0])).toBe(true);
  });

  it('quitar un jugador rearma los pendientes sin tocar los jugados', () => {
    let [d, t] = setup(5);
    const played = t.rlMatches[0];
    t = recordResult(t, played.id, 1, {});
    d = { ...d, tournaments: [t] };
    const leaving = t.playerIds.find((p) => !played.resting.includes(p))!;
    d = setTournamentPlayers(d, t.id, t.playerIds.filter((p) => p !== leaving));
    const t2 = d.tournaments[0];
    expect(t2.rlMatches[0]).toEqual(t.rlMatches[0]);
    for (const m of t2.rlMatches.slice(1)) {
      expect([...m.team1, ...m.team2, ...m.resting]).not.toContain(leaving);
    }
    expect(t2.rlMatches).toHaveLength(5);
  });

  it('agregar, quitar y cambiar equipos a mano', () => {
    let [, t] = setup(5);
    t = addMatch(t);
    expect(t.rlMatches).toHaveLength(6);
    expect(t.rlMatches[5].round).toBe(2);
    t = removeMatch(t, t.rlMatches[5].id);
    expect(t.rlMatches).toHaveLength(5);
    const [a, b, c, dd, e] = t.playerIds;
    t = setTeams(t, t.rlMatches[0].id, [a, b], [c]);
    expect(t.rlMatches[0]).toMatchObject({ team1: [a, b], team2: [c], resting: [dd, e] });
    expect(() => setTeams(t, t.rlMatches[0].id, [a], [a])).toThrow();
    expect(() => setTeams(t, t.rlMatches[0].id, [], [a])).toThrow();
  });

  it('migra datos v1 armando los partidos', () => {
    const [d, t] = setup(4);
    const { rlMatches: _, ...v1t } = t;
    const v1 = { ...d, schemaVersion: 1, tournaments: [v1t] };
    const migrated = migrate(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.tournaments[0].rlMatches).toHaveLength(3);
  });
});
