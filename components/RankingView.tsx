import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GROUPS, TEAMS_DATA } from '../data/teams';
import { buildUserScoreSummary, PHASE_LABEL, PhaseKey } from '../services/scoring';
import { calculateGroupStandings, getAdvancedTeams } from '../services/simulator';
import { Match, Team } from '../types';
import './ranking-view.css';

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

interface RankingViewProps {
  profiles: Profile[];
  predictions: PredictionRow[];
  officialResults: Record<string, { a: number | null; b: number | null }>;
  loading: boolean;
}

type LegendRuleKey = 'exact' | 'winnerGoals' | 'loserGoals' | 'winnerOnly' | 'drawDiff' | 'indication';
type LegendMatrixPhaseKey = 'groups' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
type BaseLegendPhaseKey = PhaseKey;

const RANKING_PAGE_SIZE = 10;
const DETAIL_PAGE_SIZE = 12;

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

const LEGEND_PHASE_POINTS: Record<
  BaseLegendPhaseKey,
  { exact: number; winnerGoals: number; loserGoals: number; winnerOnly: number; drawDiff: number | null; indication: number | null }
> = {
  groups: { exact: 10, winnerGoals: 5, loserGoals: 5, winnerOnly: 3, drawDiff: 4, indication: null },
  r32: { exact: 15, winnerGoals: 10, loserGoals: 7, winnerOnly: 5, drawDiff: 8, indication: 3 },
  r16: { exact: 20, winnerGoals: 13, loserGoals: 10, winnerOnly: 8, drawDiff: null, indication: 5 },
  qf: { exact: 25, winnerGoals: 16, loserGoals: 13, winnerOnly: 11, drawDiff: null, indication: 10 },
  sf: { exact: 30, winnerGoals: 19, loserGoals: 16, winnerOnly: 14, drawDiff: null, indication: 10 },
  third: { exact: 35, winnerGoals: 22, loserGoals: 19, winnerOnly: 17, drawDiff: null, indication: 20 },
  final: { exact: 45, winnerGoals: 25, loserGoals: 22, winnerOnly: 20, drawDiff: null, indication: 30 }
};

const LEGEND_PHASE_COLUMNS: Array<{ key: LegendMatrixPhaseKey; label: string }> = [
  { key: 'groups', label: 'Fase de grupos' },
  { key: 'r32', label: 'Rodada de 32' },
  { key: 'r16', label: 'Rodada de 16' },
  { key: 'qf', label: 'Quartas' },
  { key: 'sf', label: 'Semis' },
  { key: 'third', label: '3º lugar' },
  { key: 'final', label: 'Final' }
];

const LEGEND_RULE_ROWS: Array<{ key: LegendRuleKey; label: string }> = [
  { key: 'exact', label: 'Resultado exato' },
  { key: 'winnerGoals', label: 'Vencedor + gols do vencedor' },
  { key: 'loserGoals', label: 'Vencedor + gols do perdedor' },
  { key: 'winnerOnly', label: 'Apenas vencedor' },
  { key: 'drawDiff', label: 'Empate diferente' },
  { key: 'indication', label: 'Indicacao correta / por pais' }
];

const teamById = new Map<string, Team>(TEAMS_DATA.map((team) => [team.id, team]));

