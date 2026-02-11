import { Match, Team } from '../types';
import { TEAMS_DATA, GROUPS } from '../data/teams';
import { calculateGroupStandings, getAdvancedTeams } from './simulator';

export type PhaseKey = 'groups' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export const PHASE_LABEL: Record<PhaseKey, string> = {
  groups: 'Fase de grupos',
  r32: 'Rodada 32',
  r16: 'Rodada 16',
  qf: 'Quartas',
  sf: 'Semifinais',
  third: '3º e 4º lugar',
  final: 'Final'
};

const RESULT_POINTS: Record<PhaseKey, Record<string, number | null>> = {
  groups: {
    exact: 10,
    winnerGoals: 5,
    winnerOnly: 3,
    loserGoals: 5,
    drawDiff: 4
  },
  r32: {
    exact: 15,
    winnerGoals: 10,
    winnerOnly: 5,
    loserGoals: 7,
    drawDiff: 8
  },
  r16: {
    exact: 20,
    winnerGoals: 13,
    winnerOnly: 8,
    loserGoals: 10,
    drawDiff: null
  },
  qf: {
    exact: 25,
    winnerGoals: 16,
    winnerOnly: 11,
    loserGoals: 13,
    drawDiff: null
  },
  sf: {
    exact: 30,
    winnerGoals: 19,
    winnerOnly: 14,
    loserGoals: 16,
    drawDiff: null
  },
  third: {
    exact: 35,
    winnerGoals: 22,
    winnerOnly: 17,
    loserGoals: 19,
    drawDiff: null
  },
  final: {
    exact: 45,
    winnerGoals: 25,
    winnerOnly: 20,
    loserGoals: 22,
    drawDiff: null
  }
};

const INDICATION_POINTS: Record<PhaseKey, number | null> = {
  groups: null,
  r32: 3,
  r16: 5,
  qf: 10,
  sf: 10,
  third: 20,
  final: 30
};

export interface ScoreMapEntry {
  a: number | null;
  b: number | null;
}

export interface MatchScoreDetail {
  matchId: string;
  phase: PhaseKey;
  phaseLabel: string;
  predicted: ScoreMapEntry | null;
  official: ScoreMapEntry;
  ruleApplied: string;
  resultPoints: number;
  indicationPoints: number;
  totalPoints: number;
}

export interface UserScoreSummary {
  userId: string;
  name: string;
  total: number;
  byPhase: Record<PhaseKey, number>;
  byRule: Record<string, number>;
  perMatch: MatchScoreDetail[];
}

const R32_STRUCTURE = [
  { id: '73', a: '2A', b: '2B' },
  { id: '74', a: '1E', b: '3rd-1-A/B/C/D/F' },
  { id: '75', a: '1F', b: '2C' },
  { id: '76', a: '1C', b: '2F' },
  { id: '77', a: '1I', b: '3rd-2-C/D/F/G/H' },
  { id: '78', a: '2E', b: '2I' },
  { id: '79', a: '1A', b: '3rd-3-C/E/F/H/I' },
  { id: '80', a: '1L', b: '3rd-4-E/H/I/J/K' },
  { id: '81', a: '1D', b: '3rd-5-B/E/F/I/J' },
  { id: '82', a: '1G', b: '3rd-6-A/E/H/I/J' },
  { id: '83', a: '2K', b: '2L' },
  { id: '84', a: '1H', b: '2J' },
  { id: '85', a: '1B', b: '3rd-7-E/F/G/I/J' },
  { id: '86', a: '1J', b: '2H' },
  { id: '87', a: '1K', b: '3rd-8-D/E/I/J/L' },
  { id: '88', a: '2D', b: '2G' }
];

const R16_STRUCTURE = [
  { id: '89', a: 'W74', b: 'W77' },
  { id: '90', a: 'W73', b: 'W75' },
  { id: '91', a: 'W76', b: 'W78' },
  { id: '92', a: 'W79', b: 'W80' },
  { id: '93', a: 'W83', b: 'W84' },
  { id: '94', a: 'W81', b: 'W82' },
  { id: '95', a: 'W86', b: 'W88' },
  { id: '96', a: 'W85', b: 'W87' }
];

const QF_STRUCTURE = [
  { id: '97', a: 'W89', b: 'W90' },
  { id: '98', a: 'W93', b: 'W94' },
  { id: '99', a: 'W91', b: 'W92' },
  { id: '100', a: 'W95', b: 'W96' }
];

const SF_STRUCTURE = [
  { id: '101', a: 'W97', b: 'W98' },
  { id: '102', a: 'W99', b: 'W100' }
];

const FINAL_STRUCTURE = [
  { id: '103', a: 'L101', b: 'L102' },
  { id: '104', a: 'W101', b: 'W102' }
];

const teamById = new Map<string, Team>(TEAMS_DATA.map(t => [t.id, t]));

