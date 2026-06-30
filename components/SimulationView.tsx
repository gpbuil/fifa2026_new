import React, { useEffect, useMemo, useState } from 'react';
import { GROUPS, TEAMS_DATA } from '../data/teams';
import { getThirdPlaceGroupForMatch } from '../data/thirdPlaceMatrix';
import { buildUserScoreSummary, PhaseKey, UserScoreSummary } from '../services/scoring';
import { calculateGroupStandings, getAdvancedTeams } from '../services/simulator';
import { DisciplineScores, FifaRanking, Match, Team } from '../types';
import './ranking-view.css';
import './statistics-view.css';

interface Profile {
  id: string;
  full_name: string | null;
}

interface PredictionRow {
  user_id: string;
  match_id: string;
  score_a: number | null;
  score_b: number | null;
}

interface SimulationViewProps {
  profiles: Profile[];
  predictions: PredictionRow[];
  officialResults: Record<string, { a: number | null; b: number | null }>;
  disciplineScores: DisciplineScores;
  fifaRanking: FifaRanking;
  loading: boolean;
}

const KNOCKOUT_SLOT_BY_MATCH: Record<string, { a: string; b: string }> = {
  '73': { a: '2A', b: '2B' },
  '74': { a: '1E', b: '3rd-1-A/B/C/D/F' },
  '75': { a: '1F', b: '2C' },
  '76': { a: '1C', b: '2F' },
  '77': { a: '1I', b: '3rd-2-C/D/F/G/H' },
  '78': { a: '2E', b: '2I' },
  '79': { a: '1A', b: '3rd-3-C/E/F/H/I' },
  '80': { a: '1L', b: '3rd-4-E/H/I/J/K' },
  '81': { a: '1D', b: '3rd-5-B/E/F/I/J' },
  '82': { a: '1G', b: '3rd-6-A/E/H/I/J' },
  '83': { a: '2K', b: '2L' },
  '84': { a: '1H', b: '2J' },
  '85': { a: '1B', b: '3rd-7-E/F/G/I/J' },
  '86': { a: '1J', b: '2H' },
  '87': { a: '1K', b: '3rd-8-D/E/I/J/L' },
  '88': { a: '2D', b: '2G' },
  '89': { a: 'W74', b: 'W77' },
  '90': { a: 'W73', b: 'W75' },
  '91': { a: 'W76', b: 'W78' },
  '92': { a: 'W79', b: 'W80' },
  '93': { a: 'W83', b: 'W84' },
  '94': { a: 'W81', b: 'W82' },
  '95': { a: 'W86', b: 'W88' },
  '96': { a: 'W85', b: 'W87' },
  '97': { a: 'W89', b: 'W90' },
  '98': { a: 'W93', b: 'W94' },
  '99': { a: 'W91', b: 'W92' },
  '100': { a: 'W95', b: 'W96' },
  '101': { a: 'W97', b: 'W98' },
  '102': { a: 'W99', b: 'W100' },
  '103': { a: 'L101', b: 'L102' },
  '104': { a: 'W101', b: 'W102' }
};

const teamById = new Map<string, Team>(TEAMS_DATA.map((team) => [team.id, team]));

const getMatchSortNumber = (matchId: string): number => {
  const groupMatch = matchId.match(/^m-([A-L])-(\d)-(\d)$/);
  if (groupMatch) {
    const groupIndex = GROUPS.indexOf(groupMatch[1]);
    const pairKey = `${groupMatch[2]}-${groupMatch[3]}`;
    const pairOrder = ['0-1', '0-2', '0-3', '1-2', '1-3', '2-3'].indexOf(pairKey);
    return groupIndex * 6 + pairOrder + 1;
  }
  const number = Number(matchId);
  return Number.isNaN(number) ? Number.MAX_SAFE_INTEGER : number;
};

const getMatchPhase = (matchId: string): PhaseKey => {
  if (matchId.startsWith('m-')) return 'groups';
  const id = Number(matchId);
  if (id >= 73 && id <= 88) return 'r32';
  if (id >= 89 && id <= 96) return 'r16';
  if (id >= 97 && id <= 100) return 'qf';
  if (id >= 101 && id <= 102) return 'sf';
  if (id === 103) return 'third';
  return 'final';
};

