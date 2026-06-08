
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { TEAMS_DATA, GROUPS } from './data/teams';
import { FIFA_RANKING } from './data/fifaRanking';
import { DisciplineScores, FifaRanking, Match, ViewMode } from './types';
import Auth from './components/Auth';
import GroupCard from './components/GroupCard';
import KnockoutBracket from './components/KnockoutBracket';
import AdminDashboard from './components/AdminDashboard';
import RankingView from './components/RankingView';
import { getAdvancedTeams, calculateGroupStandings } from './services/simulator';
import { getThirdPlaceGroupForMatch } from './data/thirdPlaceMatrix';
import './components/prediction-view.css';

type ProfileRow = { id: string; full_name: string | null; email?: string | null; bolao_paid?: boolean | null };
type PredictionRow = { user_id: string; match_id: string; score_a: number | null; score_b: number | null };
type ThirdPlaceRow = {
  position: number;
  qualified: boolean;
  groupLetter: string;
  teamId: string;
  teamName: string;
  teamIso2: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDifference: number;
  disciplineScore?: number | null;
  fifaRank?: number | null;
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.GROUPS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [knockoutScores, setKnockoutScores] = useState<Record<string, {a: number | null, b: number | null}>>({});
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [predictionsLocked, setPredictionsLocked] = useState<boolean | null>(null);
  const [officialResults, setOfficialResults] = useState<Record<string, {a: number | null, b: number | null}>>({});
  const [disciplineScores, setDisciplineScores] = useState<DisciplineScores>({});
  const [fifaRanking, setFifaRanking] = useState<FifaRanking>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allPredictions, setAllPredictions] = useState<PredictionRow[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIncompleteGroupsModal, setShowIncompleteGroupsModal] = useState(false);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isAdminRoute = pathname.startsWith('/admin');
  const isRankingRoute = pathname.startsWith('/ranking');

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!showIncompleteGroupsModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowIncompleteGroupsModal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIncompleteGroupsModal]);

  console.log("App renderizado. Reset Mode:", isResettingPassword);

  const initMatches = useCallback(() => {
    const initialMatches: Match[] = [];
    GROUPS.forEach(group => {
      const groupTeams = TEAMS_DATA.filter(t => t.group === group);
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
           initialMatches.push({
            id: `m-${group}-${i}-${j}`,
            group,
            teamA: groupTeams[i].id,
            teamB: groupTeams[j].id,
            scoreA: null,
            scoreB: null
          });
        }
      }
    });
    return initialMatches;
  }, []);

  const R32_STRUCTURE = useMemo(() => [
    { id: '73', a: '2A', b: '2B', venue: 'Los Angeles' },
    { id: '74', a: '1E', b: '3rd-1-A/B/C/D/F', venue: 'Boston' },
    { id: '75', a: '1F', b: '2C', venue: 'Monterrey' },
    { id: '76', a: '1C', b: '2F', venue: 'Houston' },
    { id: '77', a: '1I', b: '3rd-2-C/D/F/G/H', venue: 'New York/NJ' },
    { id: '78', a: '2E', b: '2I', venue: 'Dallas' },
    { id: '79', a: '1A', b: '3rd-3-C/E/F/H/I', venue: 'Mexico City' },
    { id: '80', a: '1L', b: '3rd-4-E/H/I/J/K', venue: 'Atlanta' },
    { id: '81', a: '1D', b: '3rd-5-B/E/F/I/J', venue: 'San Francisco' },
    { id: '82', a: '1G', b: '3rd-6-A/E/H/I/J', venue: 'Seattle' },
    { id: '83', a: '2K', b: '2L', venue: 'Toronto' },
    { id: '84', a: '1H', b: '2J', venue: 'Los Angeles' },
    { id: '85', a: '1B', b: '3rd-7-E/F/G/I/J', venue: 'Vancouver' },
    { id: '86', a: '1J', b: '2H', venue: 'Miami' },
    { id: '87', a: '1K', b: '3rd-8-D/E/I/J/L', venue: 'Kansas City' },
    { id: '88', a: '2D', b: '2G', venue: 'Dallas' }
  ], []);

  const fetchPredictions = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('predictions').select('*').eq('user_id', userId);
      if (error) throw error;
      
      const groupBase = initMatches();
      const scores: Record<string, {a: number | null, b: number | null}> = {};
      const updatedGroup = groupBase.map(m => {
        const p = data?.find((pred: any) => pred.match_id === m.id);
        return p ? { ...m, scoreA: p.score_a, scoreB: p.score_b } : m;
      });
      data?.filter((p: any) => p.match_id.length <= 3).forEach((p: any) => {
        scores[p.match_id] = { a: p.score_a, b: p.score_b };
      });
      setMatches(updatedGroup);
      setKnockoutScores(scores);
    } catch (e) { 
      console.warn("Sem resultados salvos ou erro:", e);
      setMatches(initMatches());
    }
  }, [initMatches]);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (error) throw error;
      setIsAdmin(data?.role === 'admin');
    } catch (e) {
      console.warn("Erro ao buscar role:", e);
      setIsAdmin(false);
    } finally {
      setRoleLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('predictions_locked').limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setPredictionsLocked(!!data[0].predictions_locked);
      } else {
        setPredictionsLocked(false);
      }
    } catch (e) {
      console.warn("Erro ao buscar settings:", e);
      setPredictionsLocked(false);
    }
  }, []);

  const fetchOfficialResults = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('official_results').select('match_id, score_a, score_b');
      if (error) throw error;
      const map: Record<string, {a: number | null, b: number | null}> = {};
      data?.forEach((r: any) => {
        map[r.match_id] = { a: r.score_a, b: r.score_b };
      });
      setOfficialResults(map);
    } catch (e) {
      console.warn("Erro ao buscar resultados oficiais:", e);
      setOfficialResults({});
    }
  }, []);

  const fetchDisciplineScores = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('team_discipline').select('team_id, conduct_score, draw_order');
      if (error) throw error;
      const disciplineMap: DisciplineScores = {};
      const rankingMap: FifaRanking = { ...FIFA_RANKING };
      data?.forEach((row: any) => {
        disciplineMap[row.team_id] = row.conduct_score;
        rankingMap[row.team_id] = row.draw_order ?? FIFA_RANKING[row.team_id];
      });
      setDisciplineScores(disciplineMap);
      setFifaRanking(rankingMap);
    } catch (e) {
      console.warn("Erro ao buscar historico disciplinar:", e);
      setDisciplineScores({});
      setFifaRanking(FIFA_RANKING);
    }
  }, []);

  const fetchRankingData = useCallback(async () => {
    setRankingLoading(true);
    try {
      const fetchProfiles = async (): Promise<ProfileRow[]> => {
        const { data, error } = await supabase.from('profiles').select('id, full_name, bolao_paid');
        if (!error) return data ?? [];

        const { data: fallbackData, error: fallbackError } = await supabase.from('profiles').select('id, full_name');
        if (fallbackError) throw fallbackError;
        return fallbackData ?? [];
      };

      const fetchPredictionsRows = async (): Promise<PredictionRow[]> => {
        const pageSize = 1000;
        const rows: PredictionRow[] = [];

        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from('predictions')
            .select('user_id, match_id, score_a, score_b')
            .order('user_id', { ascending: true })
            .order('match_id', { ascending: true })
            .range(from, from + pageSize - 1);

          if (error) throw error;
          rows.push(...((data ?? []) as PredictionRow[]));
          if (!data || data.length < pageSize) break;
        }

        return rows;
      };

      const fetchRankingRows = async () => {
        const pageSize = 1000;
        const rows: any[] = [];

        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .rpc('get_ranking_rows')
            .range(from, from + pageSize - 1);

          if (error) throw error;
          rows.push(...(data ?? []));
          if (!data || data.length < pageSize) break;
        }

        return rows;
      };

      const { data: rankingRows, error: rankingRpcError } = await fetchRankingRows()
        .then(data => ({ data, error: null as null }))
        .catch(error => ({ data: null, error }));

      if (!rankingRpcError && Array.isArray(rankingRows) && rankingRows.length > 0) {
        const rowByUser = new Map<string, ProfileRow>();
        const predictionsRows: PredictionRow[] = [];

        rankingRows.forEach((row: any) => {
          if (!rowByUser.has(row.user_id)) {
            rowByUser.set(row.user_id, {
              id: row.user_id,
              full_name: row.full_name ?? `Jogador ${String(row.user_id).slice(0, 6)}`
            });
          }
          predictionsRows.push({
            user_id: row.user_id,
            match_id: row.match_id,
            score_a: row.score_a,
            score_b: row.score_b
          });
        });

        const profilesRows = await fetchProfiles();
        const rpcProfiles = Array.from(rowByUser.values());
        const profileById = new Map<string, ProfileRow>(rpcProfiles.map((profile) => [profile.id, profile]));
        profilesRows.forEach((profile) => {
          profileById.set(profile.id, {
            ...profileById.get(profile.id),
            ...profile,
            full_name: profile.full_name ?? profileById.get(profile.id)?.full_name ?? `Jogador ${profile.id.slice(0, 6)}`
          });
        });

        setProfiles(Array.from(profileById.values()));
        setAllPredictions(predictionsRows);
      } else {
        const [{ data: profilesData, error: profilesError }, { data: predictionsData, error: predictionsError }] = await Promise.all([
          fetchProfiles().then(data => ({ data, error: null as null })).catch(error => ({ data: null, error })),
          fetchPredictionsRows().then(data => ({ data, error: null as null })).catch(error => ({ data: null, error }))
        ]);
        if (profilesError) throw profilesError;
        if (predictionsError) throw predictionsError;

        const profilesRows = (profilesData ?? []) as ProfileRow[];
        const predictionsRows = (predictionsData ?? []) as PredictionRow[];
        const profileById = new Map(profilesRows.map((p) => [p.id, p]));
        const predictionUserIds = Array.from(new Set(predictionsRows.map((p) => p.user_id)));
        const predictionUserIdSet = new Set(predictionUserIds);

        const rankingProfiles = [
          ...predictionUserIds.map((userId) => ({
            id: userId,
            full_name: profileById.get(userId)?.full_name ?? `Jogador ${userId.slice(0, 6)}`,
            email: profileById.get(userId)?.email ?? null,
            bolao_paid: profileById.get(userId)?.bolao_paid ?? false
          })),
          ...profilesRows.filter((p) => !predictionUserIdSet.has(p.id))
        ];

        setProfiles(rankingProfiles);
        setAllPredictions(predictionsRows);
      }
    } catch (e) {
      console.warn("Erro ao buscar ranking:", e);
      setProfiles([]);
      setAllPredictions([]);
    } finally {
      setRankingLoading(false);
    }
  }, []);

  const syncProfileFromAuthUser = useCallback(async (user: any) => {
    if (!user?.id) return;

    const metadata = user.user_metadata ?? {};
    const metadataName =
      metadata.full_name
      || metadata.name
      || [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim()
      || null;
    const metadataPhone = metadata.phone ?? null;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: metadataName,
          phone: metadataPhone
        });
        if (insertError) throw insertError;
        return;
      }

      const payload: { full_name?: string | null; phone?: string | null } = {};
      if (!profileData.full_name && metadataName) payload.full_name = metadataName;
      if (!profileData.phone && metadataPhone) payload.phone = metadataPhone;

      if (Object.keys(payload).length) {
        const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (updateError) throw updateError;
      }
    } catch (e) {
      console.warn("Erro ao sincronizar perfil:", e);
    }
  }, []);

  useEffect(() => {
    // Detecta token de recuperação na URL antes de qualquer coisa
    const hash = window.location.hash;
    console.log("Verificando URL Hash:", hash);
    
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      console.log("Modo de recuperação detectado via URL!");
      setIsResettingPassword(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Sessão inicial:", session?.user?.email);
      setSession(session);
      if (session) {
        syncProfileFromAuthUser(session.user);
        fetchPredictions(session.user.id);
        fetchRole(session.user.id);
      } else {
        setMatches(initMatches());
        setRoleLoading(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Evento Auth:", event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
      if (event === 'SIGNED_IN') {
        setSession(session);
        if (session) {
          syncProfileFromAuthUser(session.user);
          fetchPredictions(session.user.id);
          fetchRole(session.user.id);
        }
        // Só sai do reset se não houver token pendente
        if (!window.location.hash.includes('type=recovery')) {
          setIsResettingPassword(false);
        }
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setMatches(initMatches());
        setKnockoutScores({});
        setIsResettingPassword(false);
        setIsAdmin(false);
        setRoleLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [initMatches, fetchPredictions, fetchRole, syncProfileFromAuthUser]);

  useEffect(() => {
    fetchSettings();
    fetchOfficialResults();
    fetchDisciplineScores();
  }, [fetchSettings, fetchOfficialResults, fetchDisciplineScores]);

  useEffect(() => {
    if (isRankingRoute || (isAdminRoute && isAdmin)) fetchRankingData();
  }, [isRankingRoute, isAdminRoute, isAdmin, fetchRankingData]);

  const savePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!session?.user?.id) return;
    if (predictionsLocked) return;
    try {
      const { error } = await supabase.from('predictions').upsert({
        user_id: session.user.id, 
        match_id: matchId, 
        score_a: scoreA, 
        score_b: scoreB, 
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,match_id' });
      if (error) throw error;
    } catch (e) {
      console.error("Erro ao salvar palpite:", e);
    }
  };

  const updatePredictionsLocked = async (nextValue: boolean) => {
    try {
      const { data, error } = await supabase.from('app_settings').select('id').limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        await supabase.from('app_settings').update({
          predictions_locked: nextValue,
          updated_at: new Date().toISOString()
        }).eq('id', data[0].id);
      } else {
        await supabase.from('app_settings').insert({
          predictions_locked: nextValue,
          updated_at: new Date().toISOString()
        });
      }
      setPredictionsLocked(nextValue);
    } catch (e) {
      console.error("Erro ao atualizar bloqueio:", e);
    }
  };

  const saveOfficialResult = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('official_results').upsert({
        match_id: matchId,
        score_a: scoreA,
        score_b: scoreB,
        updated_by: session.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'match_id' });
      fetchOfficialResults();
    } catch (e) {
      console.error("Erro ao salvar resultado oficial:", e);
    }
  };

  const clearOfficialResults = async () => {
    if (!session?.user?.id || !isAdmin) return;
    try {
      const expectedCount = Object.keys(officialResults).length;
      const { data, error } = await supabase
        .from('official_results')
        .delete()
        .not('match_id', 'is', null)
        .select('match_id');

      if (error) throw error;

      if (expectedCount > 0 && (!data || data.length === 0)) {
        throw new Error('Nenhum resultado oficial foi removido. Verifique a policy de DELETE da tabela official_results no Supabase.');
      }

      await fetchOfficialResults();
    } catch (e) {
      console.error("Erro ao limpar resultados oficiais:", e);
      throw e;
    }
  };

  const saveTeamTiebreaker = async (teamId: string, conductScore: number | null, fifaRank: number | null) => {
    if (!session?.user?.id || !isAdmin) return;

    try {
      if (conductScore === null && fifaRank === null) {
        const { error } = await supabase.from('team_discipline').delete().eq('team_id', teamId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('team_discipline').upsert({
          team_id: teamId,
          conduct_score: conductScore,
          draw_order: fifaRank,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_id' });
        if (error) throw error;
      }

      setDisciplineScores(prev => {
        const next = { ...prev };
        if (conductScore === null && fifaRank === null) {
          delete next[teamId];
        } else {
          next[teamId] = conductScore;
        }
        return next;
      });
      setFifaRanking(prev => {
        const next = { ...prev };
        if (conductScore === null && fifaRank === null) {
          next[teamId] = FIFA_RANKING[teamId];
        } else {
          next[teamId] = fifaRank;
        }
        return next;
      });
    } catch (e) {
      console.error("Erro ao salvar historico disciplinar:", e);
      throw e;
    }
  };

  const sendCompletionReminder = async (userId: string, name: string, missing: number) => {
    if (!session?.user?.id || !isAdmin) return;

    const { data, error } = await supabase.functions.invoke('send-reminder', {
      body: { userId, name, missing }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);
  };

  const updateProfilePaymentStatus = async (userId: string, nextPaid: boolean) => {
    if (!session?.user?.id || !isAdmin) return;

    const { data, error } = await supabase.rpc('set_profile_payment_status', {
      target_user_id: userId,
      next_paid: nextPaid
    });

    if (error) throw error;
    if (data === false) throw new Error('Jogador nao encontrado.');

    setProfiles(prev => prev.map(profile => (
      profile.id === userId ? { ...profile, bolao_paid: nextPaid } : profile
    )));
  };

  const deletePlayer = async (userId: string) => {
    if (!session?.user?.id || !isAdmin) return;

    const { data, error } = await supabase.functions.invoke('delete-player', {
      body: { userId }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    setProfiles(prev => prev.filter(profile => profile.id !== userId));
    setAllPredictions(prev => prev.filter(prediction => prediction.user_id !== userId));
  };

  const teamById = useMemo(() => {
    const map = new Map<string, typeof TEAMS_DATA[number]>();
    TEAMS_DATA.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  const incompleteGroupMatches = useMemo(() => {
    return matches
      .filter((match) => match.scoreA === null || match.scoreA === undefined || match.scoreB === null || match.scoreB === undefined)
      .map((match) => ({
        id: match.id,
        group: match.group,
        teamA: teamById.get(match.teamA)?.name ?? match.teamA,
        teamB: teamById.get(match.teamB)?.name ?? match.teamB
      }));
  }, [matches, teamById]);

  const openKnockoutView = () => {
    if (!predictionsLocked && incompleteGroupMatches.length > 0) {
      setView(ViewMode.GROUPS);
      setShowIncompleteGroupsModal(true);
      return;
    }

    setView(ViewMode.KNOCKOUT);
  };

  const groupCardsData = useMemo(() => {
    return GROUPS.map((groupLetter) => {
      const groupTeams = TEAMS_DATA.filter((team) => team.group === groupLetter);
      const groupMatches = matches.filter((match) => match.group === groupLetter);
      const resultRows = groupMatches.map((match) => {
        const official = officialResults[match.id];
        return {
          matchId: match.id,
          teamA: teamById.get(match.teamA),
          teamB: teamById.get(match.teamB),
          predictedA: match.scoreA,
          predictedB: match.scoreB,
          officialA: official?.a ?? null,
          officialB: official?.b ?? null
        };
      });

      const groupMatchesOfficial = groupMatches.map((match) => {
        const official = officialResults[match.id];
        return {
          ...match,
          scoreA: official?.a ?? null,
          scoreB: official?.b ?? null
        };
      });

      const standings = calculateGroupStandings(groupTeams, groupMatchesOfficial, disciplineScores, fifaRanking).map((standing) => {
        const team = teamById.get(standing.teamId);
        return {
          teamId: standing.teamId,
          teamName: team?.name ?? standing.teamId,
          teamIso2: team?.iso2 ?? '',
          points: standing.points,
          goalsDifference: standing.goalsDifference,
          goalsFor: standing.goalsFor,
          disciplineScore: disciplineScores[standing.teamId],
          fifaRank: fifaRanking[standing.teamId]
        };
      });

      return {
        groupLetter,
        resultRows,
        standings
      };
    });
  }, [disciplineScores, fifaRanking, matches, officialResults, teamById]);

  const groupPlacements = useMemo(() => {
    const map = new Map<string, string>();
    GROUPS.forEach(groupLetter => {
      const groupTeams = TEAMS_DATA.filter(t => t.group === groupLetter);
      const groupMatches = matches.filter(m => m.group === groupLetter);
      const standings = calculateGroupStandings(groupTeams, groupMatches, disciplineScores, fifaRanking);
      const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
      if (!hasAnyMatch) return;
      const top3 = standings.slice(0, 3).map(s => s.teamId);
      if (top3[0]) map.set(`1${groupLetter}`, top3[0]);
      if (top3[1]) map.set(`2${groupLetter}`, top3[1]);
      if (top3[2]) map.set(`3${groupLetter}`, top3[2]);
    });
    return map;
  }, [disciplineScores, fifaRanking, matches]);

  const { bestThirdPlaces } = useMemo(() => {
    return getAdvancedTeams(GROUPS, TEAMS_DATA, matches, disciplineScores, fifaRanking);
  }, [disciplineScores, fifaRanking, matches]);

  const buildThirdPlaceRows = useCallback((
    sourceMatches: Match[],
    useManualTiebreakers: boolean
  ): ThirdPlaceRow[] => {
    const thirdRows = GROUPS.flatMap((groupLetter) => {
      const groupTeams = TEAMS_DATA.filter((team) => team.group === groupLetter);
      const groupMatches = sourceMatches.filter((match) => match.group === groupLetter);
      const hasAnyMatch = groupMatches.some((match) => match.scoreA !== null && match.scoreA !== undefined);
      if (!hasAnyMatch) return [];

      const standings = calculateGroupStandings(
        groupTeams,
        groupMatches,
        useManualTiebreakers ? disciplineScores : undefined,
        useManualTiebreakers ? fifaRanking : undefined
      );
      const standing = standings[2];
      if (!standing || standing.played <= 0) return [];
      const team = teamById.get(standing.teamId);

      return [{
        position: 0,
        qualified: false,
        groupLetter,
        teamId: standing.teamId,
        teamName: team?.name ?? standing.teamId,
        teamIso2: team?.iso2 ?? '',
        played: standing.played,
        points: standing.points,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalsDifference: standing.goalsDifference,
        disciplineScore: disciplineScores[standing.teamId],
        fifaRank: fifaRanking[standing.teamId] ?? FIFA_RANKING[standing.teamId]
      }];
    });

    return thirdRows
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalsDifference !== a.goalsDifference) return b.goalsDifference - a.goalsDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

        if (useManualTiebreakers) {
          const disciplineA = a.disciplineScore;
          const disciplineB = b.disciplineScore;
          if (
            disciplineA !== null
            && disciplineA !== undefined
            && disciplineB !== null
            && disciplineB !== undefined
            && disciplineB !== disciplineA
          ) {
            return disciplineB - disciplineA;
          }

          const rankA = a.fifaRank;
          const rankB = b.fifaRank;
          if (rankA !== null && rankA !== undefined && rankB !== null && rankB !== undefined && rankA !== rankB) {
            return rankA - rankB;
          }
        }

        return GROUPS.indexOf(a.groupLetter) - GROUPS.indexOf(b.groupLetter);
      })
      .map((row, index) => ({
        ...row,
        position: index + 1,
        qualified: index < 8
      }));
  }, [disciplineScores, fifaRanking, teamById]);

  const predictedThirdPlaceRows = useMemo(() => {
    return buildThirdPlaceRows(matches, true);
  }, [buildThirdPlaceRows, matches]);

  const officialThirdPlaceRows = useMemo(() => {
    const officialGroupMatches = matches.map((match) => {
      const official = officialResults[match.id];
      return {
        ...match,
        scoreA: official?.a ?? null,
        scoreB: official?.b ?? null
      };
    });
    return buildThirdPlaceRows(officialGroupMatches, true);
  }, [buildThirdPlaceRows, matches, officialResults]);

  const thirdPlaceRows = predictionsLocked ? officialThirdPlaceRows : predictedThirdPlaceRows;

  const knockoutMatches = useMemo(() => {
    const k: Match[] = [];
    R32_STRUCTURE.forEach(struct => {
      const score = knockoutScores[struct.id] || { a: null, b: null };
      k.push({ id: struct.id, group: 'KO', teamA: struct.a, teamB: struct.b, scoreA: score.a, scoreB: score.b, venue: struct.venue });
    });

    const r16 = [
      { id: '89', a: 'W74', b: 'W77', venue: 'Philadelphia' },
      { id: '90', a: 'W73', b: 'W75', venue: 'Houston' },
      { id: '91', a: 'W76', b: 'W78', venue: 'New York/NJ' },
      { id: '92', a: 'W79', b: 'W80', venue: 'Mexico City' },
      { id: '93', a: 'W83', b: 'W84', venue: 'Dallas' },
      { id: '94', a: 'W81', b: 'W82', venue: 'Seattle' },
      { id: '95', a: 'W86', b: 'W88', venue: 'Atlanta' },
      { id: '96', a: 'W85', b: 'W87', venue: 'Vancouver' }
    ];

    const qf = [
      { id: '97', a: 'W89', b: 'W90', venue: 'Boston' },
      { id: '98', a: 'W93', b: 'W94', venue: 'Los Angeles' },
      { id: '99', a: 'W91', b: 'W92', venue: 'Miami' },
      { id: '100', a: 'W95', b: 'W96', venue: 'Kansas City' }
    ];

    const sf = [
      { id: '101', a: 'W97', b: 'W98', venue: 'Dallas' },
      { id: '102', a: 'W99', b: 'W100', venue: 'Atlanta' }
    ];

    const finals = [
      { id: '103', a: 'L101', b: 'L102', venue: 'Miami' },
      { id: '104', a: 'W101', b: 'W102', venue: 'New York/NJ' }
    ];

    [...r16, ...qf, ...sf, ...finals].forEach(struct => {
      const score = knockoutScores[struct.id] || { a: null, b: null };
      k.push({ id: struct.id, group: 'KO', teamA: struct.a, teamB: struct.b, scoreA: score.a, scoreB: score.b, venue: struct.venue });
    });

    return k;
  }, [knockoutScores, R32_STRUCTURE]);

  const officialKnockoutRounds = useMemo(() => {
    const withOfficialScores = knockoutMatches.map((match) => {
      const official = officialResults[match.id];
      return {
        ...match,
        scoreA: official?.a ?? null,
        scoreB: official?.b ?? null
      };
    });

    return [
      { title: 'Rodada de 32', matches: withOfficialScores.filter((match) => parseInt(match.id, 10) >= 73 && parseInt(match.id, 10) <= 88) },
      { title: 'Rodada de 16', matches: withOfficialScores.filter((match) => parseInt(match.id, 10) >= 89 && parseInt(match.id, 10) <= 96) },
      { title: 'Quartas', matches: withOfficialScores.filter((match) => parseInt(match.id, 10) >= 97 && parseInt(match.id, 10) <= 100) },
      { title: 'Semifinais', matches: withOfficialScores.filter((match) => match.id === '101' || match.id === '102') },
      { title: 'Finais', matches: withOfficialScores.filter((match) => match.id === '103' || match.id === '104') }
    ];
  }, [knockoutMatches, officialResults]);

  const resolvePlaceholder = useCallback((id: string, sourceMatchId?: string) => {
    const visited = new Set<string>();
    const qualifiedThirdGroups = bestThirdPlaces.map((team) => team.group);

    const resolve = (token: string, currentMatchId?: string): { team?: typeof TEAMS_DATA[number]; label: string } => {
      if (visited.has(token)) return { label: token };
      visited.add(token);

      const groupMatch = token.match(/^([123])([A-L])$/);
      if (groupMatch) {
        const teamId = groupPlacements.get(token);
        const team = teamId ? teamById.get(teamId) : undefined;
        return team ? { team, label: team.name } : { label: token };
      }

      const thirdMatch = token.match(/^3rd-(\d+)-/i);
      if (thirdMatch) {
        const matrixGroup = currentMatchId ? getThirdPlaceGroupForMatch(currentMatchId, qualifiedThirdGroups) : null;
        const teamId = matrixGroup ? groupPlacements.get(`3${matrixGroup}`) : null;
        const team = teamId ? teamById.get(teamId) : undefined;
        return team ? { team, label: team.name } : { label: token };
      }

      const wlMatch = token.match(/^([WL])(\d{2,3})$/i);
      if (wlMatch) {
        const kind = wlMatch[1].toUpperCase();
        const matchId = wlMatch[2];
        const match = knockoutMatches.find(m => m.id === matchId);
        if (!match) return { label: token };
        const a = resolve(match.teamA, matchId);
        const b = resolve(match.teamB, matchId);
        const hasScores = match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined;
        if (!hasScores || !a.team || !b.team) return { label: token };
        if (match.scoreA === match.scoreB) return { label: token };
        const winner = match.scoreA > match.scoreB ? a.team : b.team;
        const loser = match.scoreA > match.scoreB ? b.team : a.team;
        return kind === 'W' ? { team: winner, label: winner.name } : { team: loser, label: loser.name };
      }

      const directTeam = teamById.get(token);
      if (directTeam) return { team: directTeam, label: directTeam.name };

      return { label: token };
    };

    return resolve(id, sourceMatchId);
  }, [bestThirdPlaces, groupPlacements, knockoutMatches, teamById]);

  const resolveOfficialPlaceholder = useCallback((id: string, sourceMatchId?: string) => {
    const visited = new Set<string>();

    const officialGroupPlacements = new Map<string, string>();
    GROUPS.forEach(groupLetter => {
      const groupTeams = TEAMS_DATA.filter(t => t.group === groupLetter);
      const groupMatches = matches.filter(m => m.group === groupLetter).map(m => {
        const official = officialResults[m.id];
        return {
          ...m,
          scoreA: official?.a ?? null,
          scoreB: official?.b ?? null
        };
      });
      const standings = calculateGroupStandings(groupTeams, groupMatches, disciplineScores, fifaRanking);
      const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
      if (!hasAnyMatch) return;
      const top3 = standings.slice(0, 3).map(s => s.teamId);
      if (top3[0]) officialGroupPlacements.set(`1${groupLetter}`, top3[0]);
      if (top3[1]) officialGroupPlacements.set(`2${groupLetter}`, top3[1]);
      if (top3[2]) officialGroupPlacements.set(`3${groupLetter}`, top3[2]);
    });

    const officialAdvanced = getAdvancedTeams(GROUPS, TEAMS_DATA, matches.map(m => {
      const official = officialResults[m.id];
      return { ...m, scoreA: official?.a ?? null, scoreB: official?.b ?? null };
    }), disciplineScores, fifaRanking);
    const qualifiedThirdGroups = officialAdvanced.bestThirdPlaces.map((team) => team.group);

    const resolve = (token: string, currentMatchId?: string): { team?: typeof TEAMS_DATA[number]; label: string } => {
      if (visited.has(token)) return { label: token };
      visited.add(token);

      const groupMatch = token.match(/^([123])([A-L])$/);
      if (groupMatch) {
        const teamId = officialGroupPlacements.get(token);
        const team = teamId ? teamById.get(teamId) : undefined;
        return team ? { team, label: team.name } : { label: token };
      }

      const thirdMatch = token.match(/^3rd-(\d+)-/i);
      if (thirdMatch) {
        const matrixGroup = currentMatchId ? getThirdPlaceGroupForMatch(currentMatchId, qualifiedThirdGroups) : null;
        const teamId = matrixGroup ? officialGroupPlacements.get(`3${matrixGroup}`) : null;
        const team = teamId ? teamById.get(teamId) : undefined;
        return team ? { team, label: team.name } : { label: token };
      }

      const wlMatch = token.match(/^([WL])(\d{2,3})$/i);
      if (wlMatch) {
        const kind = wlMatch[1].toUpperCase();
        const matchId = wlMatch[2];
        const match = knockoutMatches.find(m => m.id === matchId);
        if (!match) return { label: token };
        const a = resolve(match.teamA, matchId);
        const b = resolve(match.teamB, matchId);
        const score = officialResults[matchId];
        const hasScores = score && score.a !== null && score.b !== null;
        if (!hasScores || !a.team || !b.team) return { label: token };
        if (score.a === score.b) return { label: token };
        const winner = score.a > score.b ? a.team : b.team;
        const loser = score.a > score.b ? b.team : a.team;
        return kind === 'W' ? { team: winner, label: winner.name } : { team: loser, label: loser.name };
      }

      const directTeam = teamById.get(token);
      if (directTeam) return { team: directTeam, label: directTeam.name };

      return { label: token };
    };

    return resolve(id, sourceMatchId);
  }, [disciplineScores, fifaRanking, matches, officialResults, teamById, knockoutMatches]);

  const groupResultsTotal = useMemo(() => matches.length, [matches]);
  const groupResultsCount = useMemo(() => {
    return matches.filter(m => {
      const official = officialResults[m.id];
      return official && official.a !== null && official.b !== null;
    }).length;
  }, [matches, officialResults]);
  const groupResultsComplete = groupResultsTotal > 0 && groupResultsCount === groupResultsTotal;

  const handleScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
    if (predictionsLocked) return;
    const numValue = value === '' ? null : parseInt(value);
    if (matchId.length <= 3) {
      setKnockoutScores(prev => {
        const current = prev[matchId] || { a: null, b: null };
        const updated = { ...prev, [matchId]: { ...current, [team.toLowerCase()]: numValue } };
        if (updated[matchId].a !== null && updated[matchId].b !== null) savePrediction(matchId, updated[matchId].a!, updated[matchId].b!);
        return updated;
      });
    } else {
      setMatches(prev => prev.map(m => {
        if (m.id === matchId) {
          const updated = { ...m, [team === 'A' ? 'scoreA' : 'scoreB']: numValue };
          if (updated.scoreA !== null && updated.scoreB !== null) savePrediction(matchId, updated.scoreA, updated.scoreB);
          return updated;
        }
        return m;
      }));
    }
  };

  if (loading) return null; // O loader do HTML cuida disso
  
  if (!session || isResettingPassword) return <Auth />;

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="sticky top-0 z-50 glass border-b border-slate-200 relative">
          <div className="max-w-[1600px] mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/logobolao.png" alt="Bolão" className="h-14 w-14 md:h-20 md:w-20 object-contain" />
              <span className="truncate font-black text-sm md:text-lg text-indigo-900 leading-none tracking-tighter">COPA2026 ADMIN</span>
            </div>
            <div className="hidden md:flex gap-2">
              <a href="/" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">Voltar ao app</a>
              <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
            </div>
            <button
              type="button"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu"
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden absolute left-0 right-0 top-full border-b border-slate-200 bg-white shadow-lg">
              <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-2">
                <a href="/" className="rounded-xl px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Voltar ao app</a>
                <button onClick={() => supabase.auth.signOut()} className="rounded-xl px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50">Sair</button>
              </div>
            </div>
          )}
        </nav>
        {roleLoading ? (
          <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando permissÃµes...</div>
        ) : (
          <AdminDashboard
            isAdmin={isAdmin}
            predictionsLocked={predictionsLocked}
            officialResults={officialResults}
            disciplineScores={disciplineScores}
            fifaRanking={fifaRanking}
            onToggleLock={updatePredictionsLocked}
            onSaveOfficial={saveOfficialResult}
            onSaveTeamTiebreaker={saveTeamTiebreaker}
            onClearOfficialResults={clearOfficialResults}
            onSendReminder={sendCompletionReminder}
            onTogglePayment={updateProfilePaymentStatus}
            onDeletePlayer={deletePlayer}
            onRefreshCompletion={fetchRankingData}
            currentUserId={session?.user?.id ?? null}
            groupMatches={matches}
            knockoutMatches={knockoutMatches}
            resolvePlaceholder={resolveOfficialPlaceholder}
            groupResultsComplete={groupResultsComplete}
            groupResultsCount={groupResultsCount}
            groupResultsTotal={groupResultsTotal}
            profiles={profiles}
            predictions={allPredictions}
            completionLoading={rankingLoading}
          />
        )}
      </div>
    );
  }

  if (isRankingRoute) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="sticky top-0 z-50 glass border-b border-slate-200 relative">
          <div className="max-w-[1600px] mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/logobolao.png" alt="Bolão" className="h-14 w-14 md:h-20 md:w-20 object-contain" />
              <span className="truncate font-black text-sm md:text-lg text-indigo-900 leading-none tracking-tighter">BOLÃO DA COPA DO MANDUCA</span>
            </div>
            <div className="hidden md:flex gap-2">
              <a href="/" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">VOLTAR AOS SEUS RESULTADOS</a>
              {isAdmin && (
                <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-indigo-600 hover:bg-indigo-50">ADMIN</a>
              )}
              <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
            </div>
            <button
              type="button"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu"
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden absolute left-0 right-0 top-full border-b border-slate-200 bg-white shadow-lg">
              <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-2">
                <a href="/" className="rounded-xl px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Voltar aos seus resultados</a>
                {isAdmin && (
                  <a href="/admin" className="rounded-xl px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50">Admin</a>
                )}
                <button onClick={() => supabase.auth.signOut()} className="rounded-xl px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50">Sair</button>
              </div>
            </div>
          )}
        </nav>
        <RankingView
          profiles={profiles}
          predictions={allPredictions}
          officialResults={officialResults}
          disciplineScores={disciplineScores}
          fifaRanking={fifaRanking}
          loading={rankingLoading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="sticky top-0 z-50 glass border-b border-slate-200 relative">
        <div className="max-w-[1600px] mx-auto px-4 h-20 md:h-24 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/logobolao.png" alt="Bolão" className="h-14 w-14 md:h-20 md:w-20 object-contain" />
            <span className="truncate font-black text-sm md:text-lg text-indigo-900 leading-none tracking-tighter">BOLÃO DA COPA DO MANDUCA</span>
          </div>
          <div className="hidden md:flex gap-2">

            <button onClick={() => setView(ViewMode.GROUPS)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.GROUPS ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>GRUPOS</button>
            <button onClick={openKnockoutView} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.KNOCKOUT ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>MATA-MATA</button>
            <button onClick={() => setView(ViewMode.OFFICIAL)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.OFFICIAL ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>RESULTADOS</button>
            <a href="/ranking" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">
              RANKING
            </a>
            {isAdmin && (
              <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-indigo-600 hover:bg-indigo-50">
                ADMIN
              </a>
            )}
          </div>
          <button onClick={() => supabase.auth.signOut()} className="hidden md:inline-flex text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
        </div>
      </nav>
      {showIncompleteGroupsModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incomplete-groups-title"
          onClick={() => setShowIncompleteGroupsModal(false)}
        >
          <section
            className="w-full max-w-2xl overflow-hidden rounded-lg border-2 border-red-700 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start gap-4 bg-red-700 px-5 py-5 text-white">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white text-xl font-black"
                aria-hidden="true"
              >
                !
              </span>
              <div className="min-w-0">
                <h2 id="incomplete-groups-title" className="text-lg font-black">
                  Ainda faltam placares na fase de grupos
                </h2>
                <p className="mt-1 text-sm font-semibold text-red-100">
                  Preencha os dois campos de gols em cada jogo antes de montar o mata-mata.
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-md bg-red-900/50 px-2.5 py-1 text-xs font-black">
                {incompleteGroupMatches.length} faltando
              </span>
            </header>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              <ul className="divide-y divide-red-100 border-y border-red-100">
                {incompleteGroupMatches.map((match) => (
                  <li key={match.id} className="grid grid-cols-[72px_1fr] gap-3 py-3 text-sm">
                    <span className="font-black text-red-700">Grupo {match.group}</span>
                    <span className="font-bold text-slate-800">{match.teamA} x {match.teamB}</span>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="flex justify-end border-t border-red-100 bg-red-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowIncompleteGroupsModal(false)}
                className="rounded-lg bg-red-700 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-200"
              >
                Voltar e preencher
              </button>
            </footer>
          </section>
        </div>
      )}
      <main className="prediction-shell max-w-[1600px] mx-auto px-4 py-8">
        <section className="prediction-top-card">
          <div>
            <h2 className="prediction-title">{view === ViewMode.OFFICIAL ? 'Resultados Oficiais' : 'Entrada de Resultados'}</h2>
            <dl className="prediction-legend" aria-label="Legenda da tabela de classificacao">
              <div><dt>PG</dt><dd>Pontos Ganhos</dd></div>
              <div><dt>SG</dt><dd>Saldo de Gols</dd></div>
              <div><dt>GT</dt><dd>Gols Totais</dd></div>
              <div><dt>DISC</dt><dd>Pontos de disciplina</dd></div>
              <div><dt>FIFA</dt><dd>Ranking FIFA</dd></div>
            </dl>
          </div>
          <div className="prediction-chips">
            <span className="prediction-chip">{predictionsLocked ? 'Resultados bloqueados' : 'Resultados abertos'}</span>
          </div>
        </section>

        <div className="prediction-mobile-tabs" data-testid="prediction-mobile-tabs">
          <button
            type="button"
            className={`prediction-mobile-tab ${view === ViewMode.GROUPS ? 'is-active' : ''}`}
            onClick={() => setView(ViewMode.GROUPS)}
          >
            Grupos
          </button>
          <button
            type="button"
            className={`prediction-mobile-tab ${view === ViewMode.KNOCKOUT ? 'is-active' : ''}`}
            onClick={openKnockoutView}
          >
            Mata-mata
          </button>
          <a href="/ranking" className="prediction-mobile-tab">
            Ranking
          </a>
          <button
            type="button"
            className={`prediction-mobile-tab ${view === ViewMode.OFFICIAL ? 'is-active' : ''}`}
            onClick={() => setView(ViewMode.OFFICIAL)}
          >
            Resultados
          </button>
        </div>
        {predictionsLocked && view !== ViewMode.OFFICIAL && (
          <div className="mb-6 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold rounded-xl px-4 py-3">
            Resultados encerrados. Acompanhe a comparação de resultados abaixo!
          </div>
        )}
        {view === ViewMode.GROUPS ? (
          <>
          {predictionsLocked ? (
            <div className="pv-groups-blocked-grid" data-testid="groups-blocked-grid">
              {groupCardsData.map((groupCard) => (
                <section
                  key={groupCard.groupLetter}
                  className="pv-group-blocked-card"
                  data-testid={`group-blocked-card-${groupCard.groupLetter}`}
                >
                  <header className="pv-group-blocked-head">
                    <h3 className="pv-group-title">Grupo {groupCard.groupLetter}</h3>
                    <span className="pv-group-chip">{groupCard.resultRows.length} jogos</span>
                  </header>

                  <div className="pv-group-blocked-body">
                    <div className="pv-group-blocked-results">
                      <table className="pv-group-results-table" data-testid={`group-results-table-${groupCard.groupLetter}`}>
                        <thead>
                          <tr>
                            <th>Jogo</th>
                            <th className="is-center">Res.Ofic</th>
                            <th className="is-center">Palpite</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupCard.resultRows.map((row) => (
                            <tr key={row.matchId} data-testid="groups-results-row">
                              <td>
                                <div className="pv-tracking-matchup">
                                  <span className="pv-tracking-team pv-tracking-team-a">
                                    {row.teamA && (
                                      <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamA.name}`}>
                                        <img
                                          src={`https://flagcdn.com/w20/${row.teamA.iso2.toLowerCase()}.png`}
                                          srcSet={`https://flagcdn.com/w40/${row.teamA.iso2.toLowerCase()}.png 2x`}
                                          alt={`Bandeira ${row.teamA.name}`}
                                          className="pv-flag"
                                          loading="lazy"
                                          onError={(event) => {
                                            event.currentTarget.style.display = 'none';
                                            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'inline-flex';
                                          }}
                                        />
                                        <span className="pv-flag-fallback">{row.teamA.iso2.toUpperCase().slice(0, 2)}</span>
                                      </span>
                                    )}
                                    <span className="pv-team-name">{row.teamA?.name ?? '-'}</span>
                                  </span>
                                  <span className="pv-tracking-vs">vs</span>
                                  <span className="pv-tracking-team pv-tracking-team-b">
                                    {row.teamB && (
                                      <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamB.name}`}>
                                        <img
                                          src={`https://flagcdn.com/w20/${row.teamB.iso2.toLowerCase()}.png`}
                                          srcSet={`https://flagcdn.com/w40/${row.teamB.iso2.toLowerCase()}.png 2x`}
                                          alt={`Bandeira ${row.teamB.name}`}
                                          className="pv-flag"
                                          loading="lazy"
                                          onError={(event) => {
                                            event.currentTarget.style.display = 'none';
                                            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'inline-flex';
                                          }}
                                        />
                                        <span className="pv-flag-fallback">{row.teamB.iso2.toUpperCase().slice(0, 2)}</span>
                                      </span>
                                    )}
                                    <span className="pv-team-name">{row.teamB?.name ?? '-'}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="is-center">
                                {row.officialA !== null && row.officialB !== null ? `${row.officialA} x ${row.officialB}` : '-'}
                              </td>
                              <td className="is-center">
                                {row.predictedA !== null && row.predictedA !== undefined && row.predictedB !== null && row.predictedB !== undefined
                                  ? `${row.predictedA} x ${row.predictedB}`
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pv-group-blocked-standings">
                      <table className="pv-group-standings-mini-table is-expanded" data-testid={`group-standings-table-${groupCard.groupLetter}`}>
                        <thead>
                          <tr>
                            <th className="is-center">Seleção</th>
                            <th className="is-center">PG</th>
                            <th className="is-center">SG</th>
                            <th className="is-center">GT</th>
                            <th className="is-center">DISC</th>
                            <th className="is-center">FIFA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupCard.standings.map((row) => (
                            <tr key={`${groupCard.groupLetter}-${row.teamId}`} data-testid="groups-standings-row">
                              <td className="is-center" title={row.teamName}>
                                <span className="pv-tracking-team">
                                  {row.teamIso2 ? (
                                    <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamName}`}>
                                      <img
                                        src={`https://flagcdn.com/w20/${row.teamIso2.toLowerCase()}.png`}
                                        srcSet={`https://flagcdn.com/w40/${row.teamIso2.toLowerCase()}.png 2x`}
                                        alt={`Bandeira ${row.teamName}`}
                                        className="pv-flag"
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.style.display = 'none';
                                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                          if (fallback) fallback.style.display = 'inline-flex';
                                        }}
                                      />
                                      <span className="pv-flag-fallback">{row.teamIso2.toUpperCase().slice(0, 2)}</span>
                                    </span>
                                  ) : null}
                                </span>
                              </td>
                              <td className="is-center">{row.points}</td>
                              <td className="is-center">{row.goalsDifference}</td>
                              <td className="is-center">{row.goalsFor}</td>
                              <td className="is-center">{row.disciplineScore ?? '-'}</td>
                              <td className="is-center">{row.fifaRank ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="pv-groups-grid">
              {GROUPS.map(g => (
                <GroupCard
                  key={g}
                  groupLetter={g}
                  teams={TEAMS_DATA.filter(t => t.group === g)}
                  matches={matches.filter(m => m.group === g)}
                  onScoreChange={handleScoreChange}
                  predictionsLocked={!!predictionsLocked}
                  officialScores={officialResults}
                  disciplineScores={disciplineScores}
                  fifaRanking={fifaRanking}
                />
              ))}
            </div>
          )}

          <section className="pv-third-table-card" data-testid="best-third-places-table">
            <header className="pv-third-head">
              <div>
                <p className="pv-third-kicker">{predictionsLocked ? 'Resultados oficiais' : 'Simulacao do palpite'}</p>
                <h3 className="pv-third-title">Melhores terceiros</h3>
              </div>
              <span className="pv-third-chip">Top 8 avancam</span>
            </header>

            <div className="pv-third-scroll">
              <table className="pv-third-table">
                <thead>
                  <tr>
                    <th className="is-center">#</th>
                    <th>Selecao</th>
                    <th className="is-center">Grupo</th>
                    <th className="is-center">J</th>
                    <th className="is-center">PG</th>
                    <th className="is-center">SG</th>
                    <th className="is-center">GT</th>
                    <th className="is-center">GC</th>
                    <th className="is-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {thirdPlaceRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="pv-third-empty">
                        Sem dados suficientes para ordenar os terceiros.
                      </td>
                    </tr>
                  ) : (
                    thirdPlaceRows.map((row) => (
                      <tr key={`${row.groupLetter}-${row.teamId}`} className={row.qualified ? 'is-qualified' : 'is-out'} data-testid="best-third-place-row">
                        <td className="is-center pv-third-position">{row.position}</td>
                        <td>
                          <span className="pv-third-team">
                            {row.teamIso2 ? (
                              <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamName}`}>
                                <img
                                  src={`https://flagcdn.com/w20/${row.teamIso2.toLowerCase()}.png`}
                                  srcSet={`https://flagcdn.com/w40/${row.teamIso2.toLowerCase()}.png 2x`}
                                  alt={`Bandeira ${row.teamName}`}
                                  className="pv-flag"
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                    const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = 'inline-flex';
                                  }}
                                />
                                <span className="pv-flag-fallback">{row.teamIso2.toUpperCase().slice(0, 2)}</span>
                              </span>
                            ) : null}
                            <span className="pv-team-name">{row.teamName}</span>
                          </span>
                        </td>
                        <td className="is-center">{row.groupLetter}</td>
                        <td className="is-center">{row.played}</td>
                        <td className="is-center">{row.points}</td>
                        <td className="is-center">{row.goalsDifference}</td>
                        <td className="is-center">{row.goalsFor}</td>
                        <td className="is-center">{row.goalsAgainst}</td>
                        <td className="is-center">
                          <span className={`pv-third-status ${row.qualified ? 'is-in' : 'is-out'}`}>
                            {row.qualified ? 'Avanca' : 'Fora'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </>
        ) : view === ViewMode.KNOCKOUT ? (
          <KnockoutBracket
            allTeams={TEAMS_DATA}
            knockoutMatches={knockoutMatches}
            onScoreChange={handleScoreChange}
            resolvePlaceholder={resolvePlaceholder}
            predictionsLocked={!!predictionsLocked}
            officialScores={officialResults}
          />
        ) : (
          <section className="pv-official-view" data-testid="official-results-view">
            <div className="pv-official-section">
              <header className="pv-official-head">
                <h3 className="pv-official-title">Fase de grupos</h3>
                <span className="pv-third-chip">{groupResultsCount} de {groupResultsTotal} resultados</span>
              </header>
              <div className="pv-official-groups-grid">
                {groupCardsData.map((groupCard) => (
                  <article key={groupCard.groupLetter} className="pv-official-group-card">
                    <header className="pv-group-blocked-head">
                      <h4 className="pv-group-title">Grupo {groupCard.groupLetter}</h4>
                      <span className="pv-group-chip">{groupCard.resultRows.length} jogos</span>
                    </header>
                    <div className="pv-official-group-body">
                      <div className="pv-group-blocked-results">
                        <table className="pv-group-results-table">
                          <thead>
                            <tr>
                              <th>Jogo</th>
                              <th className="is-center">Oficial</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupCard.resultRows.map((row) => (
                              <tr key={row.matchId}>
                                <td>
                                  <div className="pv-tracking-matchup">
                                    <span className="pv-tracking-team pv-tracking-team-a">
                                      {row.teamA && (
                                        <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamA.name}`}>
                                          <img
                                            src={`https://flagcdn.com/w20/${row.teamA.iso2.toLowerCase()}.png`}
                                            srcSet={`https://flagcdn.com/w40/${row.teamA.iso2.toLowerCase()}.png 2x`}
                                            alt={`Bandeira ${row.teamA.name}`}
                                            className="pv-flag"
                                            loading="lazy"
                                            onError={(event) => {
                                              event.currentTarget.style.display = 'none';
                                              const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                              if (fallback) fallback.style.display = 'inline-flex';
                                            }}
                                          />
                                          <span className="pv-flag-fallback">{row.teamA.iso2.toUpperCase().slice(0, 2)}</span>
                                        </span>
                                      )}
                                      <span className="pv-team-name">{row.teamA?.name ?? '-'}</span>
                                    </span>
                                    <span className="pv-tracking-vs">vs</span>
                                    <span className="pv-tracking-team pv-tracking-team-b">
                                      {row.teamB && (
                                        <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamB.name}`}>
                                          <img
                                            src={`https://flagcdn.com/w20/${row.teamB.iso2.toLowerCase()}.png`}
                                            srcSet={`https://flagcdn.com/w40/${row.teamB.iso2.toLowerCase()}.png 2x`}
                                            alt={`Bandeira ${row.teamB.name}`}
                                            className="pv-flag"
                                            loading="lazy"
                                            onError={(event) => {
                                              event.currentTarget.style.display = 'none';
                                              const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                              if (fallback) fallback.style.display = 'inline-flex';
                                            }}
                                          />
                                          <span className="pv-flag-fallback">{row.teamB.iso2.toUpperCase().slice(0, 2)}</span>
                                        </span>
                                      )}
                                      <span className="pv-team-name">{row.teamB?.name ?? '-'}</span>
                                    </span>
                                  </div>
                                </td>
                                <td className="is-center">
                                  {row.officialA !== null && row.officialB !== null ? `${row.officialA} x ${row.officialB}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="pv-group-blocked-standings">
                        <table className="pv-group-standings-mini-table is-expanded">
                          <thead>
                            <tr>
                              <th className="is-center">Sel.</th>
                              <th className="is-center">PG</th>
                              <th className="is-center">SG</th>
                              <th className="is-center">GT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupCard.standings.map((row) => (
                              <tr key={`${groupCard.groupLetter}-${row.teamId}`}>
                                <td className="is-center" title={row.teamName}>
                                  {row.teamIso2 ? (
                                    <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamName}`}>
                                      <img
                                        src={`https://flagcdn.com/w20/${row.teamIso2.toLowerCase()}.png`}
                                        srcSet={`https://flagcdn.com/w40/${row.teamIso2.toLowerCase()}.png 2x`}
                                        alt={`Bandeira ${row.teamName}`}
                                        className="pv-flag"
                                        loading="lazy"
                                        onError={(event) => {
                                          event.currentTarget.style.display = 'none';
                                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                          if (fallback) fallback.style.display = 'inline-flex';
                                        }}
                                      />
                                      <span className="pv-flag-fallback">{row.teamIso2.toUpperCase().slice(0, 2)}</span>
                                    </span>
                                  ) : null}
                                </td>
                                <td className="is-center">{row.points}</td>
                                <td className="is-center">{row.goalsDifference}</td>
                                <td className="is-center">{row.goalsFor}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <section className="pv-third-table-card" data-testid="official-best-third-places-table">
              <header className="pv-third-head">
                <div>
                  <p className="pv-third-kicker">Resultados oficiais</p>
                  <h3 className="pv-third-title">Melhores terceiros</h3>
                </div>
                <span className="pv-third-chip">Top 8 avancam</span>
              </header>
              <div className="pv-third-scroll">
                <table className="pv-third-table">
                  <thead>
                    <tr>
                      <th className="is-center">#</th>
                      <th>Selecao</th>
                      <th className="is-center">Grupo</th>
                      <th className="is-center">J</th>
                      <th className="is-center">PG</th>
                      <th className="is-center">SG</th>
                      <th className="is-center">GT</th>
                      <th className="is-center">GC</th>
                      <th className="is-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialThirdPlaceRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="pv-third-empty">Sem resultados oficiais suficientes para ordenar os terceiros.</td>
                      </tr>
                    ) : (
                      officialThirdPlaceRows.map((row) => (
                        <tr key={`${row.groupLetter}-${row.teamId}`} className={row.qualified ? 'is-qualified' : 'is-out'}>
                          <td className="is-center pv-third-position">{row.position}</td>
                          <td>
                            <span className="pv-third-team">
                              {row.teamIso2 ? (
                                <span className="pv-flag-wrap" aria-label={`Bandeira ${row.teamName}`}>
                                  <img
                                    src={`https://flagcdn.com/w20/${row.teamIso2.toLowerCase()}.png`}
                                    srcSet={`https://flagcdn.com/w40/${row.teamIso2.toLowerCase()}.png 2x`}
                                    alt={`Bandeira ${row.teamName}`}
                                    className="pv-flag"
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                      const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                      if (fallback) fallback.style.display = 'inline-flex';
                                    }}
                                  />
                                  <span className="pv-flag-fallback">{row.teamIso2.toUpperCase().slice(0, 2)}</span>
                                </span>
                              ) : null}
                              <span className="pv-team-name">{row.teamName}</span>
                            </span>
                          </td>
                          <td className="is-center">{row.groupLetter}</td>
                          <td className="is-center">{row.played}</td>
                          <td className="is-center">{row.points}</td>
                          <td className="is-center">{row.goalsDifference}</td>
                          <td className="is-center">{row.goalsFor}</td>
                          <td className="is-center">{row.goalsAgainst}</td>
                          <td className="is-center">
                            <span className={`pv-third-status ${row.qualified ? 'is-in' : 'is-out'}`}>{row.qualified ? 'Avanca' : 'Fora'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="pv-official-section">
              <header className="pv-official-head">
                <h3 className="pv-official-title">Mata-mata</h3>
                <span className="pv-third-chip">Todas as fases</span>
              </header>
              <div className="pv-official-rounds">
                {officialKnockoutRounds.map((round) => (
                  <article key={round.title} className="pv-official-round-card">
                    <header className="pv-round-head">{round.title}</header>
                    <div className="pv-official-match-list">
                      {round.matches.map((match) => {
                        const teamA = resolveOfficialPlaceholder(match.teamA, match.id);
                        const teamB = resolveOfficialPlaceholder(match.teamB, match.id);
                        return (
                          <div key={match.id} className="pv-official-match-row">
                            <span className="pv-ko-match-tag">Jogo {match.id}</span>
                            <span className={`pv-official-match-team ${teamA.team ? '' : 'is-placeholder'}`}>{teamA.team?.name ?? match.teamA}</span>
                            <span className="pv-official-score">{match.scoreA !== null && match.scoreB !== null ? `${match.scoreA} x ${match.scoreB}` : '-'}</span>
                            <span className={`pv-official-match-team ${teamB.team ? '' : 'is-placeholder'}`}>{teamB.team?.name ?? match.teamB}</span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
