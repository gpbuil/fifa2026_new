
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { TEAMS_DATA, GROUPS } from './data/teams';
import { Match, ViewMode, Prediction } from './types';
import Auth from './components/Auth';
import GroupCard from './components/GroupCard';
import KnockoutBracket from './components/KnockoutBracket';
import { getAdvancedTeams } from './services/simulator';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<ViewMode>(ViewMode.GROUPS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize Matches
  const initMatches = useCallback(() => {
    const initialMatches: Match[] = [];
    GROUPS.forEach(group => {
      const groupTeams = TEAMS_DATA.filter(t => t.group === group);
      // Simple round robin within group
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPredictions(session.user.id);
      else setMatches(initMatches());
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPredictions(session.user.id);
      else setMatches(initMatches());
    });

    return () => subscription.unsubscribe();
  }, [initMatches]);

  const fetchPredictions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;

      const baseMatches = initMatches();
      const updatedMatches = baseMatches.map(m => {
        const pred = data?.find((p: Prediction) => p.match_id === m.id);
        if (pred) {
          return { ...m, scoreA: pred.score_a, scoreB: pred.score_b };
        }
        return m;
      });
      setMatches(updatedMatches);
    } catch (e) {
      console.error('Error fetching predictions:', e);
      setMatches(initMatches());
    }
  };

  const savePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('predictions')
        .upsert({
          user_id: session.user.id,
          match_id: matchId,
          score_a: scoreA,
          score_b: scoreB,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,match_id' });
      
      if (error) throw error;
    } catch (e) {
      console.error('Error saving prediction:', e);
    }
  };

  const handleScoreChange = (matchId: string, team: 'A' | 'B', value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    setMatches(prev => {
      const updated = prev.map(m => {
        if (m.id === matchId) {
          const newMatch = { ...m, [team === 'A' ? 'scoreA' : 'scoreB']: numValue };
          if (newMatch.scoreA !== null && newMatch.scoreB !== null) {
             savePrediction(matchId, newMatch.scoreA, newMatch.scoreB);
          }
          return newMatch;
        }
        return m;
      });
      return updated;
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!session) return <Auth />;

  const advanced = getAdvancedTeams(GROUPS, TEAMS_DATA, matches);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-black text-xl text-indigo-900 tracking-tighter">COPA2026</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setView(ViewMode.GROUPS)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === ViewMode.GROUPS ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              GRUPOS
            </button>
            <button 
              onClick={() => setView(ViewMode.KNOCKOUT)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === ViewMode.KNOCKOUT ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              MATA-MATA
            </button>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === ViewMode.GROUPS ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-slate-900">Fase de Grupos</h1>
                <p className="text-slate-500">Insira os placares para ver a classificação em tempo real.</p>
              </div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-bold border border-green-200">
                {matches.filter(m => m.scoreA !== null).length} / {matches.length} Jogos Palpitados
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {GROUPS.map(group => (
                <GroupCard 
                  key={group}
                  groupLetter={group}
                  teams={TEAMS_DATA.filter(t => t.group === group)}
                  matches={matches.filter(m => m.group === group)}
                  onScoreChange={handleScoreChange}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <h1 className="text-4xl font-extrabold text-slate-900">Mata-Mata</h1>
            <p className="text-slate-500 mb-8">Baseado nos resultados dos 12 grupos + 8 melhores terceiros colocados.</p>
            <KnockoutBracket advanced={advanced} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© 2024 Copa 2026 Simulator | Desenvolvido com React & Supabase</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