const buildGroupMatches = (scoreMap: Record<string, ScoreMapEntry>): Match[] => {
  const matches: Match[] = [];
  GROUPS.forEach(group => {
    const groupTeams = TEAMS_DATA.filter(t => t.group === group);
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const id = `m-${group}-${i}-${j}`;
        const score = scoreMap[id];
        matches.push({
          id,
          group,
          teamA: groupTeams[i].id,
          teamB: groupTeams[j].id,
          scoreA: score ? score.a : null,
          scoreB: score ? score.b : null
        });
      }
    }
  });
  return matches;
};

const buildKnockoutMatches = (scoreMap: Record<string, ScoreMapEntry>): Match[] => {
  const all: Match[] = [];
  const append = (items: { id: string; a: string; b: string }[]) => {
    items.forEach(item => {
      const score = scoreMap[item.id];
      all.push({
        id: item.id,
        group: 'KO',
        teamA: item.a,
        teamB: item.b,
        scoreA: score ? score.a : null,
        scoreB: score ? score.b : null
      });
    });
  };
  append(R32_STRUCTURE);
  append(R16_STRUCTURE);
  append(QF_STRUCTURE);
  append(SF_STRUCTURE);
  append(FINAL_STRUCTURE);
  return all;
};

const getPhaseForMatch = (matchId: string): PhaseKey => {
  if (matchId.startsWith('m-')) return 'groups';
  const id = parseInt(matchId, 10);
  if (id >= 73 && id <= 88) return 'r32';
  if (id >= 89 && id <= 96) return 'r16';
  if (id >= 97 && id <= 100) return 'qf';
  if (id >= 101 && id <= 102) return 'sf';
  if (id === 103) return 'third';
  return 'final';
};

const resolveTeam = (
  token: string,
  groupPlacements: Map<string, string>,
  bestThirdPlaces: Team[],
  knockoutMatches: Match[],
  scoreMap: Record<string, ScoreMapEntry>
): Team | null => {
  const visited = new Set<string>();

  const inner = (id: string): Team | null => {
    if (visited.has(id)) return null;
    visited.add(id);

    const groupMatch = id.match(/^([123])([A-L])$/);
    if (groupMatch) {
      const teamId = groupPlacements.get(id);
      return teamId ? teamById.get(teamId) ?? null : null;
    }

    const thirdMatch = id.match(/^3rd-(\d+)-/i);
    if (thirdMatch) {
      const index = parseInt(thirdMatch[1], 10) - 1;
      return bestThirdPlaces[index] ?? null;
    }

    const wlMatch = id.match(/^([WL])(\d{2,3})$/i);
    if (wlMatch) {
      const kind = wlMatch[1].toUpperCase();
      const matchId = wlMatch[2];
      const match = knockoutMatches.find(m => m.id === matchId);
      if (!match) return null;
      const a = inner(match.teamA);
      const b = inner(match.teamB);
      const score = scoreMap[matchId];
      if (!a || !b || !score || score.a === null || score.b === null) return null;
      if (score.a === score.b) return null;
      const winner = score.a > score.b ? a : b;
      const loser = score.a > score.b ? b : a;
      return kind === 'W' ? winner : loser;
    }

    return teamById.get(id) ?? null;
  };

  return inner(token);
};

const scoreResult = (
  phase: PhaseKey,
  predicted: ScoreMapEntry | null,
  official: ScoreMapEntry
): { points: number; rule: string } => {
  if (!predicted || predicted.a === null || predicted.b === null) {
    return { points: 0, rule: 'Sem palpite' };
  }
  const { a: pa, b: pb } = predicted;
  const { a: oa, b: ob } = official;

  if (pa === oa && pb === ob) {
    return { points: RESULT_POINTS[phase].exact ?? 0, rule: 'Resultado exato' };
  }

  const officialDraw = oa === ob;
  const predictedDraw = pa === pb;

  if (officialDraw && predictedDraw) {
    return {
      points: RESULT_POINTS[phase].drawDiff ?? 0,
      rule: 'Empate diferente'
    };
  }

  if (!officialDraw) {
    const officialWinner = oa > ob ? 'A' : 'B';
    const predictedWinner = pa > pb ? 'A' : pa < pb ? 'B' : 'D';
    if (predictedWinner === officialWinner) {
      const officialWinnerGoals = oa > ob ? oa : ob;
      const officialLoserGoals = oa > ob ? ob : oa;
      const predictedWinnerGoals = pa > pb ? pa : pb;
      const predictedLoserGoals = pa > pb ? pb : pa;
      if (predictedWinnerGoals === officialWinnerGoals) {
        return { points: RESULT_POINTS[phase].winnerGoals ?? 0, rule: 'Vencedor + gols do vencedor' };
      }
      if (predictedLoserGoals === officialLoserGoals) {
        return { points: RESULT_POINTS[phase].loserGoals ?? 0, rule: 'Vencedor + gols do perdedor' };
      }
      return { points: RESULT_POINTS[phase].winnerOnly ?? 0, rule: 'Apenas vencedor' };
    }
  }

  return { points: 0, rule: 'Errou' };
};

