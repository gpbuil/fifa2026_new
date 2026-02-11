import React, { useEffect, useMemo, useState } from 'react';
import { Match, Team } from '../types';
import { GROUPS, TEAMS_DATA } from '../data/teams';

interface ScoreMap {
  [matchId: string]: { a: number | null; b: number | null };
}

interface AdminDashboardProps {
  isAdmin: boolean;
  predictionsLocked: boolean | null;
  officialResults: ScoreMap;
  onToggleLock: (next: boolean) => Promise<void>;
  onSaveOfficial: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  groupMatches: Match[];
  knockoutMatches: Match[];
  resolvePlaceholder: (id: string) => { team?: Team; label: string };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isAdmin,
  predictionsLocked,
  officialResults,
  onToggleLock,
  onSaveOfficial,
  groupMatches,
  knockoutMatches,
  resolvePlaceholder
}) => {
  const [drafts, setDrafts] = useState<ScoreMap>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDrafts(officialResults);
  }, [officialResults]);

  const groupMatchesByGroup = useMemo(() => {
    return GROUPS.map(groupLetter => ({
      groupLetter,
      matches: groupMatches.filter(m => m.group === groupLetter)
    }));
  }, [groupMatches]);

  const rounds = useMemo(() => [
    { title: 'Rodada de 32', matches: knockoutMatches.filter(m => parseInt(m.id) >= 73 && parseInt(m.id) <= 88) },
    { title: 'Rodada de 16', matches: knockoutMatches.filter(m => parseInt(m.id) >= 89 && parseInt(m.id) <= 96) },
    { title: 'Quartas', matches: knockoutMatches.filter(m => parseInt(m.id) >= 97 && parseInt(m.id) <= 100) },
    { title: 'Semis', matches: knockoutMatches.filter(m => m.id === '101' || m.id === '102') },
    { title: 'Finais', matches: knockoutMatches.filter(m => m.id === '103' || m.id === '104') }
  ], [knockoutMatches]);

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
            Bloqueie palpites globais e atualize os resultados oficiais.
          </p>
        </div>
        <button
          onClick={() => predictionsLocked !== null && onToggleLock(!predictionsLocked)}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            predictionsLocked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
          disabled={predictionsLocked === null}
        >
          {predictionsLocked === null ? 'Carregando...' : predictionsLocked ? 'Desbloquear palpites' : 'Bloquear palpites'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">Resultados oficiais - Fase de grupos</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {groupMatchesByGroup.map(group => (
            <div key={group.groupLetter} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
              <div className="text-xs font-black text-indigo-700 mb-3 uppercase tracking-widest">Grupo {group.groupLetter}</div>
              <div className="space-y-2">
                {group.matches.map(match => {
                  const teamA = TEAMS_DATA.find(t => t.id === match.teamA);
                  const teamB = TEAMS_DATA.find(t => t.id === match.teamB);
                  const current = drafts[match.id] || { a: null, b: null };
                  const canSave = current.a !== null && current.b !== null;
                  const isSaving = !!savingIds[match.id];
                  return (
                    <div key={match.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <div className="text-xs font-semibold text-slate-700 min-w-[120px]">{teamA?.name ?? match.teamA}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="-"
                          value={current.a === null ? '' : current.a}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            setDrafts(prev => ({ ...prev, [match.id]: { ...prev[match.id], a: val } }));
                          }}
                          className="w-10 h-8 text-center bg-white border border-slate-200 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-300 text-[10px] font-black">X</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="-"
                          value={current.b === null ? '' : current.b}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            setDrafts(prev => ({ ...prev, [match.id]: { ...prev[match.id], b: val } }));
                          }}
                          className="w-10 h-8 text-center bg-white border border-slate-200 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-700 min-w-[120px] text-right">{teamB?.name ?? match.teamB}</div>
                      <button
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50"
                        disabled={!canSave || isSaving}
                        onClick={async () => {
                          if (!canSave) return;
                          setSavingIds(prev => ({ ...prev, [match.id]: true }));
                          await onSaveOfficial(match.id, current.a!, current.b!);
                          setSavingIds(prev => ({ ...prev, [match.id]: false }));
                        }}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">Resultados oficiais - Mata-mata</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {rounds.map(round => (
            <div key={round.title} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
              <div className="text-xs font-black text-indigo-700 mb-3 uppercase tracking-widest">{round.title}</div>
              <div className="space-y-2">
                {round.matches.map(match => {
                  const a = resolvePlaceholder(match.teamA);
                  const b = resolvePlaceholder(match.teamB);
                  const current = drafts[match.id] || { a: null, b: null };
                  const canSave = current.a !== null && current.b !== null;
                  const isSaving = !!savingIds[match.id];
                  return (
                    <div key={match.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <div className="text-xs font-semibold text-slate-700 min-w-[120px]">{a.team?.name ?? a.label}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="-"
                          value={current.a === null ? '' : current.a}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            setDrafts(prev => ({ ...prev, [match.id]: { ...prev[match.id], a: val } }));
                          }}
                          className="w-10 h-8 text-center bg-white border border-slate-200 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-300 text-[10px] font-black">X</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="-"
                          value={current.b === null ? '' : current.b}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            setDrafts(prev => ({ ...prev, [match.id]: { ...prev[match.id], b: val } }));
                          }}
                          className="w-10 h-8 text-center bg-white border border-slate-200 rounded-md text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-700 min-w-[120px] text-right">{b.team?.name ?? b.label}</div>
                      <button
                        className="text-xs font-bold px-3 py-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50"
                        disabled={!canSave || isSaving}
                        onClick={async () => {
                          if (!canSave) return;
                          setSavingIds(prev => ({ ...prev, [match.id]: true }));
                          await onSaveOfficial(match.id, current.a!, current.b!);
                          setSavingIds(prev => ({ ...prev, [match.id]: false }));
                        }}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
