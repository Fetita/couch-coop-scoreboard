import { describe, expect, it } from 'vitest';
import { addPlayer, createTournament, finishTournament } from '../store/actions';
import { emptyData, migrate } from '../store/persistence';
import type { AppData } from '../model/types';
import { playerStats, tournamentLeaders } from './stats';
import { raceState } from './tmRace';
import { createRace, eliminate, ensureTrack, swapRaceOrder, trackmaniaStandings, tracksForMode, undoElimination } from './tmTournament';

function setup(): [AppData, string, string[]] {
  let d = emptyData();
  for (const n of ['A', 'B', 'C']) d = addPlayer(d, n)[0];
  const ids = d.players.map((p) => p.id);
  const [d2, t] = createTournament(d, { game: 'trackmania', playerIds: ids }, () => 0.99);
  return [d2, t.id, t.playerIds];
}

/** Juega una carrera completa donde el orden final es `finish` (primero = ganador). */
function playRace(d: AppData, tid: string, mode: string, track: string, finish: string[]): AppData {
  let raceId: string;
  [d, { id: raceId }] = createRace(d, tid, mode, track);
  const race = () => d.tournaments.find((t) => t.id === tid)!.tmRaces.find((r) => r.id === raceId)!;
  for (const p of [...finish].reverse().slice(0, -1)) d = eliminate(d, tid, raceId, p);
  expect(raceState(race()).finished).toBe(true);
  return d;
}

