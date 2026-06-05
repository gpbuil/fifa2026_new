import React, { useEffect, useMemo, useState } from 'react';
import { DisciplineScores, FifaRanking, Match, Team } from '../types';
import { GROUPS, TEAMS_DATA } from '../data/teams';
import GroupCard from './GroupCard';
import KnockoutBracket from './KnockoutBracket';

interface ScoreMap {
  [matchId: string]: { a: number | null; b: number | null };
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email?: string | null;
  bolao_paid?: boolean | null;
}

interface PredictionRow {
  user_id: string;
  match_id: string;
  score_a: number | null;
  score_b: number | null;
}

interface AdminDashboardProps {
  isAdmin: boolean;
  predictionsLocked: boolean | null;
  officialResults: ScoreMap;
  disciplineScores: DisciplineScores;
  fifaRanking: FifaRanking;
  onToggleLock: (next: boolean) => Promise<void>;
  onSaveOfficial: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  onSaveTeamTiebreaker: (teamId: string, conductScore: number | null, fifaRank: number | null) => Promise<void>;
  onClearOfficialResults: () => Promise<void>;
  onSendReminder: (userId: string, name: string, missing: number) => Promise<void>;
  onTogglePayment: (userId: string, nextPaid: boolean) => Promise<void>;
  onDeletePlayer: (userId: string) => Promise<void>;
  onRefreshCompletion: () => Promise<void>;
  currentUserId: string | null;
  groupMatches: Match[];
  knockoutMatches: Match[];
  resolvePlaceholder: (id: string) => { team?: Team; label: string };
  groupResultsComplete: boolean;
  groupResultsCount: number;
  groupResultsTotal: number;
  profiles: ProfileRow[];
  predictions: PredictionRow[];
  completionLoading: boolean;
}

