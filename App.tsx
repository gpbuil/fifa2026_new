
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabase';
import { TEAMS_DATA, GROUPS } from './data/teams';
import { Match, ViewMode, Prediction, Team } from './types';
import Auth from './components/Auth';
import GroupCard from './components/GroupCard';
import KnockoutBracket from './components/KnockoutBracket';
import { getAdvancedTeams, calculateGroupStandings } from './services/simulator';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.GROUPS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [knockoutScores, setKnockoutScores] = useState<Record<string, {a: number | null, b: number | null}>>({});
  const [loading, setLoading] = useState(true);

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

  // Estrutura com mapeamento exato de grupos para os 3º colocados
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error && error.message.includes('Refresh Token Not Found')) await supabase.auth.signOut();
        setSession(session);
        if (session) fetchPredictions(session.user.id);
      } catch (e) { console.error(e); } 
      finally { 
        setMatches(initMatches());
        setLoading(false);
      }
    };
    initializeAuth();
  }, [initMatches]);

  const fetchPredictions = async (userId: string) => {
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
    } catch (e) { console.error(e); }
  };

  const savePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!session?.user?.id) return;
    await supabase.from('predictions').upsert({
      user_id: session.user.id, match_id: matchId, score_a: scoreA, score_b: scoreB, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,match_id' });
  };

  const knockoutMatches = useMemo(() => {
    const k: Match[] = [];

    // 1. Round of 32
    R32_STRUCTURE.forEach(struct => {
      const score = knockoutScores[struct.id] || { a: null, b: null };
      k.push({ id: struct.id, group: 'KO', teamA: struct.a, teamB: struct.b, scoreA: score.a, scoreB: score.b, venue: struct.venue });
    });

    // 2. Round of 16
    const r16Map = [
      { id: '89', wA: '74', wB: '77', v: 'Philadelphia' }, { id: '90', wA: '73', wB: '75', v: 'Houston' },
      { id: '91', wA: '76', wB: '78', v: 'New York/NJ' }, { id: '92', wA: '79', wB: '80', v: 'Mexico City' },
      { id: '93', wA: '83', wB: '84', v: 'Dallas' }, { id: '94', wA: '81', wB: '82', v: 'Seattle' },
      { id: '95', wA: '86', wB: '88', v: 'Atlanta' }, { id: '96', wA: '85', wB: '87', v: 'Vancouver' }
    ];
    r16Map.forEach(map => {
      const score = knockoutScores[map.id] || { a: null, b: null };
      const matchA = k.find(m => m.id === map.wA);
      const matchB = k.find(m => m.id === map.wB);
      let teamA = `Venc. ${map.wA}`, teamB = `Venc. ${map.wB}`;
      if (matchA?.scoreA !== null && matchA?.scoreB !== null) teamA = matchA.scoreA > matchA.scoreB ? matchA.teamA : matchA.teamB;
      if (matchB?.scoreA !== null && matchB?.scoreB !== null) teamB = matchB.scoreA > matchB.scoreB ? matchB.teamA : matchB.teamB;
      k.push({ id: map.id, group: 'KO', teamA, teamB, scoreA: score.a, scoreB: score.b, venue: map.v });
    });

    // 3. Quarter Finals
    const qfMap = [
      { id: '97', wA: '89', wB: '90', v: 'Boston' }, { id: '98', wA: '93', wB: '94', v: 'Los Angeles' },
      { id: '99', wA: '91', wB: '92', v: 'Miami' }, { id: '100', wA: '95', wB: '96', v: 'Kansas City' }
    ];
    qfMap.forEach(map => {
      const score = knockoutScores[map.id] || { a: null, b: null };
      const matchA = k.find(m => m.id === map.wA);
      const matchB = k.find(m => m.id === map.wB);
      let teamA = `Venc. ${map.wA}`, teamB = `Venc. ${map.wB}`;
      if (matchA?.scoreA !== null && matchA?.scoreB !== null) teamA = matchA.scoreA > matchA.scoreB ? matchA.teamA : matchA.teamB;
      if (matchB?.scoreA !== null && matchB?.scoreB !== null) teamB = matchB.scoreA > matchB.scoreB ? matchB.teamA : matchB.teamB;
      k.push({ id: map.id, group: 'KO', teamA, teamB, scoreA: score.a, scoreB: score.b, venue: map.v });
    });

    // 4. Semis
    const sfMap = [{ id: '101', wA: '97', wB: '98', v: 'Dallas' }, { id: '102', wA: '99', wB: '100', v: 'Atlanta' }];
    sfMap.forEach(map => {
      const score = knockoutScores[map.id] || { a: null, b: null };
      const matchA = k.find(m => m.id === map.wA);
      const matchB = k.find(m => m.id === map.wB);
      let teamA = `Venc. ${map.wA}`, teamB = `Venc. ${map.wB}`;
      if (matchA?.scoreA !== null && matchA?.scoreB !== null) teamA = matchA.scoreA > matchA.scoreB ? matchA.teamA : matchA.teamB;
      if (matchB?.scoreA !== null && matchB?.scoreB !== null) teamB = matchB.scoreA > matchB.scoreB ? matchB.teamA : matchB.teamB;
      k.push({ id: map.id, group: 'KO', teamA, teamB, scoreA: score.a, scoreB: score.b, venue: map.v });
    });

    // 5. 3rd Place (103)
    const score3 = knockoutScores['103'] || { a: null, b: null };
    const sf1 = k.find(m => m.id === '101');
    const sf2 = k.find(m => m.id === '102');
    let teamA3 = 'Perd. 101', teamB3 = 'Perd. 102';
    if (sf1?.scoreA !== null && sf1?.scoreB !== null) teamA3 = sf1.scoreA > sf1.scoreB ? sf1.teamB : sf1.teamA;
    if (sf2?.scoreA !== null && sf2?.scoreB !== null) teamB3 = sf2.scoreA > sf2.scoreB ? sf2.teamB : sf2.teamA;
    k.push({ id: '103', group: 'KO', teamA: teamA3, teamB: teamB3, scoreA: score3.a, scoreB: score3.b, venue: 'Miami' });

    // 6. Final (104)
    const scoreF = knockoutScores['104'] || { a: null, b: null };
    let teamAF = 'Venc. 101', teamBF = 'Venc. 102';
    if (sf1?.scoreA !== null && sf1?.scoreB !== null) teamAF = sf1.scoreA > sf1.scoreB ? sf1.teamA : sf1.teamB;
    if (sf2?.scoreA !== null && sf2?.scoreB !== null) teamBF = sf2.scoreA > sf2.scoreB ? sf2.teamA : sf2.teamB;
    k.push({ id: '104', group: 'KO', teamA: teamAF, teamB: teamBF, scoreA: scoreF.a, scoreB: scoreF.b, venue: 'New York/NJ' });

    return k;
  }, [knockoutScores, R32_STRUCTURE]);

  const resolvePlaceholder = useCallback((id: string) => {
    if (id.length === 3 && id === id.toUpperCase()) {
      const team = TEAMS_DATA.find(t => t.id === id);
      return { team, label: team?.name || id };
    }

    const advanced = getAdvancedTeams(GROUPS, TEAMS_DATA, matches);

    if (id.startsWith('3rd-')) {
      const parts = id.split('-');
      const rankIdx = parseInt(parts[1]) - 1;
      const groupHint = parts[2] || '';
      const team = advanced.bestThirdPlaces[rankIdx];
      
      if (team) return { team, label: team.name };
      return { label: `${rankIdx + 1}º Melhor 3º (${groupHint})` };
    }

    if (/^[123][A-L]$/.test(id)) {
      const pos = parseInt(id[0]);
      const grp = id[1];
      const groupTeams = TEAMS_DATA.filter(t => t.group === grp);
      const groupMatches = matches.filter(m => m.group === grp);
      const standings = calculateGroupStandings(groupTeams, groupMatches);
      const hasPlayed = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
      if (hasPlayed && standings[pos-1] && standings[pos-1].played > 0) {
        const team = TEAMS_DATA.find(t => t.id === standings[pos-1].teamId);
        if (team) return { team, label: team.name };
      }
      const labels: Record<string, string> = { '1': '1º', '2': '2º', '3': '3º' };
      return { label: `${labels[id[0]]} Grupo ${id[1]}` };
    }

    return { label: id.startsWith('Venc.') || id.startsWith('Perd.') ? id : id };
  }, [matches]);

  const handleScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-black text-xl text-indigo-900 tracking-tighter">COPA2026</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView(ViewMode.GROUPS)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.GROUPS ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>GRUPOS</button>
            <button onClick={() => setView(ViewMode.KNOCKOUT)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === ViewMode.KNOCKOUT ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>MATA-MATA</button>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 text-xs font-bold">Sair</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === ViewMode.GROUPS ? (
          <div className="space-y-8">
            <header>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Fase de Grupos</h1>
              <p className="text-slate-500 font-medium">Os 2 melhores de cada grupo + 8 melhores terceiros avançam.</p>
            </header>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {GROUPS.map(g => (
                <GroupCard key={g} groupLetter={g} teams={TEAMS_DATA.filter(t => t.group === g)} matches={matches.filter(m => m.group === g)} onScoreChange={handleScoreChange} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <header>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Chaveamento Final</h1>
              <p className="text-slate-500 font-medium">Da fase de 32 avos até a grande final em New York.</p>
            </header>
            <KnockoutBracket 
              allTeams={TEAMS_DATA}
              knockoutMatches={knockoutMatches} 
              onScoreChange={handleScoreChange}
              resolvePlaceholder={resolvePlaceholder}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
