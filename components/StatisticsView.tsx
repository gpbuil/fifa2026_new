import React, { useEffect, useMemo, useState } from 'react';
import { GROUPS, TEAMS_DATA } from '../data/teams';
import { getThirdPlaceGroupForMatch } from '../data/thirdPlaceMatrix';
import { buildUserScoreSummary, PhaseKey } from '../services/scoring';
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

interface StatisticsViewProps {
  profiles: Profile[];
  predictions: PredictionRow[];
  officialResults: Record<string, { a: number | null; b: number | null }>;
  disciplineScores: DisciplineScores;
  fifaRanking: FifaRanking;
  loading: boolean;
}

const PHASE_OPTIONS: Array<{ value: PhaseKey | 'all'; label: string }> = [
  { value: 'all', label: 'Todas as fases' },
  { value: 'groups', label: 'Fase de grupos' },
  { value: 'r32', label: 'Rodada 32' },
  { value: 'r16', label: 'Rodada 16' },
  { value: 'qf', label: 'Quartas' },
  { value: 'sf', label: 'Semifinais' },
  { value: 'third', label: '3o lugar' },
  { value: 'final', label: 'Final' }
];

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

const formatScore = (score?: { a: number | null; b: number | null } | null): string => {
  if (!score || score.a === null || score.a === undefined || score.b === null || score.b === undefined) return '-';
  return `${score.a} x ${score.b}`;
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
  const found = PHASE_OPTIONS.find((option) => option.value === phase);
  return found?.label ?? phase;
};

