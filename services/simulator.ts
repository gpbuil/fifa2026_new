
import { Match, GroupStanding, Team } from '../types';

export const calculateGroupStandings = (teams: Team[], matches: Match[]): GroupStanding[] => {
  const standings: Record<string, GroupStanding> = {};

  teams.forEach(team => {
    standings[team.id] = {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalsDifference: 0,
      points: 0
    };
  });

  matches.forEach(match => {
    const { teamA, teamB, scoreA, scoreB } = match;
    if (scoreA === null || scoreB === null || scoreA === undefined || scoreB === undefined) return;

    const sA = standings[teamA];
    const sB = standings[teamB];

    sA.played++;
    sB.played++;
    sA.goalsFor += scoreA;
    sA.goalsAgainst += scoreB;
    sB.goalsFor += scoreB;
    sB.goalsAgainst += scoreA;

    if (scoreA > scoreB) {
      sA.won++;
      sA.points += 3;
      sB.lost++;
    } else if (scoreA < scoreB) {
      sB.won++;
      sB.points += 3;
      sA.lost++;
    } else {
      sA.drawn++;
      sB.drawn++;
      sA.points += 1;
      sB.points += 1;
    }

    sA.goalsDifference = sA.goalsFor - sA.goalsAgainst;
    sB.goalsDifference = sB.goalsFor - sB.goalsAgainst;
  });

  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalsDifference !== a.goalsDifference) return b.goalsDifference - a.goalsDifference;
    return b.goalsFor - a.goalsFor;
  });
};

export const getAdvancedTeams = (groups: string[], allTeams: Team[], allMatches: Match[]) => {
  const winners: Team[] = [];
  const runnersUp: Team[] = [];
  const thirdPlaces: { team: Team; standing: GroupStanding }[] = [];

  groups.forEach(groupLetter => {
    const groupTeams = allTeams.filter(t => t.group === groupLetter);
    const groupMatches = allMatches.filter(m => m.group === groupLetter);
    const standings = calculateGroupStandings(groupTeams, groupMatches);

    // Só avança times se pelo menos UM jogo foi disputado no grupo
    const hasAnyMatch = groupMatches.some(m => m.scoreA !== null && m.scoreA !== undefined);
    
    if (hasAnyMatch) {
      const winner = allTeams.find(t => t.id === standings[0].teamId);
      const runnerUp = allTeams.find(t => t.id === standings[1].teamId);
      const thirdPlace = allTeams.find(t => t.id === standings[2].teamId);

      if (winner && standings[0].played > 0) winners.push(winner);
      if (runnerUp && standings[1].played > 0) runnersUp.push(runnerUp);
      if (thirdPlace && standings[2].played > 0) thirdPlaces.push({ team: thirdPlace, standing: standings[2] });
    }
  });

  // Melhores 8 terceiros
  const sortedThirdPlaces = thirdPlaces
    .sort((a, b) => {
      if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
      if (b.standing.goalsDifference !== a.standing.goalsDifference) return b.standing.goalsDifference - a.standing.goalsDifference;
      return b.standing.goalsFor - a.standing.goalsFor;
    })
    .slice(0, 8)
    .map(tp => tp.team);

  return { winners, runnersUp, bestThirdPlaces: sortedThirdPlaces };
};
