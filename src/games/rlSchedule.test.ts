import { describe, expect, it } from 'vitest';
import { proposeMatchesPerRound } from '../model/format';
import { candidateMatches, generateMatches, type MatchSlot } from './rlSchedule';

const players = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

function teammateCounts(matches: MatchSlot[]) {
  const counts = new Map<string, number>();
  for (const m of matches)
    for (const team of [m.team1, m.team2])
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const k = [team[i], team[j]].sort().join('');
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
  return counts;
}

function playCounts(ps: string[], matches: MatchSlot[]) {
  return ps.map((p) => matches.filter((m) => m.team1.includes(p) || m.team2.includes(p)).length);
}

describe('candidatos', () => {
  it('cuenta bien las formas de armar 2v2 con 5', () => {
    // C(5,4) formas de elegir quién juega × 3 formas de partir 4 en dos parejas.
    expect(candidateMatches(players(5), 2)).toHaveLength(15);
  });
});

describe('rotación', () => {
  it('5 jugadores 2v2: todos descansan una vez y cada pareja juega junta una vez', () => {
    const ps = players(5);
    const ms = generateMatches(ps, 2, 5);
    expect(ms).toHaveLength(5);
    expect(playCounts(ps, ms)).toEqual([4, 4, 4, 4, 4]);
    const tc = teammateCounts(ms);
    expect(tc.size).toBe(10);
    expect([...tc.values()].every((n) => n === 1)).toBe(true);
  });

  it('4 jugadores 2v2: las 3 combinaciones de parejas', () => {
    const ms = generateMatches(players(4), 2, 3);
    const tc = teammateCounts(ms);
    expect(tc.size).toBe(6);
  });

  it('nadie descansa dos seguidos con 5 jugadores', () => {
    const ms = generateMatches(players(5), 2, 10);
    for (let i = 1; i < ms.length; i++) expect(ms[i].resting).not.toEqual(ms[i - 1].resting);
  });

  it('reparte parejo para otras cantidades y tamaños', () => {
    for (const [n, t] of [[3, 1], [6, 2], [7, 2], [6, 3], [8, 3], [9, 2]] as const) {
      const ps = players(n);
      const ms = generateMatches(ps, t, proposeMatchesPerRound(n, t));
      const pc = playCounts(ps, ms);
      expect(Math.max(...pc) - Math.min(...pc)).toBeLessThanOrEqual(0);
      for (const m of ms) {
        expect(m.team1).toHaveLength(t);
        expect(m.team2).toHaveLength(t);
        expect(m.resting).toHaveLength(n - 2 * t);
      }
    }
  });

  it('sigue la rotación teniendo en cuenta lo jugado', () => {
    const ps = players(5);
    const first = generateMatches(ps, 2, 2);
    const rest = generateMatches(ps, 2, 3, first, 7);
    const all = [...first, ...rest];
    expect(playCounts(ps, all)).toEqual([4, 4, 4, 4, 4]);
  });

  it('no arma partidos si no alcanzan los jugadores', () => {
    expect(generateMatches(players(3), 2, 3)).toEqual([]);
  });

  it('es reproducible con la misma semilla', () => {
    expect(generateMatches(players(6), 2, 8, [], 42)).toEqual(generateMatches(players(6), 2, 8, [], 42));
  });
});