const RankingView: React.FC<RankingViewProps> = ({ profiles, predictions, officialResults, loading }) => {
  const [search, setSearch] = useState('');
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [rankingPage, setRankingPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);

  const normalizeFlagCode = useCallback((iso2: string): string | null => {
    const normalized = iso2.toLowerCase();
    if (normalized.startsWith('gb-')) return 'gb';
    if (/^[a-z]{2}$/.test(normalized)) return normalized;
    if (normalized === 'eu' || normalized === 'un') return normalized;
    return null;
  }, []);

  const renderFlag = useCallback(
    (team: Team) => {
      const flagCode = normalizeFlagCode(team.iso2);
      if (flagCode) {
        return (
          <span className="detail-flag-wrap" aria-label={`Bandeira ${team.name}`}>
            <img
              src={`https://flagcdn.com/w20/${flagCode}.png`}
              srcSet={`https://flagcdn.com/w40/${flagCode}.png 2x`}
              alt={`Bandeira ${team.name}`}
              className="detail-flag-image"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'inline-flex';
              }}
            />
            <span className="detail-flag-fallback detail-flag-fallback-hidden" aria-hidden>
              {flagCode.toUpperCase()}
            </span>
          </span>
        );
      }
      return (
        <span className="detail-flag-fallback" aria-hidden>
          {team.iso2.toUpperCase().slice(0, 2)}
        </span>
      );
    },
    [normalizeFlagCode]
  );

  const formatLegendCell = useCallback((ruleKey: LegendRuleKey, phaseKey: LegendMatrixPhaseKey): string => {
    const value = LEGEND_PHASE_POINTS[phaseKey][ruleKey];
    return value === null ? '-' : String(value);
  }, []);

  const summaries = useMemo(() => {
    const grouped: Record<string, PredictionRow[]> = {};
    predictions.forEach((prediction) => {
      if (!grouped[prediction.user_id]) grouped[prediction.user_id] = [];
      grouped[prediction.user_id].push(prediction);
    });

    return profiles
      .map((profile) => {
        const userPredictions = grouped[profile.id] ?? [];
        const predictionMap: Record<string, { a: number | null; b: number | null }> = {};
        userPredictions.forEach((prediction) => {
          predictionMap[prediction.match_id] = { a: prediction.score_a, b: prediction.score_b };
        });
        return buildUserScoreSummary(profile.id, profile.full_name || 'Sem nome', predictionMap, officialResults);
      })
      .sort((a, b) => b.total - a.total);
  }, [profiles, predictions, officialResults]);

  const filteredSummaries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return summaries;
    return summaries.filter((summary) => summary.name.toLowerCase().includes(term));
  }, [search, summaries]);

  const rankingTotalPages = Math.max(1, Math.ceil(filteredSummaries.length / RANKING_PAGE_SIZE));

  useEffect(() => {
    setRankingPage((prev) => Math.max(1, Math.min(prev, rankingTotalPages)));
  }, [rankingTotalPages]);

  useEffect(() => {
    if (!activeUserId && summaries.length > 0) {
      setActiveUserId(summaries[0].userId);
    }
  }, [activeUserId, summaries]);

  const rankingStart = (rankingPage - 1) * RANKING_PAGE_SIZE;
  const rankingRows = filteredSummaries.slice(rankingStart, rankingStart + RANKING_PAGE_SIZE);

  const activeSummary = useMemo(() => {
    if (!activeUserId) return null;
    return summaries.find((summary) => summary.userId === activeUserId) ?? null;
  }, [activeUserId, summaries]);

  const officialGroupMatches = useMemo(() => {
    const matches: Match[] = [];
    GROUPS.forEach((group) => {
      const teamsInGroup = TEAMS_DATA.filter((team) => team.group === group);
      for (let i = 0; i < teamsInGroup.length; i += 1) {
        for (let j = i + 1; j < teamsInGroup.length; j += 1) {
          const id = `m-${group}-${i}-${j}`;
          const score = officialResults[id];
          matches.push({
            id,
            group,
            teamA: teamsInGroup[i].id,
            teamB: teamsInGroup[j].id,
            scoreA: score?.a ?? null,
            scoreB: score?.b ?? null
          });
        }
      }
    });
    return matches;
  }, [officialResults]);

  const officialGroupPlacements = useMemo(() => {
    const placements = new Map<string, string>();
    GROUPS.forEach((group) => {
      const teamsInGroup = TEAMS_DATA.filter((team) => team.group === group);
      const groupMatches = officialGroupMatches.filter((match) => match.group === group);
      const hasAnyOfficialScore = groupMatches.some(
        (match) => match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined
      );
      if (!hasAnyOfficialScore) return;
      const standings = calculateGroupStandings(teamsInGroup, groupMatches);
      const top3 = standings.slice(0, 3).map((standing) => standing.teamId);
      if (top3[0]) placements.set(`1${group}`, top3[0]);
      if (top3[1]) placements.set(`2${group}`, top3[1]);
      if (top3[2]) placements.set(`3${group}`, top3[2]);
    });
    return placements;
  }, [officialGroupMatches]);

  const officialAdvanced = useMemo(() => getAdvancedTeams(GROUPS, TEAMS_DATA, officialGroupMatches), [officialGroupMatches]);

  const resolveMatchToken = useCallback(
    (token: string, visited: Set<string>): Team | null => {
      if (visited.has(token)) return null;
      visited.add(token);

      const directTeam = teamById.get(token);
      if (directTeam) return directTeam;

      const groupMatch = token.match(/^([123])([A-L])$/);
      if (groupMatch) {
        const teamId = officialGroupPlacements.get(token);
        return teamId ? teamById.get(teamId) ?? null : null;
      }

      const thirdMatch = token.match(/^3rd-(\d+)-/i);
      if (thirdMatch) {
        const index = parseInt(thirdMatch[1], 10) - 1;
        return officialAdvanced.bestThirdPlaces[index] ?? null;
      }

      const wlMatch = token.match(/^([WL])(\d{2,3})$/i);
      if (wlMatch) {
        const mode = wlMatch[1].toUpperCase();
        const matchId = wlMatch[2];
        const slots = KNOCKOUT_SLOT_BY_MATCH[matchId];
        if (!slots) return null;
        const teamA = resolveMatchToken(slots.a, new Set(visited));
        const teamB = resolveMatchToken(slots.b, new Set(visited));
        const score = officialResults[matchId];
        const hasScore = score && score.a !== null && score.b !== null;
        if (!hasScore || !teamA || !teamB || score.a === score.b) return null;
        const winner = score.a > score.b ? teamA : teamB;
        const loser = score.a > score.b ? teamB : teamA;
        return mode === 'W' ? winner : loser;
      }

      return null;
    },
    [officialAdvanced.bestThirdPlaces, officialGroupPlacements, officialResults]
  );

  const resolveMatchupByMatchId = useCallback(
    (matchId: string): { a: Team; b: Team } | null => {
      let tokenA: string | null = null;
      let tokenB: string | null = null;

      const groupIdMatch = matchId.match(/^m-([A-L])-(\d)-(\d)$/);
      if (groupIdMatch) {
        const group = groupIdMatch[1];
        const i = parseInt(groupIdMatch[2], 10);
        const j = parseInt(groupIdMatch[3], 10);
        const teamsInGroup = TEAMS_DATA.filter((team) => team.group === group);
        tokenA = teamsInGroup[i]?.id ?? null;
        tokenB = teamsInGroup[j]?.id ?? null;
      } else {
        const knockoutSlot = KNOCKOUT_SLOT_BY_MATCH[matchId];
        if (knockoutSlot) {
          tokenA = knockoutSlot.a;
          tokenB = knockoutSlot.b;
        }
      }

      if (!tokenA || !tokenB) return null;
      const teamA = resolveMatchToken(tokenA, new Set());
      const teamB = resolveMatchToken(tokenB, new Set());
      if (!teamA || !teamB) return null;
      return { a: teamA, b: teamB };
    },
    [resolveMatchToken]
  );

  const detailRowsResolved = useMemo(() => {
    if (!activeSummary) return [];
    return activeSummary.perMatch
      .map((match) => {
        const matchup = resolveMatchupByMatchId(match.matchId);
        if (!matchup) return null;
        return { match, matchup };
      })
      .filter((item): item is { match: (typeof activeSummary.perMatch)[number]; matchup: { a: Team; b: Team } } => item !== null);
  }, [activeSummary, resolveMatchupByMatchId]);

  const detailTotalPages = Math.max(1, Math.ceil(detailRowsResolved.length / DETAIL_PAGE_SIZE));

  useEffect(() => {
    setDetailPage(1);
  }, [activeUserId]);

  useEffect(() => {
    setDetailPage((prev) => Math.max(1, Math.min(prev, detailTotalPages)));
  }, [detailTotalPages]);

  const detailStart = (detailPage - 1) * DETAIL_PAGE_SIZE;
  const detailRows = detailRowsResolved.slice(detailStart, detailStart + DETAIL_PAGE_SIZE);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">
        Carregando ranking...
      </div>
    );
  }

  if (!Object.keys(officialResults).length) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">
        Sem resultados oficiais. Assim que o admin inserir os jogos, o ranking aparece aqui.
      </div>
    );
  }

  return (
    <section className="ranking-wireframe max-w-[1600px] mx-auto px-4 py-8" data-testid="ranking-wireframe-layout">
      <header className="ranking-top-card">
        <div>
          <h2 className="ranking-title">Ranking Geral</h2>
        </div>
        <div className="ranking-top-controls">
          <div className="ranking-chip">Participantes: {summaries.length}</div>
          <label htmlFor="ranking-search" className="sr-only">
            Buscar jogador
          </label>
          <input
            id="ranking-search"
            data-testid="ranking-search-input"
            type="text"
            placeholder="Buscar por nome"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setRankingPage(1);
            }}
            className="ranking-search-input"
          />
        </div>
      </header>

      <div className="ranking-main-grid">
        <section className="ranking-panel ranking-panel-list">
          <div className="ranking-panel-header">
            <h3 className="ranking-panel-title">Ranking</h3>
            <span className="ranking-panel-meta">Nome e pontos totais</span>
          </div>

          <div className="ranking-table-head">
            <span>Nome</span>
            <span>PTS</span>
          </div>

          <div className="ranking-list-body" data-testid="ranking-list">
            {rankingRows.map((row) => (
              <button
                key={row.userId}
                type="button"
                data-testid="ranking-row"
                onClick={() => setActiveUserId(row.userId)}
                className={`ranking-list-row ${activeUserId === row.userId ? 'is-active' : ''}`}
              >
                <span className="ranking-user-name">{row.name}</span>
                <span className="ranking-user-points">{row.total}</span>
              </button>
            ))}
          </div>

          {filteredSummaries.length === 0 && (
            <div className="ranking-empty-state" data-testid="ranking-empty-search">
              Nenhum jogador encontrado para "{search}".
            </div>
          )}

          <div className="ranking-pagination" data-testid="ranking-pagination">
            <button
              type="button"
              data-testid="ranking-page-prev"
              className="ranking-page-btn"
              onClick={() => setRankingPage((prev) => Math.max(1, prev - 1))}
              disabled={rankingPage === 1 || filteredSummaries.length === 0}
            >
              Anterior
            </button>
            <span data-testid="ranking-page-indicator" className="ranking-page-indicator">
              Pagina {rankingPage} de {rankingTotalPages}
            </span>
            <button
              type="button"
              data-testid="ranking-page-next"
              className="ranking-page-btn"
              onClick={() => setRankingPage((prev) => Math.min(rankingTotalPages, prev + 1))}
              disabled={rankingPage >= rankingTotalPages || filteredSummaries.length === 0}
            >
              Proxima
            </button>
          </div>
        </section>

        <section className="ranking-panel ranking-panel-detail">
          <div className="ranking-panel-header">
            <h3 className="ranking-panel-title">Detalhe</h3>
            <span className="ranking-panel-meta">{activeSummary ? activeSummary.name : 'Selecione um jogador no ranking'}</span>
          </div>

          {!activeSummary && (
            <div className="ranking-empty-state" data-testid="detail-empty">
              Selecione um jogador no ranking para visualizar os detalhes.
            </div>
          )}

          {activeSummary && detailRows.length === 0 && (
            <div className="ranking-empty-state" data-testid="detail-empty-resolved">
              Ainda nao existem confrontos definidos para os jogos com resultado oficial.
            </div>
          )}

          {activeSummary && detailRows.length > 0 && (
            <>
              <div className="ranking-detail-scroll">
                <table className="ranking-detail-table" data-testid="detail-table">
                  <colgroup>
                    <col className="detail-col-phase" />
                    <col className="detail-col-team-a" />
                    <col className="detail-col-vs" />
                    <col className="detail-col-team-b" />
                    <col className="detail-col-official" />
                    <col className="detail-col-prediction" />
                    <col className="detail-col-rule" />
                    <col className="detail-col-points" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Fase</th>
                      <th colSpan={3} className="detail-center-col">Jogo</th>
                      <th className="detail-center-col">Res.Oficial</th>
                      <th className="detail-center-col">Palpite</th>
                      <th>Regra</th>
                      <th className="detail-center-col">PTS</th>
                    </tr>
                  </thead>
                  <tbody data-testid="detail-list">
                    {detailRows.map(({ match, matchup }) => (
                      <tr key={`${activeSummary.userId}-${match.matchId}`} data-testid="detail-row">
                        <td>{match.phaseLabel}</td>
                        <td className="detail-game-team-a-cell">
                          <span className="detail-team detail-team-a">
                            {renderFlag(matchup.a)}
                            <span className="detail-team-name">{matchup.a.name}</span>
                          </span>
                        </td>
                        <td className="detail-game-vs-cell" data-testid="detail-matchup">
                          <span className="detail-vs">vs</span>
                        </td>
                        <td className="detail-game-team-b-cell">
                          <span className="detail-team detail-team-b">
                            {renderFlag(matchup.b)}
                            <span className="detail-team-name">{matchup.b.name}</span>
                          </span>
                        </td>
                        <td className="detail-center-col">
                          {match.official.a} x {match.official.b}
                        </td>
                        <td className="detail-center-col">
                          {match.predicted?.a ?? '-'} x {match.predicted?.b ?? '-'}
                        </td>
                        <td>
                          {match.ruleApplied}
                          {match.indicationPoints > 0 ? ' + Indicacao' : ''}
                        </td>
                        <td className="detail-points-cell detail-center-col">{match.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ranking-pagination" data-testid="detail-pagination">
                <button
                  type="button"
                  data-testid="detail-page-prev"
                  className="ranking-page-btn"
                  onClick={() => setDetailPage((prev) => Math.max(1, prev - 1))}
                  disabled={detailPage === 1}
                >
                  Anterior
                </button>
                <span data-testid="detail-page-indicator" className="ranking-page-indicator">
                  Pagina {detailPage} de {detailTotalPages}
                </span>
                <button
                  type="button"
                  data-testid="detail-page-next"
                  className="ranking-page-btn"
                  onClick={() => setDetailPage((prev) => Math.min(detailTotalPages, prev + 1))}
                  disabled={detailPage >= detailTotalPages}
                >
                  Proxima
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="ranking-legend-panel" data-testid="ranking-legend">
        <div className="ranking-panel-header">
          <h3 className="ranking-panel-title">Regras e Pontos</h3>
          <span className="ranking-panel-meta">Matriz por regra e fase</span>
        </div>
        <div className="legend-table-wrap">
          <table className="legend-matrix" data-testid="legend-matrix">
            <thead>
              <tr>
                <th>Regra</th>
                {LEGEND_PHASE_COLUMNS.map((phase) => (
                  <th key={phase.key}>{phase.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEGEND_RULE_ROWS.map((rule) => (
                <tr key={rule.key} data-testid={`legend-row-${rule.key}`}>
                  <td>{rule.label}</td>
                  {LEGEND_PHASE_COLUMNS.map((phase) => (
                    <td key={`${rule.key}-${phase.key}`}>{formatLegendCell(rule.key, phase.key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};

export default RankingView;