const StatisticsView: React.FC<StatisticsViewProps> = ({
  profiles,
  predictions,
  officialResults,
  disciplineScores,
  fifaRanking,
  loading
}) => {
  const [phaseFilter, setPhaseFilter] = useState<PhaseKey | 'all'>('all');
  const [selectedMatchId, setSelectedMatchId] = useState('');

  const summaries = useMemo(() => {
    const grouped: Record<string, PredictionRow[]> = {};
    predictions.forEach((prediction) => {
      if (!grouped[prediction.user_id]) grouped[prediction.user_id] = [];
      grouped[prediction.user_id].push(prediction);
    });

    return profiles
      .map((profile) => {
        const predictionMap: Record<string, { a: number | null; b: number | null }> = {};
        (grouped[profile.id] ?? []).forEach((prediction) => {
          predictionMap[prediction.match_id] = { a: prediction.score_a, b: prediction.score_b };
        });
        return buildUserScoreSummary(profile.id, profile.full_name || 'Sem nome', predictionMap, officialResults, disciplineScores, fifaRanking);
      })
      .sort((a, b) => b.total - a.total);
  }, [disciplineScores, fifaRanking, officialResults, predictions, profiles]);

  const predictionMapsByUser = useMemo(() => {
    const maps = new Map<string, Record<string, { a: number | null; b: number | null }>>();
    predictions.forEach((prediction) => {
      if (!maps.has(prediction.user_id)) maps.set(prediction.user_id, {});
      maps.get(prediction.user_id)![prediction.match_id] = { a: prediction.score_a, b: prediction.score_b };
    });
    return maps;
  }, [predictions]);

  const resolveOfficialMatchup = useMemo(() => {
    const officialGroupMatches: Match[] = [];
    GROUPS.forEach((group) => {
      const groupTeams = TEAMS_DATA.filter((team) => team.group === group);
      for (let i = 0; i < groupTeams.length; i += 1) {
        for (let j = i + 1; j < groupTeams.length; j += 1) {
          const id = `m-${group}-${i}-${j}`;
          const score = officialResults[id];
          officialGroupMatches.push({
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
      const groupMatches = officialGroupMatches.filter((match) => match.group === group);
      const hasScore = groupMatches.some((match) => match.scoreA !== null && match.scoreB !== null);
      if (!hasScore) return;
      calculateGroupStandings(groupTeams, groupMatches, disciplineScores, fifaRanking)
        .slice(0, 3)
        .forEach((standing, index) => placements.set(`${index + 1}${group}`, standing.teamId));
    });

    const advanced = getAdvancedTeams(GROUPS, TEAMS_DATA, officialGroupMatches, disciplineScores, fifaRanking);
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

  const matchOptions = useMemo(() => {
    const officialEntries = Object.entries(officialResults) as Array<[string, { a: number | null; b: number | null }]>;
    return officialEntries
      .filter(([, score]) => score.a !== null && score.a !== undefined && score.b !== null && score.b !== undefined)
      .map(([matchId, score]) => {
        const matchup = resolveOfficialMatchup(matchId);
        if (!matchup) return null;
        const phase = getMatchPhase(matchId);
        return {
          matchId,
          phase,
          label: `${matchId.startsWith('m-') ? `Grupo ${matchId.split('-')[1]}` : `Jogo ${matchId}`} - ${matchup.a.name} x ${matchup.b.name}`,
          matchup,
          score
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => getMatchSortNumber(a.matchId) - getMatchSortNumber(b.matchId));
  }, [officialResults, resolveOfficialMatchup]);

  const filteredMatchOptions = useMemo(() => {
    return phaseFilter === 'all' ? matchOptions : matchOptions.filter((match) => match.phase === phaseFilter);
  }, [matchOptions, phaseFilter]);

  useEffect(() => {
    if (filteredMatchOptions.length === 0) {
      setSelectedMatchId('');
      return;
    }
    if (!filteredMatchOptions.some((match) => match.matchId === selectedMatchId)) {
      setSelectedMatchId(filteredMatchOptions[0].matchId);
    }
  }, [filteredMatchOptions, selectedMatchId]);

  const selectedMatch = matchOptions.find((match) => match.matchId === selectedMatchId) ?? filteredMatchOptions[0] ?? null;

  const selectedRows = useMemo(() => {
    if (!selectedMatch) return [];
    return summaries
      .map((summary) => {
        const detail = summary.perMatch.find((match) => match.matchId === selectedMatch.matchId);
        const prediction = predictionMapsByUser.get(summary.userId)?.[selectedMatch.matchId] ?? null;
        return {
          userId: summary.userId,
          name: summary.name,
          prediction,
          rule: detail?.ruleApplied ?? 'Sem resultado',
          resultPoints: detail?.resultPoints ?? 0,
          indicationPoints: detail?.indicationPoints ?? 0,
          totalPoints: detail?.totalPoints ?? 0
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  }, [predictionMapsByUser, selectedMatch, summaries]);

  const ruleStats = useMemo(() => {
    const counts = new Map<string, { rule: string; count: number; points: number }>();
    selectedRows.forEach((row) => {
      const current = counts.get(row.rule) ?? { rule: row.rule, count: 0, points: 0 };
      current.count += 1;
      current.points += row.totalPoints;
      counts.set(row.rule, current);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [selectedRows]);

  const predictionDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    selectedRows.forEach((row) => counts.set(formatScore(row.prediction), (counts.get(formatScore(row.prediction)) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.count - a.count || a.score.localeCompare(b.score));
  }, [selectedRows]);

  const specialRankings = useMemo(() => {
    const exact = summaries
      .map((summary) => ({
        name: summary.name,
        value: summary.perMatch.filter((match) => match.ruleApplied === 'Resultado exato').length
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5);

    const zeroes = summaries
      .map((summary) => ({
        name: summary.name,
        value: summary.perMatch.filter((match) => match.totalPoints === 0).length
      }))
      .sort((a, b) => a.value - b.value || a.name.localeCompare(b.name))
      .slice(0, 5);

    const averages = summaries
      .map((summary) => ({
        name: summary.name,
        value: summary.perMatch.length ? Number((summary.total / summary.perMatch.length).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5);

    return { exact, zeroes, averages };
  }, [summaries]);

  const totalDistributed = selectedRows.reduce((sum, row) => sum + row.totalPoints, 0);
  const exactCount = selectedRows.filter((row) => row.rule === 'Resultado exato').length;
  const positiveCount = selectedRows.filter((row) => row.totalPoints > 0).length;
  const mostCommonPrediction = predictionDistribution[0];
  const maxRuleCount = Math.max(1, ...ruleStats.map((stat) => stat.count));

  if (loading) {
    return <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando estatisticas...</div>;
  }

  return (
    <section className="ranking-wireframe stats-wireframe max-w-[1600px] mx-auto px-4 py-8" data-testid="statistics-layout">
      <header className="ranking-top-card stats-hero">
        <div>
          <p className="ranking-kicker">Leitura do bolao</p>
          <h2 className="ranking-title">Estatisticas</h2>
          <p className="ranking-subtitle">Veja onde cada jogador pontuou, quais regras mais apareceram e os palpites mais populares.</p>
        </div>
        <div className="stats-hero-metrics" aria-label="Resumo geral">
          <span>{profiles.length} jogadores</span>
          <span>{matchOptions.length} jogos com resultado</span>
        </div>
      </header>

      {matchOptions.length === 0 ? (
        <div className="ranking-browser-locked">Ainda nao existem resultados oficiais para montar as estatisticas.</div>
      ) : (
        <>
          <section className="ranking-panel stats-control-panel">
            <label className="stats-field">
              <span>Fase</span>
              <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value as PhaseKey | 'all')}>
                {PHASE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="stats-field stats-field-match">
              <span>Jogo</span>
              <select value={selectedMatch?.matchId ?? ''} onChange={(event) => setSelectedMatchId(event.target.value)}>
                {filteredMatchOptions.map((match) => (
                  <option key={match.matchId} value={match.matchId}>
                    {match.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {selectedMatch && (
            <>
              <section className="stats-match-card">
                <div>
                  <p className="ranking-kicker">{getPhaseLabel(selectedMatch.phase)}</p>
                  <h3>
                    {selectedMatch.matchup.a.name} <span>{formatScore(selectedMatch.score)}</span> {selectedMatch.matchup.b.name}
                  </h3>
                </div>
                <div className="stats-match-id">{selectedMatch.matchId.startsWith('m-') ? `Grupo ${selectedMatch.matchId.split('-')[1]}` : `Jogo ${selectedMatch.matchId}`}</div>
              </section>

              <section className="stats-summary-grid">
                <article className="stats-summary-card">
                  <span>Acertaram placar exato</span>
                  <strong>{exactCount}</strong>
                </article>
                <article className="stats-summary-card">
                  <span>Pontuaram no jogo</span>
                  <strong>{positiveCount}</strong>
                </article>
                <article className="stats-summary-card">
                  <span>Pontos distribuidos</span>
                  <strong>{totalDistributed}</strong>
                </article>
                <article className="stats-summary-card">
                  <span>Palpite mais comum</span>
                  <strong>{mostCommonPrediction ? `${mostCommonPrediction.score} (${mostCommonPrediction.count})` : '-'}</strong>
                </article>
              </section>

              <div className="stats-main-grid">
                <section className="ranking-panel">
                  <div className="ranking-panel-header">
                    <h3 className="ranking-panel-title">Regras acertadas</h3>
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
                    <h3 className="ranking-panel-title">Palpites populares</h3>
                    <span className="ranking-panel-meta">Top placares</span>
                  </div>
                  <ol className="stats-popular-list">
                    {predictionDistribution.slice(0, 6).map((item) => (
                      <li key={item.score}>
                        <span>{item.score}</span>
                        <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <section className="ranking-panel">
                <div className="ranking-panel-header">
                  <h3 className="ranking-panel-title">Jogadores no jogo</h3>
                  <span className="ranking-panel-meta">Palpite, regra e pontos</span>
                </div>
                <div className="stats-table-scroll">
                  <table className="stats-table" data-testid="statistics-match-table">
                    <thead>
                      <tr>
                        <th>Jogador</th>
                        <th>Palpite</th>
                        <th>Regra</th>
                        <th className="is-center">Resultado</th>
                        <th className="is-center">Indicacao</th>
                        <th className="is-center">Total</th>
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
                          <td className="is-center stats-total-cell">{row.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section className="stats-main-grid">
            <StatsRanking title="Mais placares exatos" rows={specialRankings.exact} suffix="exatos" />
            <StatsRanking title="Melhor media por jogo" rows={specialRankings.averages} suffix="pts/jogo" />
            <StatsRanking title="Menos jogos zerados" rows={specialRankings.zeroes} suffix="zeros" />
          </section>
        </>
      )}
    </section>
  );
};

const StatsRanking: React.FC<{ title: string; rows: Array<{ name: string; value: number }>; suffix: string }> = ({ title, rows, suffix }) => (
  <section className="ranking-panel stats-ranking-card">
    <div className="ranking-panel-header">
      <h3 className="ranking-panel-title">{title}</h3>
    </div>
    <ol className="stats-special-list">
      {rows.map((row, index) => (
        <li key={`${row.name}-${index}`}>
          <span className="stats-position">{index + 1}</span>
          <span className="stats-name">{row.name}</span>
          <strong>
            {row.value} <small>{suffix}</small>
          </strong>
        </li>
      ))}
    </ol>
  </section>
);

export default StatisticsView;
