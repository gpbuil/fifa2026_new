import React, { useEffect, useMemo, useState } from 'react';
import { GROUPS, TEAMS_DATA } from '../data/teams';
import { getThirdPlaceGroupForMatch } from '../data/thirdPlaceMatrix';
import { calculateGroupStandings, getAdvancedTeams } from '../services/simulator';
import { DisciplineScores, FifaRanking, Match, Team } from '../types';
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

interface PlayerPredictionsViewProps {
  profiles: Profile[];
  predictions: PredictionRow[];
  disciplineScores: DisciplineScores;
  fifaRanking: FifaRanking;
  loading: boolean;
  currentUserId: string | null;
}

const KNOCKOUT_SLOT_BY_MATCH: Record<string, { a: string; b: string }> = {
  '73': { a: '2A', b: '2B' }, '74': { a: '1E', b: '3rd-1-A/B/C/D/F' },
  '75': { a: '1F', b: '2C' }, '76': { a: '1C', b: '2F' },
  '77': { a: '1I', b: '3rd-2-C/D/F/G/H' }, '78': { a: '2E', b: '2I' },
  '79': { a: '1A', b: '3rd-3-C/E/F/H/I' }, '80': { a: '1L', b: '3rd-4-E/H/I/J/K' },
  '81': { a: '1D', b: '3rd-5-B/E/F/I/J' }, '82': { a: '1G', b: '3rd-6-A/E/H/I/J' },
  '83': { a: '2K', b: '2L' }, '84': { a: '1H', b: '2J' },
  '85': { a: '1B', b: '3rd-7-E/F/G/I/J' }, '86': { a: '1J', b: '2H' },
  '87': { a: '1K', b: '3rd-8-D/E/I/J/L' }, '88': { a: '2D', b: '2G' },
  '89': { a: 'W74', b: 'W77' }, '90': { a: 'W73', b: 'W75' },
  '91': { a: 'W76', b: 'W78' }, '92': { a: 'W79', b: 'W80' },
  '93': { a: 'W83', b: 'W84' }, '94': { a: 'W81', b: 'W82' },
  '95': { a: 'W86', b: 'W88' }, '96': { a: 'W85', b: 'W87' },
  '97': { a: 'W89', b: 'W90' }, '98': { a: 'W93', b: 'W94' },
  '99': { a: 'W91', b: 'W92' }, '100': { a: 'W95', b: 'W96' },
  '101': { a: 'W97', b: 'W98' }, '102': { a: 'W99', b: 'W100' },
  '103': { a: 'L101', b: 'L102' }, '104': { a: 'W101', b: 'W102' }
};

const teamById = new Map<string, Team>(TEAMS_DATA.map((team) => [team.id, team]));
const teamByName = new Map<string, Team>(TEAMS_DATA.map((team) => [team.name, team]));

const PrintTeam: React.FC<{ name: string }> = ({ name }) => {
  const team = teamByName.get(name);
  return (
    <span className="print-team">
      {team && <img src={`https://flagcdn.com/w20/${team.iso2.toLowerCase()}.png`} alt="" />}
      <span>{name}</span>
    </span>
  );
};