describe('torneo de Trackmania', () => {
  it('reutiliza pistas por modo de auto', () => {
    let d = emptyData();
    let t1, t2, t3;
    [d, t1] = ensureTrack(d, 'Stadium', 'Pista 1');
    [d, t2] = ensureTrack(d, 'Stadium', ' pista 1 ');
    [d, t3] = ensureTrack(d, 'Snow', 'Pista 1');
    expect(t2.id).toBe(t1.id);
    expect(t3.id).not.toBe(t1.id);
    expect(tracksForMode(d, 'Stadium')).toHaveLength(1);
  });

  it('la primera carrera sale en el orden del torneo y las siguientes según el resultado anterior', () => {
    let [d, tid, order] = setup();
    const [a, b, c] = order;
    let r1;
    [d, r1] = createRace(d, tid, 'Stadium', 'A01');
    expect(r1.order).toEqual(order);
    d = eliminate(d, tid, r1.id, b);
    d = eliminate(d, tid, r1.id, a);
    let r2;
    [d, r2] = createRace(d, tid, 'Stadium', 'A02');
    // Ganó c (azul), segundo a (rojo), tercero b (verde).
    expect(r2.order).toEqual([c, a, b]);
  });

  it('en Trackmania no se sortea: queda el orden en que se eligieron', () => {
    let d = emptyData();
    for (const n of ['A', 'B', 'C', 'D']) d = addPlayer(d, n)[0];
    const ids = d.players.map((p) => p.id);
    const [, t] = createTournament(d, { game: 'trackmania', playerIds: ids }, () => 0.1);
    expect(t.playerIds).toEqual(ids);
  });

  it('cambia el orden antes de largar, deshace eliminaciones', () => {
    let [d, tid, order] = setup();
    const [a, b, c] = order;
    let race;
    [d, race] = createRace(d, tid, 'Stadium', 'A01');
    d = swapRaceOrder(d, tid, race.id, a, c);
    expect(d.tournaments[0].tmRaces[0].order).toEqual([c, b, a]);
    d = eliminate(d, tid, race.id, b);
    expect(() => swapRaceOrder(d, tid, race.id, a, c)).toThrow();
    d = undoElimination(d, tid, race.id, b);
    expect(d.tournaments[0].tmRaces[0].eliminated).toEqual([]);
    d = eliminate(d, tid, race.id, b);
    d = eliminate(d, tid, race.id, a);
    expect(() => eliminate(d, tid, race.id, c)).toThrow();
  });

  it('suma puntos de carreras terminadas y filtra por modo', () => {
    let [d, tid] = setup();
    const ids = d.players.map((p) => p.id);
    const [a, b, c] = ids;
    d = playRace(d, tid, 'Stadium', 'A01', [a, b, c]);
    d = playRace(d, tid, 'Snow', 'S01', [b, a, c]);
    d = playRace(d, tid, 'Stadium', 'A02', [a, c, b]);
    const t = d.tournaments[0];
    const all = trackmaniaStandings(t);
    expect(all.map((r) => [r.playerId, r.points, r.wins])).toEqual([[a, 8, 2], [b, 6, 1], [c, 4, 0]]);
    const snow = trackmaniaStandings(t, 'Snow');
    expect(snow[0]).toMatchObject({ playerId: b, points: 3, races: 1 });
    expect(tournamentLeaders(t)).toEqual([a]);
  });

  it('carreras sin terminar no suman', () => {
    let [d, tid] = setup();
    [d] = createRace(d, tid, 'Stadium', 'A01');
    expect(trackmaniaStandings(d.tournaments[0]).every((r) => r.points === 0)).toBe(true);
    expect(tournamentLeaders(d.tournaments[0])).toEqual([]);
  });

  it('estadísticas del jugador entre torneos', () => {
    let [d, tid] = setup();
    const [a, b, c] = d.players.map((p) => p.id);
    d = playRace(d, tid, 'Stadium', 'A01', [b, a, c]);
    d = finishTournament(d, tid);
    let t2;
    [d, t2] = createTournament(d, { game: 'trackmania', playerIds: [a, b, c] });
    d = playRace(d, t2.id, 'Stadium', 'A01', [a, b, c]);
    const stats = playerStats(d, b);
    expect(stats.tournaments).toBe(2);
    expect(stats.tournamentWins).toBe(1);
    expect(stats.tm).toMatchObject({ races: 2, wins: 1, podiums: 2 });
  });

  it('migra datos v2', () => {
    const [d] = setup();
    const v2 = { schemaVersion: 2, players: d.players, tournaments: d.tournaments.map(({ tmRaces: _, ...t }) => t) };
    const m = migrate(v2);
    expect(m.schemaVersion).toBe(4);
    expect(m.tmTracks).toEqual([]);
    expect(m.tournaments[0].tmRaces).toEqual([]);
  });

  it('migra carreras v3 con tiempos al orden de eliminación', () => {
    const run = (playerId: string, timeMs: number | null, outOfFuel = false) => ({ id: playerId + timeMs, type: 'run', playerId, timeMs, outOfFuel });
    const v3 = {
      schemaVersion: 3,
      players: [],
      tmTracks: [],
      tournaments: [{
        id: 't', name: 'T', game: 'trackmania', createdAt: '', status: 'active', playerIds: ['A', 'B', 'C'],
        format: { game: 'trackmania', tracks: 3, pointsScale: [3, 2, 1] }, rlMatches: [], carColors: { A: '#fff' },
        tmRaces: [{
          id: 'r', carMode: 'Stadium', trackId: 'x', createdAt: '', order: ['A', 'B', 'C'],
          // C es el más lento, se queda sin nafta: afuera. Después A sin nafta: afuera. Gana B.
          events: [run('A', 50000), run('B', 49000), run('C', 51000), run('C', 50500, true), run('A', 49800, true)],
        }],
      }],
    };
    const m = migrate(v3);
    const t = m.tournaments[0];
    expect(t).not.toHaveProperty('carColors');
    expect(t.tmRaces[0]).not.toHaveProperty('events');
    expect(t.tmRaces[0].eliminated).toEqual(['C', 'A']);
    expect(raceState(t.tmRaces[0]).winner).toBe('B');
  });
});

describe('tabla general', () => {
  it('suma puntos de todos los torneos y campeonatos', async () => {
    const { generalStandings } = await import('./stats');
    let [d, tid] = setup();
    const [a, b, c] = d.players.map((p) => p.id);
    d = playRace(d, tid, 'Stadium', 'A01', [a, b, c]);
    d = finishTournament(d, tid);
    let rl;
    [d, rl] = createTournament(d, { game: 'rocket-league', playerIds: [a, b, c] });
    const m = rl.rlMatches[0];
    d = { ...d, tournaments: d.tournaments.map((t) => t.id === rl.id ? { ...t, rlMatches: t.rlMatches.map((x) => x.id === m.id ? { ...x, winner: 2 as const } : x) } : t) };
    const rows = generalStandings(d);
    const byId = Object.fromEntries(rows.map((r) => [r.playerId, r]));
    expect(byId[a]).toMatchObject({ tmPoints: 3, titles: 1, tournaments: 2 });
    expect(byId[m.team2[0]].rlPoints).toBe(1);
    expect(rows[0].playerId).toBe(rows.reduce((best, r) => (r.points > best.points ? r : best)).playerId);
    expect(generalStandings(d, 'rocket-league').every((r) => r.tmPoints === 0)).toBe(true);
  });
});
