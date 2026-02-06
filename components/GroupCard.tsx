
import React from 'react';
import { Team, Match, GroupStanding } from '../types';
import { calculateGroupStandings } from '../services/simulator';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  matches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ groupLetter, teams, matches, onScoreChange }) => {
  const standings = calculateGroupStandings(teams, matches);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-indigo-600 px-4 py-3">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Grupo {groupLetter}</h3>
      </div>
      
      <div className="p-4 flex flex-col lg:flex-row gap-6">
        {/* Matches Section */}
        <div className="flex-1 space-y-4">
          <h4 className="text-sm font-bold text-slate-400 uppercase">Jogos</h4>
          {matches.map(match => {
            const teamA = teams.find(t => t.id === match.teamA);
            const teamB = teams.find(t => t.id === match.teamB);
            return (
              <div key={match.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{teamA?.name}</span>
                  <span className="text-lg">{teamA?.flag}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={match.scoreA === null ? '' : match.scoreA}
                    onChange={(e) => onScoreChange(match.id, 'A', e.target.value)}
                    className="w-10 h-10 text-center bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-slate-300 font-bold">x</span>
                  <input
                    type="number"
                    min="0"
                    value={match.scoreB === null ? '' : match.scoreB}
                    onChange={(e) => onScoreChange(match.id, 'B', e.target.value)}
                    className="w-10 h-10 text-center bg-white border border-slate-200 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{teamB?.flag}</span>
                  <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{teamB?.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Standings Table */}
        <div className="lg:w-72">
          <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Classificação</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="text-left pb-2">Seleção</th>
                  <th className="text-center pb-2">P</th>
                  <th className="text-center pb-2">SG</th>
                  <th className="text-center pb-2">GP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {standings.map((s, idx) => {
                  const team = teams.find(t => t.id === s.teamId);
                  const isQualifying = idx < 2;
                  return (
                    <tr key={s.teamId} className={isQualifying ? "bg-green-50/30" : ""}>
                      <td className="py-2 flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full ${isQualifying ? "bg-green-500" : "bg-slate-300"}`}></span>
                        <span className="font-medium text-slate-700">{team?.flag} {team?.id}</span>
                      </td>
                      <td className="text-center font-bold text-slate-900">{s.points}</td>
                      <td className="text-center text-slate-500">{s.goalsDifference}</td>
                      <td className="text-center text-slate-500">{s.goalsFor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-3 text-[10px]">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Classificado</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Eliminado</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
