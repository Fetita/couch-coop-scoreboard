import { describe, expect, it } from 'vitest';
import { addPlayer, createTournament, finishTournament } from '../store/actions';
import { emptyData, migrate } from '../store/persistence';
import type { AppData } from '../model/types';
import { playerStats, tournamentLeaders } from './stats';
import { raceState } from './tmRace';
import { addRun, createRace, deleteEvent, eliminateManually, ensureTrack, trackmaniaStandings, trackRecords, tracksForMode, updateEvent } from './tmTournament';

function setup(): [AppData, string, string[]] {
  let d = emptyData();
  for (const n of ['A', 'B', 'C']) d = addPlayer(d, n)[0];
  const ids = d.players.map((p) => p.id);
  const [d2, t] = createTournament(d, { game: 'trackmania', playerIds: ids }, () => 0.99);
  return [d2, t.id, t.playerIds];
}

/** Juega una carrera completa donde el orden final es `finish` (primero = ganador). */
function playRace(d: AppData, tid: string, mode: string, track: string, finish: string[], base = 50000): AppData {
  let raceId: string;
  [d, { id: raceId }] = createRace(d, tid, mode, track);
  const race = () => d.tournaments.find((t) => t.id === tid)!.tmRaces.find((r) => r.id === raceId)!;
  for (const p of race().order) d = addRun(d, tid, raceId, p, base + finish.indexOf(p) * 1000, false);
  while (!raceState(race()).finished) {
    const next = raceState(race()).next!;
    d = addRun(d, tid, raceId, next, null, true);
  }
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

  it('rota el orden de salida en cada carrera', () => {
    let [d, tid, order] = setup();
    let r1, r2;
    [d, r1] = createRace(d, tid, 'Stadium', 'A01');
    [d, r2] = createRace(d, tid, 'Stadium', 'A02');
    expect(r1.order).toEqual(order);
    expect(r2.order).toEqual([...order.slice(1), order[0]]);
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

  it('corrige, borra intentos y elimina a mano', () => {
    let [d, tid, order] = setup();
    let race;
    [d, race] = createRace(d, tid, 'Stadium', 'A01');
    d = addRun(d, tid, race.id, order[0], 50000, false);
    const ev = d.tournaments[0].tmRaces[0].events[0];
    d = updateEvent(d, tid, race.id, ev.id, { timeMs: 45000 });
    expect(d.tournaments[0].tmRaces[0].events[0]).toMatchObject({ timeMs: 45000, type: 'run' });
    d = deleteEvent(d, tid, race.id, ev.id);
    expect(d.tournaments[0].tmRaces[0].events).toHaveLength(0);
    d = eliminateManually(d, tid, race.id, order[2]);
    expect(raceState(d.tournaments[0].tmRaces[0]).eliminated).toEqual([order[2]]);
  });

  it('récords por pista entre torneos', () => {
    let [d, tid] = setup();
    const [a, b, c] = d.players.map((p) => p.id);
    d = playRace(d, tid, 'Stadium', 'A01', [b, a, c], 40000);
    d = finishTournament(d, tid);
    let t2;
    [d, t2] = createTournament(d, { game: 'trackmania', playerIds: [a, b, c] });
    d = playRace(d, t2.id, 'Stadium', 'A01', [a, b, c], 39000);
    const track = d.tmTracks[0];
    const recs = trackRecords(d, track.id);
    expect(recs[0]).toMatchObject({ playerId: a, timeMs: 39000 });
    expect(recs).toHaveLength(3);
    const stats = playerStats(d, b);
    expect(stats.tournaments).toBe(2);
    expect(stats.tournamentWins).toBe(1);
    expect(stats.tm).toMatchObject({ races: 2, wins: 1, podiums: 2 });
    expect(stats.records).toEqual([{ trackId: track.id, timeMs: 40000, isTrackRecord: false }]);
  });

  it('migra datos v2', () => {
    const [d] = setup();
    const v2 = { schemaVersion: 2, players: d.players, tournaments: d.tournaments.map(({ tmRaces: _, ...t }) => t) };
    const m = migrate(v2);
    expect(m.schemaVersion).toBe(3);
    expect(m.tmTracks).toEqual([]);
    expect(m.tournaments[0].tmRaces).toEqual([]);
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

describe('color de auto por torneo', () => {
  it('se elige al crear el torneo y se puede cambiar', async () => {
    const { setCarColor } = await import('../store/actions');
    const { carColor } = await import('../model/colors');
    let d = emptyData();
    for (const n of ['A', 'B']) d = addPlayer(d, n)[0];
    const [a, b] = d.players;
    let t;
    [d, t] = createTournament(d, { game: 'trackmania', playerIds: [a.id, b.id], carColors: { [a.id]: '#ff0000' } });
    expect(carColor(t, a)).toBe('#ff0000');
    expect(carColor(t, b)).toBe(b.color);
    d = setCarColor(d, t.id, b.id, '#00ff00');
    expect(carColor(d.tournaments[0], b)).toBe('#00ff00');
    // Cada torneo tiene sus propios colores.
    let t2;
    [d, t2] = createTournament(d, { game: 'trackmania', playerIds: [a.id, b.id], carColors: { [a.id]: '#0000ff' } });
    expect(carColor(t2, a)).toBe('#0000ff');
    expect(carColor(d.tournaments.find((x) => x.id === t.id), a)).toBe('#ff0000');
  });
});