const buildPrintablePlayerData = (
  scores: Record<string, { a: number | null; b: number | null }>,
  disciplineScores: DisciplineScores,
  fifaRanking: FifaRanking
) => {
  const groupMatches: Match[] = [];
  const thirdPlaces: Array<{ team: Team; group: string; points: number; gd: number; gf: number }> = [];

  GROUPS.forEach((group) => {
    const teams = TEAMS_DATA.filter((team) => team.group === group);
    const matches: Match[] = [];
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = i + 1; j < teams.length; j += 1) {
        const id = `m-${group}-${i}-${j}`;
        const score = scores[id];
        const match = { id, group, teamA: teams[i].id, teamB: teams[j].id, scoreA: score?.a ?? null, scoreB: score?.b ?? null };
        matches.push(match);
        groupMatches.push(match);
      }
    }
    const third = calculateGroupStandings(teams, matches, disciplineScores, fifaRanking)[2];
    const thirdTeam = third ? teamById.get(third.teamId) : null;
    if (thirdTeam) thirdPlaces.push({ team: thirdTeam, group, points: third.points, gd: third.goalsDifference, gf: third.goalsFor });
  });

  const placements = new Map<string, string>();
  GROUPS.forEach((group) => {
    const teams = TEAMS_DATA.filter((team) => team.group === group);
    const matches = groupMatches.filter((match) => match.group === group);
    calculateGroupStandings(teams, matches, disciplineScores, fifaRanking)
      .slice(0, 3)
      .forEach((standing, index) => placements.set(`${index + 1}${group}`, standing.teamId));
  });

  const advanced = getAdvancedTeams(GROUPS, TEAMS_DATA, groupMatches, disciplineScores, fifaRanking);
  const qualifiedIds = new Set(advanced.bestThirdPlaces.map((team) => team.id));
  const thirdGroups = advanced.bestThirdPlaces.map((team) => team.group);
  const resolved = new Map<string, { a: Team | null; b: Team | null }>();

  const resolveMatch = (matchId: string, visited = new Set<string>()): { a: Team | null; b: Team | null } => {
    const cached = resolved.get(matchId);
    if (cached) return cached;
    const slots = KNOCKOUT_SLOT_BY_MATCH[matchId];
    const matchup = slots
      ? { a: resolveToken(slots.a, matchId, new Set(visited)), b: resolveToken(slots.b, matchId, new Set(visited)) }
      : { a: null, b: null };
    resolved.set(matchId, matchup);
    return matchup;
  };

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
    const [, mode, sourceId] = source;
    const matchup = resolveMatch(sourceId, new Set(visited));
    const score = scores[sourceId];
    if (!matchup.a || !matchup.b || score?.a == null || score?.b == null || score.a === score.b) return null;
    const winner = score.a > score.b ? matchup.a : matchup.b;
    const loser = score.a > score.b ? matchup.b : matchup.a;
    return mode === 'W' ? winner : loser;
  };

  const groupRows = groupMatches.map((match) => ({
    id: match.id,
    group: match.group,
    teamA: teamById.get(match.teamA)?.name ?? match.teamA,
    teamB: teamById.get(match.teamB)?.name ?? match.teamB,
    score: scores[match.id]
  }));
  const knockoutRows = Object.keys(KNOCKOUT_SLOT_BY_MATCH).sort((a, b) => Number(a) - Number(b)).map((id) => {
    const matchup = resolveMatch(id);
    const slots = KNOCKOUT_SLOT_BY_MATCH[id];
    return { id, teamA: matchup.a?.name ?? slots.a, teamB: matchup.b?.name ?? slots.b, score: scores[id] };
  });
  const thirds = thirdPlaces
    .sort((a, b) => {
      const tableCompare = b.points - a.points || b.gd - a.gd || b.gf - a.gf;
      if (tableCompare !== 0) return tableCompare;
      const disciplineCompare = (disciplineScores[b.team.id] ?? Number.NEGATIVE_INFINITY) - (disciplineScores[a.team.id] ?? Number.NEGATIVE_INFINITY);
      if (disciplineCompare !== 0) return disciplineCompare;
      return (fifaRanking[a.team.id] ?? Number.POSITIVE_INFINITY) - (fifaRanking[b.team.id] ?? Number.POSITIVE_INFINITY);
    })
    .map((row, index) => ({ ...row, position: index + 1, qualified: qualifiedIds.has(row.team.id) }));

  return { groupRows, knockoutRows, thirds };
};