const getPhaseLabel = (phase: PhaseKey): string => {
  const labels: Record<PhaseKey, string> = {
    groups: 'Fase de grupos',
    r32: 'Rodada 32',
    r16: 'Rodada 16',
    qf: 'Quartas',
    sf: 'Semifinais',
    third: '3o lugar',
    final: 'Final'
  };
  return labels[phase];
};

const formatScore = (score?: { a: number | null; b: number | null } | null): string => {
  if (!score || score.a === null || score.a === undefined || score.b === null || score.b === undefined) return '-';
  return `${score.a} x ${score.b}`;
};

const normalizePlayerName = (name: string | null | undefined): string => {
  const cleaned = (name || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Sem nome';
  const lowercaseWords = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return cleaned
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && lowercaseWords.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    })
    .join(' ');
};

const addPositions = (summaries: UserScoreSummary[]) => {
  let currentPosition = 0;
  let previousTotal: number | null = null;
  return summaries.map((summary, index) => {
    if (previousTotal === null || summary.total !== previousTotal) {
      currentPosition = index + 1;
      previousTotal = summary.total;
    }
    return { ...summary, position: currentPosition };
  });
};

const SimulationView: React.FC<SimulationViewProps> = ({
  profiles,
  predictions,
  officialResults,
  disciplineScores,
  fifaRanking,
  loading
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  const predictionMapsByUser = useMemo(() => {
    const maps = new Map<string, Record<string, { a: number | null; b: number | null }>>();
    predictions.forEach((prediction) => {
      if (!maps.has(prediction.user_id)) maps.set(prediction.user_id, {});
      maps.get(prediction.user_id)![prediction.match_id] = { a: prediction.score_a, b: prediction.score_b };
    });
    return maps;
  }, [predictions]);

  const resolveMatchup = useMemo(() => {
    const groupMatches: Match[] = [];
    GROUPS.forEach((group) => {
      const groupTeams = TEAMS_DATA.filter((team) => team.group === group);
      for (let i = 0; i < groupTeams.length; i += 1) {
        for (let j = i + 1; j < groupTeams.length; j += 1) {
          const id = `m-${group}-${i}-${j}`;
          const score = officialResults[id];
          groupMatches.push({
            id,
            group,
            teamA: groupTeams[i].id,
            teamB: groupTeams[j].id,
            scoreA: score?.a ?? null,
            scoreB: score?.b ?? null
          });
        }
      }
    });

    const placements = new Map<string, string>();
    GROUPS.forEach((group) => {
      const groupTeams = TEAMS_DATA.filter((team) => team.group === group);
      const matches = groupMatches.filter((match) => match.group === group);
      const hasAnyScore = matches.some((match) => match.scoreA !== null && match.scoreB !== null);
      if (!hasAnyScore) return;
      calculateGroupStandings(groupTeams, matches, disciplineScores, fifaRanking)
        .slice(0, 3)
        .forEach((standing, index) => placements.set(`${index + 1}${group}`, standing.teamId));
    });

    const advanced = getAdvancedTeams(GROUPS, TEAMS_DATA, groupMatches, disciplineScores, fifaRanking);
    const thirdGroups = advanced.bestThirdPlaces.map((team) => team.group);

    const resolveToken = (token: string, sourceMatchId: string, visited = new Set<string>()): Team | null => {
      if (visited.has(token)) return null;
      visited.add(token);
      const direct = teamById.get(token);
      if (direct) return direct;

      if (/^[123][A-L]$/.test(token)) {
        const teamId = placements.get(token);
        return teamId ? teamById.get(teamId) ?? null : null;
      }

      if (token.startsWith('3rd-')) {
        const group = getThirdPlaceGroupForMatch(sourceMatchId, thirdGroups);
        const teamId = group ? placements.get(`3${group}`) : null;
        return teamId ? teamById.get(teamId) ?? null : null;
      }

      const source = token.match(/^([WL])(\d{2,3})$/);
      if (!source) return null;
      const [, mode, matchId] = source;
      const slots = KNOCKOUT_SLOT_BY_MATCH[matchId];
      const score = officialResults[matchId];
      if (!slots || !score || score.a === null || score.b === null || score.a === score.b) return null;
      const teamA = resolveToken(slots.a, matchId, new Set(visited));
      const teamB = resolveToken(slots.b, matchId, new Set(visited));
      if (!teamA || !teamB) return null;
      const winner = score.a > score.b ? teamA : teamB;
      const loser = score.a > score.b ? teamB : teamA;
      return mode === 'W' ? winner : loser;
    };

    return (matchId: string): { a: Team; b: Team } | null => {
      const groupMatch = matchId.match(/^m-([A-L])-(\d)-(\d)$/);
      if (groupMatch) {
        const teams = TEAMS_DATA.filter((team) => team.group === groupMatch[1]);
        const teamA = teams[Number(groupMatch[2])];
        const teamB = teams[Number(groupMatch[3])];
        return teamA && teamB ? { a: teamA, b: teamB } : null;
      }

      const slots = KNOCKOUT_SLOT_BY_MATCH[matchId];
      if (!slots) return null;
      const teamA = resolveToken(slots.a, matchId);
      const teamB = resolveToken(slots.b, matchId);
      return teamA && teamB ? { a: teamA, b: teamB } : null;
    };
  }, [disciplineScores, fifaRanking, officialResults]);

  const pendingMatchOptions = useMemo(() => {
    const groupIds: string[] = [];
    GROUPS.forEach((group) => {
      const teams = TEAMS_DATA.filter((team) => team.group === group);
      for (let i = 0; i < teams.length; i += 1) {
        for (let j = i + 1; j < teams.length; j += 1) {
          groupIds.push(`m-${group}-${i}-${j}`);
        }
      }
    });

    const allIds = [...groupIds, ...Object.keys(KNOCKOUT_SLOT_BY_MATCH).sort((a, b) => Number(a) - Number(b))];
    return allIds
      .filter((matchId) => {
        const official = officialResults[matchId];
        return !official || official.a === null || official.a === undefined || official.b === null || official.b === undefined;
      })
      .map((matchId) => {
        const matchup = resolveMatchup(matchId);
        if (!matchup) return null;
        return {
          matchId,
          phase: getMatchPhase(matchId),
          label: `${matchId.startsWith('m-') ? `Grupo ${matchId.split('-')[1]}` : `Jogo ${matchId}`} - ${matchup.a.name} x ${matchup.b.name}`,
          matchup
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => getMatchSortNumber(a.matchId) - getMatchSortNumber(b.matchId));
  }, [officialResults, resolveMatchup]);

  useEffect(() => {
    if (pendingMatchOptions.length === 0) {
      setSelectedMatchId('');
      return;
    }
    if (!pendingMatchOptions.some((match) => match.matchId === selectedMatchId)) {
      setSelectedMatchId(pendingMatchOptions[0].matchId);
    }
  }, [pendingMatchOptions, selectedMatchId]);

  const selectedMatch = pendingMatchOptions.find((match) => match.matchId === selectedMatchId) ?? pendingMatchOptions[0] ?? null;
  const parsedScoreA = scoreA.trim() === '' ? null : Number(scoreA);
  const parsedScoreB = scoreB.trim() === '' ? null : Number(scoreB);
  const hasValidScore = Number.isInteger(parsedScoreA) && Number.isInteger(parsedScoreB) && parsedScoreA !== null && parsedScoreB !== null && parsedScoreA >= 0 && parsedScoreB >= 0;
  const isKnockoutDraw = !!selectedMatch && selectedMatch.phase !== 'groups' && hasValidScore && parsedScoreA === parsedScoreB;
  const canSimulate = !!selectedMatch && hasValidScore && !isKnockoutDraw;

  const simulatedOfficialResults = useMemo(() => {
    if (!canSimulate || !selectedMatch || parsedScoreA === null || parsedScoreB === null) return officialResults;
    return {
      ...officialResults,
      [selectedMatch.matchId]: { a: parsedScoreA, b: parsedScoreB }
    };
  }, [canSimulate, officialResults, parsedScoreA, parsedScoreB, selectedMatch]);

  const buildSummaries = (officialMap: Record<string, { a: number | null; b: number | null }>) => {
    const sorted = profiles
      .map((profile) => {
        const predictionMap = predictionMapsByUser.get(profile.id) ?? {};
        return buildUserScoreSummary(profile.id, normalizePlayerName(profile.full_name), predictionMap, officialMap, disciplineScores, fifaRanking);
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return addPositions(sorted);
  };

  const currentSummaries = useMemo(() => buildSummaries(officialResults), [disciplineScores, fifaRanking, officialResults, predictionMapsByUser, profiles]);
  const simulatedSummaries = useMemo(() => buildSummaries(simulatedOfficialResults), [disciplineScores, fifaRanking, simulatedOfficialResults, predictionMapsByUser, profiles]);
  const currentSummaryByUser = useMemo(() => new Map(currentSummaries.map((summary) => [summary.userId, summary])), [currentSummaries]);

  const selectedRows = useMemo(() => {
    if (!selectedMatch || !canSimulate) return [];
    return simulatedSummaries
      .map((summary) => {
        const before = currentSummaryByUser.get(summary.userId);
        const detail = summary.perMatch.find((match) => match.matchId === selectedMatch.matchId);
        const prediction = predictionMapsByUser.get(summary.userId)?.[selectedMatch.matchId] ?? null;
        return {
          userId: summary.userId,
          name: summary.name,
          prediction,
          rule: detail?.ruleApplied ?? 'Sem pontuacao',
          resultPoints: detail?.resultPoints ?? 0,
          indicationPoints: detail?.indicationPoints ?? 0,
          totalPoints: detail?.totalPoints ?? 0,
          totalBefore: before?.total ?? 0,
          totalAfter: summary.total,
          delta: summary.total - (before?.total ?? 0),
          positionBefore: before?.position ?? 0,
          positionAfter: summary.position
        };
      })
      .sort((a, b) => b.delta - a.delta || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  }, [canSimulate, currentSummaryByUser, predictionMapsByUser, selectedMatch, simulatedSummaries]);

  const ruleStats = useMemo(() => {
    const counts = new Map<string, number>();
    selectedRows.forEach((row) => counts.set(row.rule, (counts.get(row.rule) ?? 0) + 1));
    return Array.from(counts.entries()).map(([rule, count]) => ({ rule, count })).sort((a, b) => b.count - a.count);
  }, [selectedRows]);

  const rankingImpactRows = selectedRows.filter((row) => row.delta > 0).slice(0, 10);
  const totalDistributed = selectedRows.reduce((sum, row) => sum + row.delta, 0);
  const exactCount = selectedRows.filter((row) => row.rule === 'Resultado exato').length;
  const positiveCount = selectedRows.filter((row) => row.delta > 0).length;
  const maxRuleCount = Math.max(1, ...ruleStats.map((stat) => stat.count));

  if (loading) {
    return <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando simulador...</div>;
  }

  return (
    <section className="ranking-wireframe stats-wireframe simulation-wireframe max-w-[1600px] mx-auto px-4 py-8" data-testid="simulation-layout">
      <header className="ranking-top-card stats-hero simulation-hero">
        <div>
          <p className="ranking-kicker">Cenario hipotetico</p>
          <h2 className="ranking-title">Simulador</h2>
          <p className="ranking-subtitle">Teste um placar ainda nao oficial e veja quem pontuaria, quais regras seriam acionadas e como o ranking mudaria.</p>
        </div>
        <div className="stats-hero-metrics" aria-label="Resumo do simulador">
          <span>Nada e salvo</span>
          <span>{pendingMatchOptions.length} jogos disponiveis</span>
        </div>
      </header>

      {pendingMatchOptions.length === 0 ? (
        <div className="ranking-browser-locked">Nao ha jogos pendentes com confronto definido para simular.</div>
      ) : (
        <>
          <section className="ranking-panel stats-control-panel simulation-control-panel">
            <label className="stats-field stats-field-match">
              <span>Jogo</span>
              <select value={selectedMatch?.matchId ?? ''} onChange={(event) => setSelectedMatchId(event.target.value)}>
                {pendingMatchOptions.map((match) => (
                  <option key={match.matchId} value={match.matchId}>
                    {match.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="simulation-score-box">
              <label>
                <span>{selectedMatch?.matchup.a.name ?? 'Time A'}</span>
                <input type="number" min="0" inputMode="numeric" value={scoreA} onChange={(event) => setScoreA(event.target.value)} placeholder="-" />
              </label>
              <strong>x</strong>
              <label>
                <span>{selectedMatch?.matchup.b.name ?? 'Time B'}</span>
                <input type="number" min="0" inputMode="numeric" value={scoreB} onChange={(event) => setScoreB(event.target.value)} placeholder="-" />
              </label>
            </div>
          </section>

          {isKnockoutDraw && (
            <div className="simulation-warning">No mata-mata, o placar valido do bolao precisa ter um vencedor.</div>
          )}

          {selectedMatch && (
            <section className="stats-match-card simulation-match-card">
              <div>
                <p className="ranking-kicker">{getPhaseLabel(selectedMatch.phase)}</p>
                <h3>
                  {selectedMatch.matchup.a.name} <span>{canSimulate ? `${parsedScoreA} x ${parsedScoreB}` : '- x -'}</span> {selectedMatch.matchup.b.name}
                </h3>
              </div>
              <div className="stats-match-id">{selectedMatch.matchId.startsWith('m-') ? `Grupo ${selectedMatch.matchId.split('-')[1]}` : `Jogo ${selectedMatch.matchId}`}</div>
            </section>
          )}

          <section className="stats-summary-grid">
            <article className="stats-summary-card">
              <span>Jogadores que pontuariam</span>
              <strong>{canSimulate ? positiveCount : '-'}</strong>
            </article>
            <article className="stats-summary-card">
              <span>Placares exatos</span>
              <strong>{canSimulate ? exactCount : '-'}</strong>
            </article>
            <article className="stats-summary-card">
              <span>Pontos simulados</span>
              <strong>{canSimulate ? totalDistributed : '-'}</strong>
            </article>
            <article className="stats-summary-card">
              <span>Maior ganho</span>
              <strong>{canSimulate && rankingImpactRows[0] ? `+${rankingImpactRows[0].delta}` : '-'}</strong>
            </article>
          </section>

          {canSimulate ? (
            <>
              <div className="stats-main-grid">
                <section className="ranking-panel">
                  <div className="ranking-panel-header">
                    <h3 className="ranking-panel-title">Regras simuladas</h3>
                    <span className="ranking-panel-meta">Distribuicao por jogador</span>
                  </div>
                  <div className="stats-bars">
                    {ruleStats.map((stat) => (
                      <div key={stat.rule} className="stats-bar-row">
                        <div className="stats-bar-label">
                          <span>{stat.rule}</span>
                          <strong>{stat.count}</strong>
                        </div>
                        <div className="stats-bar-track">
                          <span style={{ width: `${Math.max(6, (stat.count / maxRuleCount) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="ranking-panel">
                  <div className="ranking-panel-header">
                    <h3 className="ranking-panel-title">Impacto no ranking</h3>
                    <span className="ranking-panel-meta">Maiores ganhos</span>
                  </div>
                  <ol className="stats-special-list">
                    {rankingImpactRows.map((row) => (
                      <li key={row.userId}>
                        <span className="stats-position">{row.positionAfter}o</span>
                        <span className="stats-name">{row.name}</span>
                        <strong>+{row.delta}</strong>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <section className="ranking-panel">
                <div className="ranking-panel-header">
                  <h3 className="ranking-panel-title">Resultado da simulacao</h3>
                  <span className="ranking-panel-meta">Palpite, regra, pontos e ranking</span>
                </div>
                <div className="stats-table-scroll">
                  <table className="stats-table simulation-table" data-testid="simulation-table">
                    <thead>
                      <tr>
                        <th>Jogador</th>
                        <th>Palpite</th>
                        <th>Regra</th>
                        <th className="is-center">Jogo</th>
                        <th className="is-center">Indicacao</th>
                        <th className="is-center">Ganho</th>
                        <th className="is-center">Ranking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.map((row) => (
                        <tr key={row.userId}>
                          <td>{row.name}</td>
                          <td>{formatScore(row.prediction)}</td>
                          <td>{row.rule}</td>
                          <td className="is-center">{row.resultPoints}</td>
                          <td className="is-center">{row.indicationPoints}</td>
                          <td className="is-center stats-total-cell">+{row.delta}</td>
                          <td className="is-center">
                            {row.positionBefore}o {'->'} {row.positionAfter}o
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="ranking-browser-locked simulation-empty">Digite um placar valido para ver a simulacao.</div>
          )}
        </>
      )}
    </section>
  );
};

export default SimulationView;