const emptyPhaseTotals = (): Record<PhaseKey, number> => ({
  groups: 0,
  r32: 0,
  r16: 0,
  qf: 0,
  sf: 0,
  third: 0,
  final: 0
});

export const buildUserScoreSummary = (
  userId: string,
  name: string,
  predictionMap: Record<string, ScoreMapEntry>,
  officialMap: Record<string, ScoreMapEntry>
): UserScoreSummary => {
  const officialGroupMatches = buildGroupMatches(officialMap);
  const officialPlacements = new Map<string, string>();
  GROUPS.forEach(group => {
    const groupTeams = TEAMS_DATA.filter(t => t.group === group);
    const groupMatches = officialGroupMatches.filter(m => m.group === group);
    const standings = calculateGroupStandings(groupTeams, groupMatches);
    const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
    if (!hasAnyMatch) return;
    const top3 = standings.slice(0, 3).map(s => s.teamId);
    if (top3[0]) officialPlacements.set(`1${group}`, top3[0]);
    if (top3[1]) officialPlacements.set(`2${group}`, top3[1]);
    if (top3[2]) officialPlacements.set(`3${group}`, top3[2]);
  });
  const officialAdvanced = getAdvancedTeams(GROUPS, TEAMS_DATA, officialGroupMatches);
  const officialKnockoutMatches = buildKnockoutMatches(officialMap);

  const userGroupMatches = buildGroupMatches(predictionMap);
  const userPlacements = new Map<string, string>();
  GROUPS.forEach(group => {
    const groupTeams = TEAMS_DATA.filter(t => t.group === group);
    const groupMatches = userGroupMatches.filter(m => m.group === group);
    const standings = calculateGroupStandings(groupTeams, groupMatches);
    const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
    if (!hasAnyMatch) return;
    const top3 = standings.slice(0, 3).map(s => s.teamId);
    if (top3[0]) userPlacements.set(`1${group}`, top3[0]);
    if (top3[1]) userPlacements.set(`2${group}`, top3[1]);
    if (top3[2]) userPlacements.set(`3${group}`, top3[2]);
  });
  const userAdvanced = getAdvancedTeams(GROUPS, TEAMS_DATA, userGroupMatches);
  const userKnockoutMatches = buildKnockoutMatches(predictionMap);

  const byPhase = emptyPhaseTotals();
  const byRule: Record<string, number> = {};
  const perMatch: MatchScoreDetail[] = [];

  Object.entries(officialMap).forEach(([matchId, officialScore]) => {
    if (officialScore.a === null || officialScore.b === null) return;
    const phase = getPhaseForMatch(matchId);
    const predictedScore = predictionMap[matchId] ?? null;
    const result = scoreResult(phase, predictedScore, officialScore);

    let indicationPoints = 0;
    if (phase !== 'groups') {
      const indicatorValue = INDICATION_POINTS[phase] ?? 0;
      if (indicatorValue > 0) {
        const officialMatch = officialKnockoutMatches.find(m => m.id === matchId);
        const userMatch = userKnockoutMatches.find(m => m.id === matchId);
        if (officialMatch && userMatch) {
          const officialA = resolveTeam(officialMatch.teamA, officialPlacements, officialAdvanced.bestThirdPlaces, officialKnockoutMatches, officialMap);
          const officialB = resolveTeam(officialMatch.teamB, officialPlacements, officialAdvanced.bestThirdPlaces, officialKnockoutMatches, officialMap);
          const userA = resolveTeam(userMatch.teamA, userPlacements, userAdvanced.bestThirdPlaces, userKnockoutMatches, predictionMap);
          const userB = resolveTeam(userMatch.teamB, userPlacements, userAdvanced.bestThirdPlaces, userKnockoutMatches, predictionMap);
          if (officialA && userA && officialA.id === userA.id) indicationPoints += indicatorValue;
          if (officialB && userB && officialB.id === userB.id) indicationPoints += indicatorValue;
        }
      }
    }

    const totalPoints = result.points + indicationPoints;
    byPhase[phase] += totalPoints;
    byRule[result.rule] = (byRule[result.rule] ?? 0) + result.points;
    if (indicationPoints > 0) {
      byRule['Indicação correta / por país'] = (byRule['Indicação correta / por país'] ?? 0) + indicationPoints;
    }

    perMatch.push({
      matchId,
      phase,
      phaseLabel: PHASE_LABEL[phase],
      predicted: predictedScore,
      official: officialScore,
      ruleApplied: result.rule,
      resultPoints: result.points,
      indicationPoints,
      totalPoints
    });
  });

  const total = Object.values(byPhase).reduce((sum, val) => sum + val, 0);

  return {
    userId,
    name,
    total,
    byPhase,
    byRule,
    perMatch: perMatch.sort((a, b) => a.matchId.localeCompare(b.matchId))
  };
};