const PrintablePlayerPages: React.FC<{
  name: string;
  scores: Record<string, { a: number | null; b: number | null }>;
  disciplineScores: DisciplineScores;
  fifaRanking: FifaRanking;
  isLast?: boolean;
}> = ({ name, scores, disciplineScores, fifaRanking, isLast = false }) => {
  const data = buildPrintablePlayerData(scores, disciplineScores, fifaRanking);
  return (
    <>
      <article className="print-page">
        <header className="print-header">
          <img src="/logobolao.png" alt="Bolao da Copa do Manduca" />
          <div><div className="print-kicker">Bolao da Copa do Manduca</div><h1>Palpites de {name}</h1><p>Fase de grupos e melhores terceiros</p></div>
          <div className="print-page-number">01 / 02</div>
        </header>
        <div className="print-groups-grid">
          {GROUPS.map((group) => <section key={group} className="print-group">
            <h2>Grupo {group}</h2>
            {data.groupRows.filter((row) => row.group === group).map((row) => <div key={row.id} className="print-match">
              <PrintTeam name={row.teamA} /><strong>{row.score?.a ?? '-'} x {row.score?.b ?? '-'}</strong><PrintTeam name={row.teamB} />
            </div>)}
          </section>)}
        </div>
        <section className="print-thirds"><h2>Melhores terceiros <span>Top 8 avancam</span></h2><div className="print-thirds-grid">
          {data.thirds.map((row) => <div key={row.team.id} className={row.qualified ? 'is-qualified' : ''}>
            <span>{row.position}</span><PrintTeam name={row.team.name} /><b>G{row.group}</b><b>{row.points} pts</b><small>SG {row.gd} / GT {row.gf}</small>
          </div>)}
        </div></section>
      </article>
      <article className={`print-page ${isLast ? 'print-page-last' : ''}`}>
        <header className="print-header">
          <img src="/logobolao.png" alt="Bolao da Copa do Manduca" />
          <div><div className="print-kicker">Bolao da Copa do Manduca</div><h1>Palpites de {name}</h1><p>Mata-mata completo</p></div>
          <div className="print-page-number">02 / 02</div>
        </header>
        <div className="print-knockout-grid">
          {[{ title: 'Rodada de 32', from: 73, to: 88 }, { title: 'Oitavas de final', from: 89, to: 96 }, { title: 'Quartas de final', from: 97, to: 100 }, { title: 'Semifinais e finais', from: 101, to: 104 }].map((round) =>
            <section key={round.title} className="print-round"><h2>{round.title}</h2>
              {data.knockoutRows.filter((row) => Number(row.id) >= round.from && Number(row.id) <= round.to).map((row) =>
                <div key={row.id} className="print-ko-match"><span className="print-ko-id">{row.id}</span><PrintTeam name={row.teamA} /><strong>{row.score?.a ?? '-'} x {row.score?.b ?? '-'}</strong><PrintTeam name={row.teamB} /></div>
              )}
            </section>
          )}
        </div>
      </article>
    </>
  );
};

