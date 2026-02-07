
import React from 'react';
import { Team, Match } from '../types';

interface KnockoutBracketProps {
  allTeams: Team[];
  knockoutMatches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
  resolvePlaceholder: (id: string) => { team?: Team; label: string };
}

const FlagImage: React.FC<{ iso2: string; name: string; size?: string }> = ({ iso2, name, size = "w-6 h-4" }) => (
  <img 
    src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`} 
    alt={name}
    className={`${size} object-cover rounded-sm shadow-sm border border-slate-200 shrink-0`}
  />
);

const TeamRow: React.FC<{ 
  teamId: string; 
  score: number | null | undefined; 
  onScoreChange: (val: string) => void;
  resolve: (id: string) => { team?: Team; label: string };
}> = ({ teamId, score, onScoreChange, resolve }) => {
  const { team, label } = resolve(teamId);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {team ? (
          <>
            <FlagImage iso2={team.iso2} name={team.name} size="w-5 h-3.5" />
            <span className="text-xs font-bold text-slate-800 truncate">{team.name}</span>
          </>
        ) : (
          <>
            <div className="w-5 h-3.5 bg-slate-50 rounded-sm border border-dashed border-slate-300 flex items-center justify-center">
              <span className="text-[8px] text-slate-300">?</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
              {label}
            </span>
          </>
        )}
      </div>
      <input
        type="number"
        min="0"
        placeholder="-"
        value={score === null || score === undefined ? '' : score}
        onChange={(e) => onScoreChange(e.target.value)}
        className="w-8 h-8 text-center bg-slate-50 border border-slate-200 rounded-md text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-200"
      />
    </div>
  );
};

const KnockoutBracket: React.FC<KnockoutBracketProps> = ({ knockoutMatches, onScoreChange, resolvePlaceholder }) => {
  const rounds = [
    { title: "Rodada de 32", id: "R32", matches: knockoutMatches.filter(m => parseInt(m.id) >= 73 && parseInt(m.id) <= 88) },
    { title: "Rodada de 16", id: "R16", matches: knockoutMatches.filter(m => parseInt(m.id) >= 89 && parseInt(m.id) <= 96) },
    { title: "Quartas", id: "QF", matches: knockoutMatches.filter(m => parseInt(m.id) >= 97 && parseInt(m.id) <= 100) },
    { title: "Semis", id: "SF", matches: knockoutMatches.filter(m => m.id === '101' || m.id === '102') },
    { title: "Finais", id: "F", matches: knockoutMatches.filter(m => m.id === '103' || m.id === '104') }
  ];

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-12 cursor-grab active:cursor-grabbing custom-scrollbar">
        <div className="flex gap-10 min-w-max px-4">
          {rounds.map((round) => (
            <div key={round.id} className="flex flex-col gap-8 w-64">
              <h3 className="text-center font-black text-indigo-900 uppercase tracking-widest text-[11px] py-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                {round.title}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-6">
                {round.matches.sort((a, b) => parseInt(a.id) - parseInt(b.id)).map((m) => (
                  <div key={m.id} className={`bg-white rounded-2xl border ${m.id === '104' ? 'border-amber-400 shadow-amber-100' : 'border-slate-200'} shadow-sm overflow-hidden hover:shadow-md transition-all`}>
                    <div className={`${m.id === '104' ? 'bg-amber-50' : m.id === '103' ? 'bg-orange-50' : 'bg-slate-50'} px-3 py-1.5 border-b border-slate-100 flex justify-between items-center`}>
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black ${m.id === '104' ? 'text-amber-600' : m.id === '103' ? 'text-orange-600' : 'text-indigo-600'} uppercase`}>
                          {m.id === '104' ? 'GRANDE FINAL' : m.id === '103' ? 'DISPUTA 3º LUGAR' : `JOGO ${m.id}`}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">{m.venue}</span>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <TeamRow 
                        teamId={m.teamA} 
                        score={m.scoreA} 
                        onScoreChange={(val) => onScoreChange(m.id, 'A', val)}
                        resolve={resolvePlaceholder}
                      />
                      <div className="h-px bg-slate-50 mx-2"></div>
                      <TeamRow 
                        teamId={m.teamB} 
                        score={m.scoreB} 
                        onScoreChange={(val) => onScoreChange(m.id, 'B', val)}
                        resolve={resolvePlaceholder}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Indicador visual de scroll para ajudar na orientação */}
      <div className="absolute right-0 bottom-4 bg-indigo-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-l-full shadow-lg animate-pulse pointer-events-none xl:hidden">
        Deslize para ver as finais →
      </div>
    </div>
  );
};

export default KnockoutBracket;
