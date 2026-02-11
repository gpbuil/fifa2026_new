import React, { useMemo, useState } from 'react';
import { buildUserScoreSummary, PHASE_LABEL, UserScoreSummary } from '../services/scoring';

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

const RankingView: React.FC<RankingViewProps> = ({ profiles, predictions, officialResults, loading }) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const summaries = useMemo(() => {
    const grouped: Record<string, PredictionRow[]> = {};
    predictions.forEach(p => {
      if (!grouped[p.user_id]) grouped[p.user_id] = [];
      grouped[p.user_id].push(p);
    });

    return profiles.map(profile => {
      const userPreds = grouped[profile.id] ?? [];
      const predictionMap: Record<string, { a: number | null; b: number | null }> = {};
      userPreds.forEach(p => {
        predictionMap[p.match_id] = { a: p.score_a, b: p.score_b };
      });
      return buildUserScoreSummary(profile.id, profile.full_name || 'Sem nome', predictionMap, officialResults);
    }).sort((a, b) => b.total - a.total);
  }, [profiles, predictions, officialResults]);

  const filteredSummaries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return summaries;
    return summaries.filter(s => s.name.toLowerCase().includes(term));
  }, [search, summaries]);

  const selectedSummaries = useMemo(() => {
    return summaries.filter(s => selectedIds.includes(s.userId));
  }, [summaries, selectedIds]);

  const activeSummary = useMemo(() => {
    if (!activeUserId) return null;
    return summaries.find(s => s.userId === activeUserId) ?? null;
  }, [activeUserId, summaries]);

  const toggleSelected = (userId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      if (prev.length >= 3) return prev;
      return [...prev, userId];
    });
  };

  if (loading) {
    return <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">Carregando ranking...</div>;
  }

  if (!Object.keys(officialResults).length) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-10 text-sm text-slate-500">
        Sem resultados oficiais. Assim que o admin inserir os jogos, o ranking aparece aqui.
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Ranking</h2>
            <p className="text-slate-500 text-sm">Pontuação acumulada com base nos resultados oficiais.</p>
          </div>
          <input
            type="text"
            placeholder="Buscar jogador"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">Tabela geral</h3>
          <div className="divide-y divide-slate-100">
            {filteredSummaries.map((row, index) => (
              <div key={row.userId} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => setActiveUserId(row.userId)}
                    className="text-left text-sm font-bold text-slate-800 truncate hover:text-indigo-600"
                  >
                    {row.name}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-indigo-700">{row.total} pts</span>
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.userId)}
                      onChange={() => toggleSelected(row.userId)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Comparar
                  </label>
                </div>
              </div>
            ))}
          </div>
          {filteredSummaries.length === 0 && (
            <div className="text-sm text-slate-400">Nenhum jogador encontrado.</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">Comparação</h3>
          {selectedSummaries.length === 0 && (
            <div className="text-sm text-slate-400">Selecione até 3 jogadores para comparar.</div>
          )}
          <div className="space-y-4">
            {selectedSummaries.map(summary => (
              <div key={summary.userId} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                <div className="text-sm font-black text-slate-900">{summary.name}</div>
                <div className="text-xs font-bold text-indigo-600 mt-1">{summary.total} pts</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
                  {Object.entries(summary.byPhase).map(([phase, value]) => (
                    <div key={phase} className="flex items-center justify-between">
                      <span>{PHASE_LABEL[phase as keyof typeof PHASE_LABEL]}</span>
                      <span className="text-slate-900 font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">Detalhe por jogo</h3>
        {!activeSummary && <div className="text-sm text-slate-400">Selecione um jogador na tabela geral.</div>}
        {activeSummary && (
          <div className="space-y-3">
            {activeSummary.perMatch.map(match => (
              <div key={`${activeSummary.userId}-${match.matchId}`} className="border border-slate-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-xs font-bold text-slate-500">{match.phaseLabel} • {match.matchId}</div>
                <div className="text-xs font-semibold text-slate-700">
                  Palpite: {match.predicted?.a ?? '-'} x {match.predicted?.b ?? '-'} | Oficial: {match.official.a} x {match.official.b}
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Regra: {match.ruleApplied}{match.indicationPoints ? ' + Indicação' : ''}
                </div>
                <div className="text-xs font-black text-indigo-700">
                  {match.totalPoints} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingView;