const PlayerPredictionsView: React.FC<PlayerPredictionsViewProps> = ({
  profiles,
  predictions,
  disciplineScores,
  fifaRanking,
  loading,
  currentUserId
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [stage, setStage] = useState<'groups' | 'knockout'>('groups');
  const [groupFilter, setGroupFilter] = useState('all');
  const [compareWithMine, setCompareWithMine] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')),
    [profiles]
  );

  useEffect(() => {
    if (!selectedUserId && sortedProfiles.length > 0) setSelectedUserId(sortedProfiles[0].id);
  }, [selectedUserId, sortedProfiles]);

  useEffect(() => {
    const finishPrinting = () => setPrintingAll(false);
    window.addEventListener('afterprint', finishPrinting);
    return () => window.removeEventListener('afterprint', finishPrinting);
  }, []);

  const predictionMaps = useMemo(() => {
    const maps = new Map<string, Record<string, { a: number | null; b: number | null }>>();
    predictions.forEach((prediction) => {
      if (!maps.has(prediction.user_id)) maps.set(prediction.user_id, {});
      maps.get(prediction.user_id)![prediction.match_id] = { a: prediction.score_a, b: prediction.score_b };
    });
    return maps;
  }, [predictions]);

  const rows = useMemo(() => {
    if (!selectedUserId) return [];
    const selectedScores = predictionMaps.get(selectedUserId) ?? {};
    const myScores = currentUserId ? predictionMaps.get(currentUserId) ?? {} : {};

    const buildRows = (scores: Record<string, { a: number | null; b: number | null }>) => {
      const groupMatches: Match[] = [];
      GROUPS.forEach((group) => {
        const teams = TEAMS_DATA.filter((team) => team.group === group);
        for (let i = 0; i < teams.length; i += 1) {
          for (let j = i + 1; j < teams.length; j += 1) {
            const id = `m-${group}-${i}-${j}`;
            const score = scores[id];
            groupMatches.push({ id, group, teamA: teams[i].id, teamB: teams[j].id, scoreA: score?.a ?? null, scoreB: score?.b ?? null });
          }
        }
      });

      const placements = new Map<string, string>();
      GROUPS.forEach((group) => {
        const teams = TEAMS_DATA.filter((team) => team.group === group);
        const matches = groupMatches.filter((match) => match.group === group);
        calculateGroupStandings(teams, matches, disciplineScores, fifaRanking)
          .slice(0, 3)
          .forEach((standing, index) => placements.set(`${index + 1}${group}`, standing.teamId));
      });

      const thirdGroups = getAdvancedTeams(GROUPS, TEAMS_DATA, groupMatches, disciplineScores, fifaRanking)
        .bestThirdPlaces.map((team) => team.group);
      const resolved = new Map<string, { a: Team | null; b: Team | null }>();

      const resolveMatch = (matchId: string, visited = new Set<string>()): { a: Team | null; b: Team | null } => {
        const cached = resolved.get(matchId);
        if (cached) return cached;
        const slots = KNOCKOUT_SLOT_BY_MATCH[matchId];
        const matchup = slots
          ? { a: resolveToken(slots.a, matchId, new Set(visited)), b: resolveToken(slots.b, matchId, new Set(visited)) }
          : { a: null, b: null };
        resolved.set(matchId, matchup);
        return matchup;
      };

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
        const [, mode, sourceId] = source;
        const matchup = resolveMatch(sourceId, new Set(visited));
        const score = scores[sourceId];
        if (!matchup.a || !matchup.b || score?.a == null || score?.b == null || score.a === score.b) return null;
        const winner = score.a > score.b ? matchup.a : matchup.b;
        const loser = score.a > score.b ? matchup.b : matchup.a;
        return mode === 'W' ? winner : loser;
      };

      const groupRows = groupMatches.map((match) => ({
        id: match.id, stage: 'groups' as const, group: match.group, label: `Grupo ${match.group}`,
        teamA: teamById.get(match.teamA)?.name ?? match.teamA,
        teamB: teamById.get(match.teamB)?.name ?? match.teamB,
        score: scores[match.id]
      }));
      const knockoutRows = Object.keys(KNOCKOUT_SLOT_BY_MATCH).sort((a, b) => Number(a) - Number(b)).map((id) => {
        const matchup = resolveMatch(id);
        const slots = KNOCKOUT_SLOT_BY_MATCH[id];
        return {
          id, stage: 'knockout' as const, group: 'KO', label: `Jogo ${id}`,
          teamA: matchup.a?.name ?? slots.a, teamB: matchup.b?.name ?? slots.b, score: scores[id]
        };
      });
      return [...groupRows, ...knockoutRows];
    };

    const mineById = new Map(buildRows(myScores).map((row) => [row.id, row]));
    return buildRows(selectedScores).map((row) => {
      const mine = mineById.get(row.id);
      return { ...row, myTeamA: mine?.teamA, myTeamB: mine?.teamB, myScore: mine?.score };
    });
  }, [currentUserId, disciplineScores, fifaRanking, predictionMaps, selectedUserId]);

  const visibleRows = rows.filter((row) => row.stage === stage && (stage === 'knockout' || groupFilter === 'all' || row.group === groupFilter));
  const comparing = compareWithMine && selectedUserId !== currentUserId;
  const currentProfile = profiles.find((profile) => profile.id === currentUserId);
  const printableRows = rows.map((row) => ({
    ...row,
    teamA: row.myTeamA ?? row.teamA,
    teamB: row.myTeamB ?? row.teamB,
    score: row.myScore ?? row.score
  }));
  const printableGroupRows = printableRows.filter((row) => row.stage === 'groups');
  const printableKnockoutRows = printableRows.filter((row) => row.stage === 'knockout');

  const printableThirdPlaces = useMemo(() => {
    if (!currentUserId) return [];
    const scores = predictionMaps.get(currentUserId) ?? {};
    const groupMatches: Match[] = [];
    const thirdPlaces: Array<{ team: Team; group: string; points: number; gd: number; gf: number }> = [];

    GROUPS.forEach((group) => {
      const teams = TEAMS_DATA.filter((team) => team.group === group);
      const matches: Match[] = [];
      for (let i = 0; i < teams.length; i += 1) {
        for (let j = i + 1; j < teams.length; j += 1) {
          const id = `m-${group}-${i}-${j}`;
          const score = scores[id];
          const match = { id, group, teamA: teams[i].id, teamB: teams[j].id, scoreA: score?.a ?? null, scoreB: score?.b ?? null };
          matches.push(match);
          groupMatches.push(match);
        }
      }
      const third = calculateGroupStandings(teams, matches, disciplineScores, fifaRanking)[2];
      const team = third ? teamById.get(third.teamId) : null;
      if (team) thirdPlaces.push({ team, group, points: third.points, gd: third.goalsDifference, gf: third.goalsFor });
    });

    const qualifiedIds = new Set(
      getAdvancedTeams(GROUPS, TEAMS_DATA, groupMatches, disciplineScores, fifaRanking).bestThirdPlaces.map((team) => team.id)
    );
    return thirdPlaces
      .sort((a, b) => {
        const tableCompare = b.points - a.points || b.gd - a.gd || b.gf - a.gf;
        if (tableCompare !== 0) return tableCompare;
        const disciplineCompare = (disciplineScores[b.team.id] ?? Number.NEGATIVE_INFINITY)
          - (disciplineScores[a.team.id] ?? Number.NEGATIVE_INFINITY);
        if (disciplineCompare !== 0) return disciplineCompare;
        return (fifaRanking[a.team.id] ?? Number.POSITIVE_INFINITY)
          - (fifaRanking[b.team.id] ?? Number.POSITIVE_INFINITY);
      })
      .map((row, index) => ({ ...row, position: index + 1, qualified: qualifiedIds.has(row.team.id) }));
  }, [currentUserId, disciplineScores, fifaRanking, predictionMaps]);

  if (loading) return <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando palpites...</div>;

  const printAllPlayers = () => {
    const confirmed = window.confirm(`Preparar ${profiles.length * 2} paginas com os palpites de ${profiles.length} jogadores?`);
    if (!confirmed) return;
    setPrintingAll(true);
    window.setTimeout(() => window.print(), 500);
  };

  return (
    <>
    <main className="ranking-wireframe no-print max-w-[1600px] mx-auto px-4 py-8">
      <header className="ranking-top-card">
        <div>
          <h2 className="ranking-title">Palpites dos Jogadores</h2>
          <p className="ranking-panel-meta">Veja e compare os caminhos previstos para a Copa.</p>
        </div>
        <div className="ranking-top-controls">
          <div className="ranking-chip">{profiles.length} participantes</div>
          {currentUserId && (
            <button type="button" className="ranking-print-btn" onClick={() => window.print()}>
              Imprimir meus palpites
            </button>
          )}
          <button type="button" className="ranking-print-btn ranking-print-btn-all" onClick={printAllPlayers}>
            Imprimir todos os palpites
          </button>
        </div>
      </header>

      <section className="ranking-browser-panel">
        <div className="ranking-browser-controls">
          <label className="ranking-browser-field">
            <span>Jogador</span>
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              {sortedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || `Jogador ${profile.id.slice(0, 6)}`}</option>)}
            </select>
          </label>
          <div className="ranking-browser-segments">
            <button type="button" className={stage === 'groups' ? 'is-active' : ''} onClick={() => setStage('groups')}>Grupos</button>
            <button type="button" className={stage === 'knockout' ? 'is-active' : ''} onClick={() => setStage('knockout')}>Mata-mata</button>
          </div>
          {stage === 'groups' && (
            <label className="ranking-browser-field ranking-browser-group-filter">
              <span>Grupo</span>
              <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                <option value="all">Todos</option>
                {GROUPS.map((group) => <option key={group} value={group}>Grupo {group}</option>)}
              </select>
            </label>
          )}
          {currentUserId && selectedUserId !== currentUserId && (
            <label className="ranking-browser-compare">
              <input type="checkbox" checked={compareWithMine} onChange={(event) => setCompareWithMine(event.target.checked)} />
              <span>Comparar com os meus</span>
            </label>
          )}
        </div>

        <div className="ranking-browser-table-wrap">
          <table className="ranking-browser-table">
            <thead><tr>
              <th>{stage === 'groups' ? 'Grupo' : 'Jogo'}</th>
              <th>{comparing ? 'Confronto selecionado' : 'Confronto previsto'}</th><th>Palpite</th>
              {comparing && stage === 'knockout' && <th>Meu confronto</th>}
              {comparing && <th>Meu palpite</th>}
            </tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={row.id}>
              <td>{row.label}</td>
              <td className="ranking-browser-matchup">{row.teamA} <span>x</span> {row.teamB}</td>
              <td className="ranking-browser-score">{row.score?.a ?? '-'} x {row.score?.b ?? '-'}</td>
              {comparing && stage === 'knockout' && <td className="ranking-browser-matchup">{row.myTeamA ?? '-'} <span>x</span> {row.myTeamB ?? '-'}</td>}
              {comparing && <td className="ranking-browser-score">{row.myScore?.a ?? '-'} x {row.myScore?.b ?? '-'}</td>}
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>

    {currentUserId && !printingAll && (
      <section className="print-book">
        <article className="print-page">
          <header className="print-header">
            <img src="/logobolao.png" alt="Bolao da Copa do Manduca" />
            <div>
              <div className="print-kicker">Bolao da Copa do Manduca</div>
              <h1>Palpites de {currentProfile?.full_name || 'Jogador'}</h1>
              <p>Fase de grupos e melhores terceiros</p>
            </div>
            <div className="print-page-number">01 / 02</div>
          </header>

          <div className="print-groups-grid">
            {GROUPS.map((group) => (
              <section key={group} className="print-group">
                <h2>Grupo {group}</h2>
                {printableGroupRows.filter((row) => row.group === group).map((row) => (
                  <div key={row.id} className="print-match">
                    <PrintTeam name={row.teamA} />
                    <strong>{row.score?.a ?? '-'} x {row.score?.b ?? '-'}</strong>
                    <PrintTeam name={row.teamB} />
                  </div>
                ))}
              </section>
            ))}
          </div>

          <section className="print-thirds">
            <h2>Melhores terceiros <span>Top 8 avancam</span></h2>
            <div className="print-thirds-grid">
              {printableThirdPlaces.map((row) => (
                <div key={row.team.id} className={row.qualified ? 'is-qualified' : ''}>
                  <span>{row.position}</span>
                  <PrintTeam name={row.team.name} />
                  <b>G{row.group}</b>
                  <b>{row.points} pts</b>
                  <small>SG {row.gd} / GT {row.gf}</small>
                </div>
              ))}
            </div>
          </section>
        </article>

        <article className="print-page print-page-last">
          <header className="print-header">
            <img src="/logobolao.png" alt="Bolao da Copa do Manduca" />
            <div>
              <div className="print-kicker">Bolao da Copa do Manduca</div>
              <h1>Palpites de {currentProfile?.full_name || 'Jogador'}</h1>
              <p>Mata-mata completo</p>
            </div>
            <div className="print-page-number">02 / 02</div>
          </header>

          <div className="print-knockout-grid">
            {[
              { title: 'Rodada de 32', from: 73, to: 88 },
              { title: 'Oitavas de final', from: 89, to: 96 },
              { title: 'Quartas de final', from: 97, to: 100 },
              { title: 'Semifinais e finais', from: 101, to: 104 }
            ].map((round) => (
              <section key={round.title} className="print-round">
                <h2>{round.title}</h2>
                {printableKnockoutRows
                  .filter((row) => Number(row.id) >= round.from && Number(row.id) <= round.to)
                  .map((row) => (
                    <div key={row.id} className="print-ko-match">
                      <span className="print-ko-id">{row.id}</span>
                      <PrintTeam name={row.teamA} />
                      <strong>{row.score?.a ?? '-'} x {row.score?.b ?? '-'}</strong>
                      <PrintTeam name={row.teamB} />
                    </div>
                  ))}
              </section>
            ))}
          </div>
        </article>
      </section>
    )}
    {printingAll && (
      <section className="print-book">
        {sortedProfiles.map((profile, index) => (
          <PrintablePlayerPages
            key={profile.id}
            name={profile.full_name || `Jogador ${profile.id.slice(0, 6)}`}
            scores={predictionMaps.get(profile.id) ?? {}}
            disciplineScores={disciplineScores}
            fifaRanking={fifaRanking}
            isLast={index === sortedProfiles.length - 1}
          />
        ))}
      </section>
    )}
    </>
  );
};

export default PlayerPredictionsView;
