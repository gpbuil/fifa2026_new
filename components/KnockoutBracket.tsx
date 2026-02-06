
import React from 'react';
import { Team } from '../types';

interface KnockoutBracketProps {
  advanced: {
    winners: Team[];
    runnersUp: Team[];
    bestThirdPlaces: Team[];
  };
}

const KnockoutBracket: React.FC<KnockoutBracketProps> = ({ advanced }) => {
  const { winners, runnersUp, bestThirdPlaces } = advanced;
  const allAdvanced = [...winners, ...runnersUp, ...bestThirdPlaces];

  if (allAdvanced.length < 32) {
    return (
      <div className="text-center py-20 glass rounded-3xl border border-white">
        <p className="text-slate-400 font-medium">Preencha os resultados da fase de grupos para gerar o mata-mata.</p>
        <p className="text-slate-300 text-sm mt-2">Faltam {32 - allAdvanced.length} seleções.</p>
      </div>
    );
  }

  // Simplified logic for bracket generation
  // In a real scenario, this uses specific seeds (1A vs 3C, etc.)
  const roundOf32 = [];
  for (let i = 0; i < 16; i++) {
    roundOf32.push({
      matchId: `r32-${i}`,
      teamA: allAdvanced[i],
      teamB: allAdvanced[31 - i]
    });
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <h2 className="col-span-full text-2xl font-bold text-slate-800">32 Avos de Final</h2>
        {roundOf32.map((m) => (
          <div key={m.matchId} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.teamA.flag}</span>
                <span className="font-semibold text-slate-700">{m.teamA.name}</span>
              </div>
              <input type="number" className="w-10 h-8 border rounded text-center font-bold" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.teamB.flag}</span>
                <span className="font-semibold text-slate-700">{m.teamB.name}</span>
              </div>
              <input type="number" className="w-10 h-8 border rounded text-center font-bold" />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center p-10 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
        <p className="text-indigo-600 font-semibold italic">A lógica de avanço para as oitavas, quartas e semi está em desenvolvimento...</p>
      </div>
    </div>
  );
};

export default KnockoutBracket;
