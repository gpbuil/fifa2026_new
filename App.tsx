
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { TEAMS_DATA, GROUPS } from './data/teams';
import { Match, ViewMode } from './types';
import Auth from './components/Auth';
import GroupCard from './components/GroupCard';
import KnockoutBracket from './components/KnockoutBracket';
import AdminDashboard from './components/AdminDashboard';
import RankingView from './components/RankingView';
import { getAdvancedTeams, calculateGroupStandings } from './services/simulator';
import './components/prediction-view.css';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.GROUPS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [knockoutScores, setKnockoutScores] = useState<Record<string, {a: number | null, b: number | null}>>({});
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [predictionsLocked, setPredictionsLocked] = useState<boolean | null>(null);
  const [officialResults, setOfficialResults] = useState<Record<string, {a: number | null, b: number | null}>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);
  const [allPredictions, setAllPredictions] = useState<{ user_id: string; match_id: string; score_a: number | null; score_b: number | null }[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isAdminRoute = pathname.startsWith('/admin');
  const isRankingRoute = pathname.startsWith('/ranking');

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

  const fetchRankingData = useCallback(async () => {
    setRankingLoading(true);
    try {
      const { data: rankingRows, error: rankingRpcError } = await supabase.rpc('get_ranking_rows');

      if (!rankingRpcError && Array.isArray(rankingRows) && rankingRows.length > 0) {
        const rowByUser = new Map<string, { id: string; full_name: string | null }>();
        const predictionsRows: { user_id: string; match_id: string; score_a: number | null; score_b: number | null }[] = [];

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

        setProfiles(Array.from(rowByUser.values()));
        setAllPredictions(predictionsRows);
      } else {
        const [{ data: profilesData, error: profilesError }, { data: predictionsData, error: predictionsError }] = await Promise.all([
          supabase.from('profiles').select('id, full_name'),
          supabase.from('predictions').select('user_id, match_id, score_a, score_b')
        ]);
        if (profilesError) throw profilesError;
        if (predictionsError) throw predictionsError;

        const profilesRows = profilesData ?? [];
        const predictionsRows = predictionsData ?? [];
        const profileById = new Map(profilesRows.map((p) => [p.id, p]));
        const predictionUserIds = Array.from(new Set(predictionsRows.map((p) => p.user_id)));
        const predictionUserIdSet = new Set(predictionUserIds);

        const rankingProfiles = [
          ...predictionUserIds.map((userId) => ({
            id: userId,
            full_name: profileById.get(userId)?.full_name ?? `Jogador ${userId.slice(0, 6)}`
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
  }, [fetchSettings, fetchOfficialResults]);

  useEffect(() => {
    if (isRankingRoute) fetchRankingData();
  }, [isRankingRoute, fetchRankingData]);

  const savePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!session?.user?.id) return;
    if (predictionsLocked) return;
    try {
      await supabase.from('predictions').upsert({
        user_id: session.user.id, 
        match_id: matchId, 
        score_a: scoreA, 
        score_b: scoreB, 
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,match_id' });
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

  const teamById = useMemo(() => {
    const map = new Map<string, typeof TEAMS_DATA[number]>();
    TEAMS_DATA.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  const groupPlacements = useMemo(() => {
    const map = new Map<string, string>();
    GROUPS.forEach(groupLetter => {
      const groupTeams = TEAMS_DATA.filter(t => t.group === groupLetter);
      const groupMatches = matches.filter(m => m.group === groupLetter);
      const standings = calculateGroupStandings(groupTeams, groupMatches);
      const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
      if (!hasAnyMatch) return;
      const top3 = standings.slice(0, 3).map(s => s.teamId);
      if (top3[0]) map.set(`1${groupLetter}`, top3[0]);
      if (top3[1]) map.set(`2${groupLetter}`, top3[1]);
      if (top3[2]) map.set(`3${groupLetter}`, top3[2]);
    });
    return map;
  }, [matches]);

  const { bestThirdPlaces } = useMemo(() => {
    return getAdvancedTeams(GROUPS, TEAMS_DATA, matches);
  }, [matches]);

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

  const resolvePlaceholder = useCallback((id: string) => {
    const visited = new Set<string>();

    const resolve = (token: string): { team?: typeof TEAMS_DATA[number]; label: string } => {
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
        const index = parseInt(thirdMatch[1], 10) - 1;
        const team = bestThirdPlaces[index];
        return team ? { team, label: team.name } : { label: token };
      }

      const wlMatch = token.match(/^([WL])(\d{2,3})$/i);
      if (wlMatch) {
        const kind = wlMatch[1].toUpperCase();
        const matchId = wlMatch[2];
        const match = knockoutMatches.find(m => m.id === matchId);
        if (!match) return { label: token };
        const a = resolve(match.teamA);
        const b = resolve(match.teamB);
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

    return resolve(id);
  }, [bestThirdPlaces, groupPlacements, knockoutMatches, teamById]);

  const resolveOfficialPlaceholder = useCallback((id: string) => {
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
      const standings = calculateGroupStandings(groupTeams, groupMatches);
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
    }));

    const resolve = (token: string): { team?: typeof TEAMS_DATA[number]; label: string } => {
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
        const index = parseInt(thirdMatch[1], 10) - 1;
        const team = officialAdvanced.bestThirdPlaces[index];
        return team ? { team, label: team.name } : { label: token };
      }

      const wlMatch = token.match(/^([WL])(\d{2,3})$/i);
      if (wlMatch) {
        const kind = wlMatch[1].toUpperCase();
        const matchId = wlMatch[2];
        const match = knockoutMatches.find(m => m.id === matchId);
        if (!match) return { label: token };
        const a = resolve(match.teamA);
        const b = resolve(match.teamB);
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

    return resolve(id);
  }, [matches, officialResults, teamById, knockoutMatches]);

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
        <nav className="sticky top-0 z-50 glass border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-4 h-24 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logobolao.png" alt="Bolão" className="h-20 w-20 object-contain" />
              <span className="font-black text-lg text-indigo-900 leading-none tracking-tighter">COPA2026 ADMIN</span>
            </div>
            <div className="flex gap-2">
              <a href="/" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">Voltar ao app</a>
              <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
            </div>
          </div>
        </nav>
        {roleLoading ? (
          <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando permissÃµes...</div>
        ) : (
          <AdminDashboard
            isAdmin={isAdmin}
            predictionsLocked={predictionsLocked}
            officialResults={officialResults}
            onToggleLock={updatePredictionsLocked}
            onSaveOfficial={saveOfficialResult}
            groupMatches={matches}
            knockoutMatches={knockoutMatches}
            resolvePlaceholder={resolveOfficialPlaceholder}
            groupResultsComplete={groupResultsComplete}
            groupResultsCount={groupResultsCount}
            groupResultsTotal={groupResultsTotal}
          />
        )}
      </div>
    );
  }

  if (isRankingRoute) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="sticky top-0 z-50 glass border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-4 h-24 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logobolao.png" alt="Bolão" className="h-20 w-20 object-contain" />
              <span className="font-black text-lg text-indigo-900 leading-none tracking-tighter">COPA2026 RANKING</span>
            </div>
            <div className="flex gap-2">
              <a href="/" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">Voltar ao app</a>
              {isAdmin && (
                <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-indigo-600 hover:bg-indigo-50">ADMIN</a>
              )}
              <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
            </div>
          </div>
        </nav>
        <RankingView
          profiles={profiles}
          predictions={allPredictions}
          officialResults={officialResults}
          loading={rankingLoading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logobolao.png" alt="Bolão" className="h-20 w-20 object-contain" />
            <span className="font-black text-lg text-indigo-900 leading-none tracking-tighter">COPA2026</span>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-indigo-600 hover:bg-indigo-50">
                ADMIN
              </a>
            )}
            <a href="/ranking" className="px-4 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-slate-100">
              RANKING
            </a>
            <button onClick={() => setView(ViewMode.GROUPS)} className={`hidden md:inline-flex px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.GROUPS ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>GRUPOS</button>
            <button onClick={() => setView(ViewMode.KNOCKOUT)} className={`hidden md:inline-flex px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.KNOCKOUT ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>MATA-MATA</button>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
        </div>
      </nav>
      <main className="prediction-shell max-w-[1600px] mx-auto px-4 py-8">
        <section className="prediction-top-card">
          <div>
            <p className="prediction-kicker">Copa 2026</p>
            <h2 className="prediction-title">Entrada de Resultados</h2>
            <p className="prediction-subtitle">Layout condensado para preencher jogos com mais velocidade.</p>
          </div>
          <div className="prediction-chips">
            <span className="prediction-chip">Grupos: {GROUPS.length}</span>
            <span className="prediction-chip">Mata-mata: {knockoutMatches.length} jogos</span>
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
            onClick={() => setView(ViewMode.KNOCKOUT)}
          >
            Mata-mata
          </button>
        </div>
        {predictionsLocked && (
          <div className="mb-6 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-semibold rounded-xl px-4 py-3">
            Resultados encerrados. Agora vocÃª acompanha a comparaÃ§Ã£o com os resultados oficiais.
          </div>
        )}
        {view === ViewMode.GROUPS ? (
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
                />
              ))}
            </div>
        ) : (
          <KnockoutBracket
            allTeams={TEAMS_DATA}
            knockoutMatches={knockoutMatches}
            onScoreChange={handleScoreChange}
            resolvePlaceholder={resolvePlaceholder}
            predictionsLocked={!!predictionsLocked}
            officialScores={officialResults}
          />
        )}
      </main>
    </div>
  );
};

export default App;






