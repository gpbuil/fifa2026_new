
import React from 'react';
import { Team, Match, GroupStanding } from '../types';
import { calculateGroupStandings } from '../services/simulator';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  matches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
}

const FlagImage: React.FC<{ iso2: string; name: string; size?: string }> = ({ iso2, name, size = "w-6 h-4" }) => (
  <img 
    src={`https://flagcdn.com/${iso2.toLowerCase()}.svg`} 
    alt={name}
    className={`${size} object-cover rounded-sm shadow-sm border border-slate-200 shrink-0`}
  />
);

const GroupCard: React.FC<GroupCardProps> = ({ groupLetter, teams, matches, onScoreChange }) => {
  const standings = calculateGroupStandings(teams, matches);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
      <div className="bg-indigo-600 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Grupo {groupLetter}</h3>
      </div>
      
      <div className="p-4 flex flex-col lg:flex-row gap-6">
        {/* Matches Section - 2/3 of width */}
        <div className="lg:flex-[2] space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jogos</h4>
          {matches.map(match => {
            const teamA = teams.find(t => t.id === match.teamA);
            const teamB = teams.find(t => t.id === match.teamB);
            return (
              <div key={match.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                  <span className="text-xs font-bold text-slate-700 truncate">{teamA?.name}</span>
                  {teamA && <FlagImage iso2={teamA.iso2} name={teamA.name} size="w-7 h-5" />}
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={match.scoreA === null ? '' : match.scoreA}
                    onChange={(e) => onScoreChange(match.id, 'A', e.target.value)}
                    className="w-10 h-10 text-center bg-white border border-slate-200 rounded-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-200"
                  />
                  <span className="text-slate-300 font-black text-xs">VS</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={match.scoreB === null ? '' : match.scoreB}
                    onChange={(e) => onScoreChange(match.id, 'B', e.target.value)}
                    className="w-10 h-10 text-center bg-white border border-slate-200 rounded-lg font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {teamB && <FlagImage iso2={teamB.iso2} name={teamB.name} size="w-7 h-5" />}
                  <span className="text-xs font-bold text-slate-700 truncate">{teamB?.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Standings Table - 1/3 of width */}
        <div className="lg:flex-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Classificação</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                  <th className="text-left pb-2">Seleção</th>
                  <th className="text-center pb-2">P</th>
                  <th className="text-center pb-2">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standings.map((s, idx) => {
                  const team = teams.find(t => t.id === s.teamId);
                  // O indicador só fica verde se estiver no Top 2 E tiver jogado pelo menos uma vez
                  const isQualifyingPos = idx < 2;
                  const hasPlayed = s.played > 0;
                  const showIndicator = isQualifyingPos && hasPlayed;
                  
                  return (
                    <tr key={s.teamId} className={showIndicator ? "bg-white/50" : ""}>
                      <td className="py-2.5 flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${showIndicator ? "bg-green-500" : "bg-slate-300"}`}></span>
                        {team && <FlagImage iso2={team.iso2} name={team.name} size="w-5 h-3.5" />}
                        <span className={`font-bold truncate ${showIndicator ? "text-slate-900" : "text-slate-500"}`}>{team?.name}</span>
                      </td>
                      <td className="text-center font-black text-indigo-600">{s.points}</td>
                      <td className="text-center text-slate-600 font-medium">{s.goalsDifference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
