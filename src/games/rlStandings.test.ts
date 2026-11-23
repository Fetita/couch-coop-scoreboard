import { describe, expect, it } from 'vitest';
import type { RocketLeagueMatch } from '../model/types';
import { award, resultError, rocketLeagueStandings } from './rlStandings';

let n = 0;
function match(team1: string[], team2: string[], winner?: 1 | 2, stats: RocketLeagueMatch['stats'] = {}): RocketLeagueMatch {
  return { id: String(n++), round: 1, team1, team2, resting: [], winner, stats };
}

describe('tabla', () => {
  it('1 punto por partido ganado a cada ganador', () => {
    const rows = rocketLeagueStandings(['A', 'B', 'C', 'D'], [
      match(['A', 'B'], ['C', 'D'], 1),
      match(['A', 'C'], ['B', 'D'], 2),
      match(['A', 'D'], ['B', 'C']),
    ], []);
    const byId = Object.fromEntries(rows.map((r) => [r.playerId, r]));
    expect(byId.B).toMatchObject({ points: 2, played: 2, winRate: 1 });
    expect(byId.A).toMatchObject({ points: 1, played: 2 });
    expect(byId.C).toMatchObject({ points: 0, played: 2 });
  });

  it('desempata por diferencia de gol y después por goles propios', () => {
    const ms = [
      match(['A', 'B'], ['C', 'D'], 1, { A: { goals: 3, saves: 0 }, B: { goals: 0, saves: 2 }, C: { goals: 1, saves: 0 } }),
      match(['C', 'D'], ['A', 'B'], 1, { C: { goals: 1, saves: 0 }, D: { goals: 1, saves: 0 } }),
    ];
    const rows = rocketLeagueStandings(['A', 'B', 'C', 'D'], ms, ['goalDiff', 'goalsFor']);
    // Todos 1 punto. Dif: A,B = +2-2 = 0; C,D = 0. Goles: A 3, C 2, D 1, B 0.
    expect(rows.map((r) => r.playerId)).toEqual(['A', 'C', 'D', 'B']);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('empates sin desempate comparten puesto', () => {
    const rows = rocketLeagueStandings(['A', 'B', 'C', 'D'], [match(['A', 'B'], ['C', 'D'], 1)], []);
    expect(rows.map((r) => r.position)).toEqual([1, 1, 3, 3]);
  });

  it('cambiar el orden del desempate cambia la tabla', () => {
    const ms = [
      match(['A'], ['B'], 1, { A: { goals: 1, saves: 0 } }),
      match(['B'], ['A'], 1, { B: { goals: 5, saves: 0 }, A: { goals: 4, saves: 0 } }),
    ];
    // Dif: A +1-1 = 0, B 0. Goles: A 5, B 5. Empate total.
    expect(rocketLeagueStandings(['A', 'B'], ms, ['goalDiff', 'goalsFor']).map((r) => r.position)).toEqual([1, 1]);
  });

  it('premios con empate compartido', () => {
    const rows = rocketLeagueStandings(['A', 'B', 'C', 'D'], [
      match(['A', 'B'], ['C', 'D'], 1, { A: { goals: 2, saves: 1 }, C: { goals: 2, saves: 4 } }),
    ], []);
    expect(award(rows, 'goals')).toEqual({ playerIds: ['A', 'C'], value: 2 });
    expect(award(rows, 'saves')).toEqual({ playerIds: ['C'], value: 4 });
    expect(award(rocketLeagueStandings(['A'], [], []), 'goals')).toBeNull();
  });

  it('no acepta resultados empatados ni ganadores con menos goles', () => {
    expect(resultError(match(['A'], ['B'], 1, { B: { goals: 1, saves: 0 } }))).toMatch(/más goles/);
    expect(resultError(match(['A'], ['B'], 1, { A: { goals: 1, saves: 0 }, B: { goals: 1, saves: 0 } }))).toMatch(/gol de oro/);
    expect(resultError(match(['A'], ['B'], undefined, { A: { goals: 2, saves: 0 }, B: { goals: 2, saves: 0 } }))).toMatch(/gol de oro/);
    expect(resultError(match(['A'], ['B']))).toMatch(/Elegí/);
    expect(resultError(match(['A'], ['B'], 1))).toBeNull();
    expect(resultError(match(['A'], ['B'], 2, { B: { goals: 1, saves: 0 } }))).toBeNull();
  });
});