const FlagImage: React.FC<{ iso2: string; name: string }> = ({ iso2, name }) => (
  <span
    className="inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-slate-200 bg-slate-50"
    aria-label={`Bandeira ${name}`}
  >
    <img
      src={`https://flagcdn.com/w20/${iso2.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png 2x`}
      alt={`Bandeira ${name}`}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
        const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = 'inline-flex';
      }}
    />
    <span className="hidden h-full w-full items-center justify-center text-[9px] font-black text-slate-500" aria-hidden>
      {iso2.toUpperCase().slice(0, 2)}
    </span>
  </span>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isAdmin,
  predictionsLocked,
  officialResults,
  disciplineScores,
  fifaRanking,
  onToggleLock,
  onSaveOfficial,
  onSaveTeamTiebreaker,
  onClearOfficialResults,
  onSendReminder,
  onTogglePayment,
  onDeletePlayer,
  onRefreshCompletion,
  currentUserId,
  groupMatches,
  knockoutMatches,
  resolvePlaceholder,
  groupResultsComplete,
  groupResultsCount,
  groupResultsTotal,
  profiles,
  predictions,
  completionLoading
}) => {
  const [drafts, setDrafts] = useState<ScoreMap>({});
  const [disciplineDrafts, setDisciplineDrafts] = useState<Record<string, string>>({});
  const [fifaRankingDrafts, setFifaRankingDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [savingDisciplineIds, setSavingDisciplineIds] = useState<Record<string, boolean>>({});
  const [disciplineErrors, setDisciplineErrors] = useState<Record<string, string>>({});
  const [clearingResults, setClearingResults] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [expandedMissingRows, setExpandedMissingRows] = useState<Record<string, boolean>>({});
  const [disciplineExpanded, setDisciplineExpanded] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});
  const [reminderErrors, setReminderErrors] = useState<Record<string, string>>({});
  const [paymentStatus, setPaymentStatus] = useState<Record<string, 'saving' | 'error'>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [deleteStatus, setDeleteStatus] = useState<Record<string, 'deleting' | 'error'>>({});
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [completionSort, setCompletionSort] = useState<{ key: 'name' | 'missing' | 'payment'; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const officialResultsCount = Object.keys(officialResults).length;

  useEffect(() => {
    setDrafts(officialResults);
  }, [officialResults]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    const nextRankingDrafts: Record<string, string> = {};
    TEAMS_DATA.forEach((team) => {
      const score = disciplineScores[team.id];
      const rank = fifaRanking[team.id];
      nextDrafts[team.id] = score === null || score === undefined ? '' : String(score);
      nextRankingDrafts[team.id] = rank === null || rank === undefined ? '' : String(rank);
    });
    setDisciplineDrafts(nextDrafts);
    setFifaRankingDrafts(nextRankingDrafts);
  }, [disciplineScores, fifaRanking]);

  const describeTeamToken = (token: string, matchId: string) => {
    const team = TEAMS_DATA.find((item) => item.id === token);
    if (team) return team.name;

    const placementMatch = token.match(/^([123])([A-L])$/);
    if (placementMatch) {
      const [, place, group] = placementMatch;
      const placeLabel = place === '1' ? '1o' : place === '2' ? '2o' : '3o';
      return `${placeLabel} Grupo ${group}`;
    }

    const sourceMatch = token.match(/^([WL])(\d+)$/);
    if (sourceMatch) {
      return `${sourceMatch[1] === 'W' ? 'Vencedor' : 'Perdedor'} jogo ${sourceMatch[2]}`;
    }

    if (token.startsWith('3rd-')) {
      return '3o colocado definido pela matriz';
    }

    return resolvePlaceholder(token).label || token || `Jogo ${matchId}`;
  };

  const describeMissingMatch = (match: Match) => {
    const prefix = match.group === 'KO' ? `Jogo ${match.id}` : `Grupo ${match.group}`;
    const teamA = describeTeamToken(match.teamA, match.id);
    const teamB = describeTeamToken(match.teamB, match.id);

    return {
      id: match.id,
      label: `${prefix}: ${teamA} x ${teamB}`
    };
  };

  const completionRows = useMemo(() => {
    const trackedMatches = [...groupMatches, ...knockoutMatches];
    const trackedMatchIds = new Set(trackedMatches.map((match) => match.id));
    const totalMatches = trackedMatches.length;
    const completedByUser = new Map<string, Set<string>>();

    predictions.forEach((prediction) => {
      if (!trackedMatchIds.has(prediction.match_id)) return;
      if (prediction.score_a === null || prediction.score_b === null) return;
      if (!completedByUser.has(prediction.user_id)) completedByUser.set(prediction.user_id, new Set());
      completedByUser.get(prediction.user_id)!.add(prediction.match_id);
    });

    const rows = profiles
      .map((profile) => {
        const completedMatches = completedByUser.get(profile.id) ?? new Set<string>();
        const completed = completedMatches.size;
        const missingMatches = trackedMatches
          .filter((match) => !completedMatches.has(match.id))
          .map(describeMissingMatch);
        const percent = totalMatches > 0 ? Math.round((completed / totalMatches) * 100) : 0;

        return {
          id: profile.id,
          name: profile.full_name || `Jogador ${profile.id.slice(0, 6)}`,
          email: profile.email ?? null,
          paid: !!profile.bolao_paid,
          completed,
          missing: Math.max(0, totalMatches - completed),
          missingMatches,
          percent,
          totalMatches
        };
      });

    return rows.sort((a, b) => {
      const direction = completionSort.direction === 'asc' ? 1 : -1;
      if (completionSort.key === 'payment') {
        const paymentCompare = Number(a.paid) - Number(b.paid);
        if (paymentCompare !== 0) return paymentCompare * direction;
        return a.name.localeCompare(b.name);
      }
      if (completionSort.key === 'missing') {
        const missingCompare = a.missing - b.missing;
        if (missingCompare !== 0) return missingCompare * direction;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name) * direction;
    });
  }, [completionSort, groupMatches, knockoutMatches, predictions, profiles, resolvePlaceholder]);

  const completionSummary = useMemo(() => {
    const totalPlayers = completionRows.length;
    const completePlayers = completionRows.filter((row) => row.percent === 100).length;
    const avgPercent = totalPlayers > 0
      ? Math.round(completionRows.reduce((sum, row) => sum + row.percent, 0) / totalPlayers)
      : 0;
    const completePlayersPercent = totalPlayers > 0
      ? Math.round((completePlayers / totalPlayers) * 100)
      : 0;

    return { totalPlayers, completePlayers, avgPercent, completePlayersPercent };
  }, [completionRows]);

  const handleSendReminder = async (row: typeof completionRows[number]) => {
    setReminderStatus(prev => ({ ...prev, [row.id]: 'sending' }));
    setReminderErrors(prev => ({ ...prev, [row.id]: '' }));
    try {
      await onSendReminder(row.id, row.name, row.missing);
      setReminderStatus(prev => ({ ...prev, [row.id]: 'sent' }));
    } catch (error) {
      console.error(error);
      setReminderStatus(prev => ({ ...prev, [row.id]: 'error' }));
      setReminderErrors(prev => ({
        ...prev,
        [row.id]: error instanceof Error ? error.message : 'Nao foi possivel enviar o lembrete.'
      }));
    }
  };

  const handleTogglePayment = async (row: typeof completionRows[number]) => {
    const nextPaid = !row.paid;
    setPaymentStatus(prev => ({ ...prev, [row.id]: 'saving' }));
    setPaymentErrors(prev => ({ ...prev, [row.id]: '' }));
    try {
      await onTogglePayment(row.id, nextPaid);
      setPaymentStatus(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (error) {
      console.error(error);
      setPaymentStatus(prev => ({ ...prev, [row.id]: 'error' }));
      setPaymentErrors(prev => ({
        ...prev,
        [row.id]: error instanceof Error ? error.message : 'Nao foi possivel atualizar o pagamento.'
      }));
    }
  };

  const handleDeletePlayer = async (row: typeof completionRows[number]) => {
    if (row.id === currentUserId) return;

    const confirmed = window.confirm(
      `Excluir o jogador ${row.name}? Essa acao remove a conta, o perfil e todos os palpites dele.`
    );
    if (!confirmed) return;

    setDeleteStatus(prev => ({ ...prev, [row.id]: 'deleting' }));
    setDeleteErrors(prev => ({ ...prev, [row.id]: '' }));

    try {
      await onDeletePlayer(row.id);
      setDeleteStatus(prev => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (error) {
      console.error(error);
      setDeleteStatus(prev => ({ ...prev, [row.id]: 'error' }));
      setDeleteErrors(prev => ({
        ...prev,
        [row.id]: error instanceof Error ? error.message : 'Nao foi possivel excluir o jogador.'
      }));
    }
  };

  const handleCompletionSort = (key: 'name' | 'missing' | 'payment') => {
    setCompletionSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortMarker = (key: 'name' | 'missing' | 'payment') => {
    if (completionSort.key !== key) return '↕';
    return completionSort.direction === 'asc' ? '↑' : '↓';
  };

  const sortableHeaderClass = (key: 'name' | 'missing' | 'payment') => {
    return `inline-flex items-center gap-1 rounded-md px-2 py-1 -mx-2 -my-1 font-black uppercase tracking-widest transition-all ${
      completionSort.key === key
        ? 'bg-slate-200 text-slate-900'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };

  const officialGroupMatches = useMemo(() => {
    return groupMatches.map((match) => {
      const score = drafts[match.id] || { a: null, b: null };
      return { ...match, scoreA: score.a, scoreB: score.b };
    });
  }, [drafts, groupMatches]);

  const officialKnockoutMatches = useMemo(() => {
    return knockoutMatches.map((match) => {
      const score = drafts[match.id] || { a: null, b: null };
      return { ...match, scoreA: score.a, scoreB: score.b };
    });
  }, [drafts, knockoutMatches]);

  const handleOfficialScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
    const parsedValue = value === '' ? null : parseInt(value, 10);
    const current = drafts[matchId] || { a: null, b: null };
    const next = {
      ...current,
      [team.toLowerCase()]: Number.isNaN(parsedValue as number) ? null : parsedValue
    };

    setDrafts(prev => ({ ...prev, [matchId]: next }));

    if (next.a !== null && next.b !== null) {
      setSavingIds(prev => ({ ...prev, [matchId]: true }));
      onSaveOfficial(matchId, next.a, next.b)
        .catch((error) => console.error(error))
        .finally(() => setSavingIds(prev => ({ ...prev, [matchId]: false })));
    }
  };

  const parseOptionalInteger = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue === '') return null;
    const parsedValue = parseInt(trimmedValue, 10);
    return Number.isNaN(parsedValue) ? undefined : parsedValue;
  };

  const handleTiebreakerChange = (teamId: string, field: 'discipline' | 'ranking', value: string) => {
    if (field === 'discipline') {
      setDisciplineDrafts(prev => ({ ...prev, [teamId]: value }));
    } else {
      setFifaRankingDrafts(prev => ({ ...prev, [teamId]: value }));
    }
    setDisciplineErrors(prev => ({ ...prev, [teamId]: '' }));

    const nextDiscipline = parseOptionalInteger(field === 'discipline' ? value : disciplineDrafts[teamId] ?? '');
    const nextFifaRank = parseOptionalInteger(field === 'ranking' ? value : fifaRankingDrafts[teamId] ?? '');
    if (nextDiscipline === undefined || nextFifaRank === undefined) return;

    setSavingDisciplineIds(prev => ({ ...prev, [teamId]: true }));
    onSaveTeamTiebreaker(teamId, nextDiscipline, nextFifaRank)
      .catch((error) => {
        console.error(error);
        setDisciplineErrors(prev => ({
          ...prev,
          [teamId]: error instanceof Error ? error.message : 'Nao foi possivel salvar a pontuacao.'
        }));
      })
      .finally(() => setSavingDisciplineIds(prev => ({ ...prev, [teamId]: false })));
  };

  const handleClearOfficialResults = async () => {
    setClearError(null);
    const confirmed = window.confirm(
      `Limpar ${officialResultsCount} resultado(s) oficial(is)? Essa acao remove os placares oficiais e recalcula o ranking sem resultados.`
    );
    if (!confirmed) return;

    try {
      setClearingResults(true);
      await onClearOfficialResults();
      setDrafts({});
    } catch (error) {
      console.error(error);
      setClearError('Nao foi possivel limpar os resultados oficiais. Verifique as permissoes no Supabase.');
    } finally {
      setClearingResults(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-2">Acesso restrito</h2>
          <p className="text-slate-600 text-sm">
            Esta área é exclusiva para administradores. Se você precisa de acesso, atualize seu perfil no Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Admin</h2>
          <p className="text-slate-600 text-sm">
            Bloqueie resultados globais e atualize os resultados oficiais.
          </p>
          {clearError && (
            <p className="mt-2 text-xs font-bold text-red-600">
              {clearError}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleClearOfficialResults}
            className="px-5 py-3 rounded-xl font-bold text-sm transition-all border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={officialResultsCount === 0 || clearingResults}
          >
            {clearingResults ? 'Limpando...' : `Limpar oficiais (${officialResultsCount})`}
          </button>
          <button
            onClick={() => predictionsLocked !== null && onToggleLock(!predictionsLocked)}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
              predictionsLocked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            disabled={predictionsLocked === null}
          >
            {predictionsLocked === null ? 'Carregando...' : predictionsLocked ? 'Desbloquear resultados' : 'Bloquear resultados'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="admin-completion-panel">
        <button
          type="button"
          className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-left"
          onClick={() => setCompletionExpanded(prev => !prev)}
          aria-expanded={completionExpanded}
          aria-controls="admin-completion-content"
        >
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black text-slate-900">Progresso dos jogadores</h3>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">
                {completionExpanded ? '-' : '+'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Acompanhe quem ja completou os palpites e quem ainda precisa de um lembrete.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-full lg:min-w-[640px]">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jogadores</div>
              <div className="text-lg font-black text-slate-900 leading-tight">{completionSummary.totalPlayers}</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Completos</div>
              <div className="text-lg font-black text-emerald-700 leading-tight">{completionSummary.completePlayers}</div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700">% Palpites</div>
              <div className="text-lg font-black text-indigo-700 leading-tight">{completionSummary.avgPercent}%</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">% Jogadores</div>
              <div className="text-lg font-black text-amber-700 leading-tight">{completionSummary.completePlayersPercent}%</div>
            </div>
          </div>
        </button>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onRefreshCompletion}
            disabled={completionLoading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {completionLoading ? 'Atualizando...' : 'Atualizar progresso'}
          </button>
        </div>

        {completionExpanded && (
          <div id="admin-completion-content" className="mt-5">
            {completionLoading ? (
              <div className="text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-4">
                Carregando progresso dos jogadores...
              </div>
            ) : completionRows.length === 0 ? (
              <div className="text-sm font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-4">
                Nenhum jogador encontrado ainda.
              </div>
            ) : (
              <>
              <div className="md:hidden space-y-2">
                {completionRows.map((row) => {
                  const isComplete = row.percent === 100;
                  const paymentIsSaving = paymentStatus[row.id] === 'saving';
                  const deleteIsRunning = deleteStatus[row.id] === 'deleting';
                  const isCurrentUser = row.id === currentUserId;
                  return (
                    <article key={row.id} className={`rounded-xl border border-slate-100 p-3 ${isComplete ? 'bg-emerald-50/40' : 'bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-black text-slate-900">{row.name}</h4>
                          <div className={`mt-1 text-xs font-black ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isComplete ? 'Completo' : `${row.missing} jogo(s) faltando`}
                          </div>
                        </div>
                        <div className="text-right text-xs font-black text-slate-600">
                          {row.completed}/{row.totalMatches}
                          <div className="text-slate-400">{row.percent}%</div>
                        </div>
                      </div>

                      {(reminderStatus[row.id] === 'sent' || reminderStatus[row.id] === 'error') && (
                        <div className={`mt-2 text-[11px] font-semibold ${reminderStatus[row.id] === 'sent' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {reminderStatus[row.id] === 'sent' ? 'Lembrete enviado' : 'Falha no lembrete'}
                        </div>
                      )}
                      {reminderErrors[row.id] && (
                        <div className="mt-1 text-[11px] font-semibold text-red-600">{reminderErrors[row.id]}</div>
                      )}
                      {paymentErrors[row.id] && (
                        <div className="mt-1 text-[11px] font-semibold text-red-600">{paymentErrors[row.id]}</div>
                      )}
                      {deleteErrors[row.id] && (
                        <div className="mt-1 text-[11px] font-semibold text-red-600">{deleteErrors[row.id]}</div>
                      )}
                      {!isComplete && (
                        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedMissingRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                            className="flex w-full items-center justify-between gap-3 text-left text-[11px] font-black text-amber-800"
                            aria-expanded={!!expandedMissingRows[row.id]}
                          >
                            <span>{expandedMissingRows[row.id] ? 'Ocultar jogos faltantes' : 'Ver jogos faltantes'}</span>
                            <span>{row.missing}</span>
                          </button>
                          {expandedMissingRows[row.id] && (
                            <ul className="mt-2 space-y-1 border-t border-amber-100 pt-2 text-[11px] font-semibold text-slate-700">
                              {row.missingMatches.map((match) => (
                                <li key={match.id}>{match.label}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {isComplete ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-emerald-100 px-3 py-2 text-[11px] font-black text-emerald-700">
                            Sem lembrete
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(row)}
                            disabled={reminderStatus[row.id] === 'sending'}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-black text-white transition-all hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {reminderStatus[row.id] === 'sending' ? 'Enviando...' : reminderStatus[row.id] === 'sent' ? 'Enviado' : 'Enviar lembrete'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(row)}
                          disabled={paymentIsSaving}
                          className={`rounded-lg px-3 py-2 text-[11px] font-black transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            row.paid
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {paymentIsSaving ? 'Salvando...' : row.paid ? 'Pago' : 'Pendente'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(row)}
                          disabled={deleteIsRunning || isCurrentUser}
                          className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleteIsRunning ? 'Excluindo...' : isCurrentUser ? 'Sua conta' : 'Excluir jogador'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-xs" data-testid="admin-completion-table">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => handleCompletionSort('name')}
                          className={sortableHeaderClass('name')}
                          aria-label="Ordenar por jogador"
                        >
                          <span>Jogador</span>
                          <span aria-hidden="true">{sortMarker('name')}</span>
                        </button>
                      </th>
                      <th className="px-3 py-2 text-left">Progresso</th>
                      <th className="px-3 py-2 text-center">Jogos</th>
                      <th className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleCompletionSort('missing')}
                          className={sortableHeaderClass('missing')}
                          aria-label="Ordenar por jogos faltantes"
                        >
                          <span>Faltam</span>
                          <span aria-hidden="true">{sortMarker('missing')}</span>
                        </button>
                      </th>
                      <th className="px-3 py-2 text-right">Lembrete</th>
                      <th className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleCompletionSort('payment')}
                          className={sortableHeaderClass('payment')}
                          aria-label="Ordenar por pagamento"
                        >
                          <span>Pagamento</span>
                          <span aria-hidden="true">{sortMarker('payment')}</span>
                        </button>
                      </th>
                      <th className="px-3 py-2 text-right">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completionRows.map((row) => {
                      const isComplete = row.percent === 100;
                      const paymentIsSaving = paymentStatus[row.id] === 'saving';
                      const deleteIsRunning = deleteStatus[row.id] === 'deleting';
                      const isCurrentUser = row.id === currentUserId;
                      const isMissingExpanded = !!expandedMissingRows[row.id];
                      return (
                        <React.Fragment key={row.id}>
                        <tr className={isComplete ? 'bg-emerald-50/30' : 'bg-white'}>
                          <td className="px-3 py-2">
                            <div className="max-w-[220px] truncate font-black text-slate-900" title={row.name}>
                              {row.name}
                            </div>
                            {(reminderStatus[row.id] === 'sent' || reminderStatus[row.id] === 'error') && (
                              <div className={`text-[11px] font-semibold ${reminderStatus[row.id] === 'sent' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {reminderStatus[row.id] === 'sent' ? 'Lembrete enviado' : 'Falha no lembrete'}
                              </div>
                            )}
                            {reminderErrors[row.id] && (
                              <div className="mt-1 max-w-md text-[11px] font-semibold text-red-600">
                                {reminderErrors[row.id]}
                              </div>
                            )}
                            {paymentErrors[row.id] && (
                              <div className="mt-1 max-w-md text-[11px] font-semibold text-red-600">
                                {paymentErrors[row.id]}
                              </div>
                            )}
                            {deleteErrors[row.id] && (
                              <div className="mt-1 max-w-md text-[11px] font-semibold text-red-600">
                                {deleteErrors[row.id]}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                  style={{ width: `${row.percent}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-black text-slate-700">{row.percent}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-black text-slate-700">
                            {row.completed}/{row.totalMatches}
                          </td>
                          <td className={`px-3 py-2 text-center font-black ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isComplete ? (
                              row.missing
                            ) : (
                              <button
                                type="button"
                                onClick={() => setExpandedMissingRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                                className="inline-flex min-w-[76px] items-center justify-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-[11px] font-black text-amber-800 transition-all hover:bg-amber-200"
                                aria-expanded={isMissingExpanded}
                              >
                                <span>{row.missing}</span>
                                <span>{isMissingExpanded ? 'Ocultar' : 'Ver'}</span>
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isComplete ? (
                              <span className="inline-flex rounded-lg bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                                Completo
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendReminder(row)}
                                disabled={reminderStatus[row.id] === 'sending'}
                                className="inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white transition-all hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {reminderStatus[row.id] === 'sending' ? 'Enviando...' : reminderStatus[row.id] === 'sent' ? 'Enviado' : 'Enviar'}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePayment(row)}
                              disabled={paymentIsSaving}
                              className={`min-w-[82px] rounded-lg px-3 py-1.5 text-[11px] font-black transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                row.paid
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {paymentIsSaving ? 'Salvando...' : row.paid ? 'Pago' : 'Pendente'}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePlayer(row)}
                              disabled={deleteIsRunning || isCurrentUser}
                              className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deleteIsRunning ? 'Excluindo...' : isCurrentUser ? 'Sua conta' : 'Excluir'}
                            </button>
                          </td>
                        </tr>
                        {isMissingExpanded && !isComplete && (
                          <tr className="bg-amber-50/60">
                            <td colSpan={7} className="px-3 py-3">
                              <div className="rounded-lg border border-amber-100 bg-white px-4 py-3">
                                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                  Jogos faltantes de {row.name}
                                </div>
                                <div className="grid gap-1 text-xs font-semibold text-slate-700 lg:grid-cols-2">
                                  {row.missingMatches.map((match) => (
                                    <div key={match.id}>{match.label}</div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="admin-discipline-panel">
        <button
          type="button"
          className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-left"
          onClick={() => setDisciplineExpanded(prev => !prev)}
          aria-expanded={disciplineExpanded}
          aria-controls="admin-discipline-content"
        >
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black text-slate-900">Historico disciplinar</h3>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-sm font-black text-slate-500">
                {disciplineExpanded ? '-' : '+'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Pontuacao FIFA de conduta: maior pontuacao vence. Se ainda empatar, melhor ranking FIFA vence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-w-full sm:min-w-[320px] lg:min-w-[360px]">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecoes</div>
              <div className="text-lg font-black text-slate-900 leading-tight">{TEAMS_DATA.length}</div>
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Criterio</div>
              <div className="text-lg font-black text-indigo-700 leading-tight">F</div>
            </div>
          </div>
        </button>

        {disciplineExpanded && (
          <div id="admin-discipline-content" className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-xs" data-testid="admin-discipline-table">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Grupo</th>
                  <th className="px-3 py-2 text-left">Selecao</th>
                  <th className="px-3 py-2 text-center">Conduta</th>
                  <th className="px-3 py-2 text-center">Ranking FIFA</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TEAMS_DATA.map((team) => {
                  const isSaving = !!savingDisciplineIds[team.id];
                  const scoreValue = disciplineDrafts[team.id] ?? '';
                  const rankingValue = fifaRankingDrafts[team.id] ?? '';
                  const error = disciplineErrors[team.id];

                  return (
                    <tr key={team.id} className="bg-white">
                      <td className="px-3 py-2 font-black text-slate-500">{team.group}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 font-black text-slate-900">
                          <FlagImage iso2={team.iso2} name={team.name} />
                          <span>{team.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={scoreValue}
                          onChange={(event) => handleTiebreakerChange(team.id, 'discipline', event.target.value)}
                          className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-black text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          aria-label={`Pontuacao disciplinar ${team.name}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={rankingValue}
                          onChange={(event) => handleTiebreakerChange(team.id, 'ranking', event.target.value)}
                          className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-black text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          aria-label={`Ranking FIFA ${team.name}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {isSaving ? (
                          <span className="font-black text-indigo-600">Salvando...</span>
                        ) : error ? (
                          <span className="font-semibold text-red-600">{error}</span>
                        ) : scoreValue === '' && rankingValue === '' ? (
                          <span className="font-semibold text-slate-400">Sem desempate manual</span>
                        ) : (
                          <span className="font-black text-emerald-700">Salvo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="prediction-shell px-0 py-0">
        <div className="prediction-top-card mb-6">
          <div>
            <h3 className="prediction-title text-[clamp(1.7rem,3vw,2.4rem)]">Resultados oficiais</h3>
          </div>
          <div className="prediction-chips">
            <span className="prediction-chip">{Object.keys(officialResults).length} placares salvos</span>
          </div>
        </div>

        <div className="pv-groups-grid">
          {GROUPS.map(groupLetter => (
            <GroupCard
              key={groupLetter}
              groupLetter={groupLetter}
              teams={TEAMS_DATA.filter(team => team.group === groupLetter)}
              matches={officialGroupMatches.filter(match => match.group === groupLetter)}
              onScoreChange={handleOfficialScoreChange}
              disciplineScores={disciplineScores}
              fifaRanking={fifaRanking}
            />
          ))}
        </div>
      </section>

      <section className="prediction-shell px-0 py-0">
        <div className="prediction-top-card mb-6">
          <div>
            <h3 className="prediction-title text-[clamp(1.7rem,3vw,2.4rem)]">Mata-mata oficial</h3>
          </div>
          <div className="prediction-chips">
            <span className="prediction-chip">
              {groupResultsComplete ? 'Liberado' : `${groupResultsCount}/${groupResultsTotal} grupos`}
            </span>
          </div>
        </div>

        {!groupResultsComplete ? (
          <div className="mb-4 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            Para liberar o mata-mata oficial, finalize todos os jogos da fase de grupos. ({groupResultsCount}/{groupResultsTotal})
          </div>
        ) : (
          <KnockoutBracket
            allTeams={TEAMS_DATA}
            knockoutMatches={officialKnockoutMatches}
            onScoreChange={handleOfficialScoreChange}
            resolvePlaceholder={resolvePlaceholder}
          />
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
