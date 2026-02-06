
import React from 'react';
import { Team } from '../types';

interface KnockoutBracketProps {
  advanced: {
    winners: Team[];
    runnersUp: Team[];
    bestThirdPlaces: Team[];
  };
}

const FlagImage: React.FC<{ iso2: string; name: string; size?: string }> = ({ iso2, name, size = "w-6 h-4" }) => (
  <img 
    src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`} 
    alt={name}
    className={`${size} object-cover rounded-sm shadow-sm border border-slate-200`}
  />
);

const KnockoutBracket: React.FC<KnockoutBracketProps> = ({ advanced }) => {
  const { winners, runnersUp, bestThirdPlaces } = advanced;
  const allAdvanced = [...winners, ...runnersUp, ...bestThirdPlaces];

  if (allAdvanced.length < 32) {
    return (
      <div className="text-center py-20 glass rounded-3xl border border-white shadow-sm">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-slate-600 font-bold text-lg">Aguardando definição dos grupos</p>
        <p className="text-slate-400 text-sm mt-2">Complete os placares da fase de grupos para liberar o chaveamento.</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold">
          <span className="animate-pulse">●</span>
          Faltam {32 - allAdvanced.length} seleções
        </div>
      </div>
    );
  }

  // Simplified logic for bracket generation
  const roundOf32 = [];
  for (let i = 0; i < 16; i++) {
    roundOf32.push({
      matchId: `r32-${i}`,
      teamA: allAdvanced[i],
      teamB: allAdvanced[31 - i]
    });
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <h2 className="col-span-full text-2xl font-black text-indigo-900 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-sm">32</span>
          32 Avos de Final
        </h2>
        {roundOf32.map((m) => (
          <div key={m.matchId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-indigo-300 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlagImage iso2={m.teamA.iso2} name={m.teamA.name} size="w-7 h-5" />
                <span className="font-bold text-slate-700 group-hover:text-indigo-900 transition-colors truncate max-w-[120px]">{m.teamA.name}</span>
              </div>
              <input type="number" placeholder="0" className="w-10 h-9 border border-slate-200 rounded-lg text-center font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlagImage iso2={m.teamB.iso2} name={m.teamB.name} size="w-7 h-5" />
                <span className="font-bold text-slate-700 group-hover:text-indigo-900 transition-colors truncate max-w-[120px]">{m.teamB.name}</span>
              </div>
              <input type="number" placeholder="0" className="w-10 h-9 border border-slate-200 rounded-lg text-center font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center p-10 bg-gradient-to-br from-indigo-50 to-white rounded-3xl border-2 border-dashed border-indigo-200 shadow-inner">
        <div className="text-3xl mb-3">🛠️</div>
        <p className="text-indigo-900 font-black uppercase tracking-widest text-sm">Próximas fases chegando</p>
        <p className="text-indigo-400 text-xs mt-2 font-medium">A lógica de chaveamento das oitavas, quartas e semi está sendo otimizada.</p>
      </div>
    </div>
  );
};

export default KnockoutBracket;
