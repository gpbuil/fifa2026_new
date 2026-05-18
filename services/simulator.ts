
import { DisciplineScores, DrawOrder, Match, GroupStanding, Team } from '../types';

const hasScore = (match: Match) => (
  match.scoreA !== null
  && match.scoreA !== undefined
  && match.scoreB !== null
  && match.scoreB !== undefined
);

const compareByTableStats = (a: GroupStanding, b: GroupStanding) => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalsDifference !== a.goalsDifference) return b.goalsDifference - a.goalsDifference;
  return b.goalsFor - a.goalsFor;
};

const compareByManualTiebreakers = (
  a: GroupStanding,
  b: GroupStanding,
  disciplineScores?: DisciplineScores,
  drawOrder?: DrawOrder
) => {
  const disciplineA = disciplineScores?.[a.teamId];
  const disciplineB = disciplineScores?.[b.teamId];
  if (disciplineA !== null && disciplineA !== undefined && disciplineB !== null && disciplineB !== undefined && disciplineB !== disciplineA) {
    return disciplineB - disciplineA;
  }

  const drawA = drawOrder?.[a.teamId];
  const drawB = drawOrder?.[b.teamId];
  if (drawA !== null && drawA !== undefined && drawB !== null && drawB !== undefined && drawA !== drawB) {
    return drawA - drawB;
  }

  return 0;
};

const calculateHeadToHeadStandings = (teamIds: string[], matches: Match[]): Record<string, GroupStanding> => {
  const standings: Record<string, GroupStanding> = {};
  const tiedTeamIds = new Set(teamIds);

  teamIds.forEach(teamId => {
    standings[teamId] = {
      teamId,
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
    if (!hasScore(match) || !tiedTeamIds.has(match.teamA) || !tiedTeamIds.has(match.teamB)) return;

    const scoreA = match.scoreA as number;
    const scoreB = match.scoreB as number;
    const sA = standings[match.teamA];
    const sB = standings[match.teamB];

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

  return standings;
};

const splitByHeadToHead = (rows: GroupStanding[], matches: Match[]): GroupStanding[][] => {
  if (rows.length <= 1) return [rows];

  const headToHead = calculateHeadToHeadStandings(rows.map(row => row.teamId), matches);
  const sorted = [...rows].sort((a, b) => {
    const hA = headToHead[a.teamId];
    const hB = headToHead[b.teamId];
    if (hB.points !== hA.points) return hB.points - hA.points;
    if (hB.goalsDifference !== hA.goalsDifference) return hB.goalsDifference - hA.goalsDifference;
    return hB.goalsFor - hA.goalsFor;
  });

  const groups: GroupStanding[][] = [];
  sorted.forEach(row => {
    const head = headToHead[row.teamId];
    const lastGroup = groups[groups.length - 1];
    const lastHead = lastGroup ? headToHead[lastGroup[0].teamId] : null;

    if (
      lastGroup
      && lastHead
      && head.points === lastHead.points
      && head.goalsDifference === lastHead.goalsDifference
      && head.goalsFor === lastHead.goalsFor
    ) {
      lastGroup.push(row);
    } else {
      groups.push([row]);
    }
  });

  return groups;
};

const resolveTiedRows = (
  rows: GroupStanding[],
  matches: Match[],
  disciplineScores?: DisciplineScores,
  drawOrder?: DrawOrder
): GroupStanding[] => {
  if (rows.length <= 1) return rows;

  const headToHeadGroups = splitByHeadToHead(rows, matches);
  if (headToHeadGroups.length > 1) {
    return headToHeadGroups.flatMap(group => resolveTiedRows(group, matches, disciplineScores, drawOrder));
  }

  return [...rows].sort((a, b) => {
    const tableStatsCompare = compareByTableStats(a, b);
    if (tableStatsCompare !== 0) return tableStatsCompare;
    return compareByManualTiebreakers(a, b, disciplineScores, drawOrder);
  });
};

export const calculateGroupStandings = (
  teams: Team[],
  matches: Match[],
  disciplineScores?: DisciplineScores,
  drawOrder?: DrawOrder
): GroupStanding[] => {
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
    if (!hasScore(match)) return;

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

  const sorted = Object.values(standings).sort(compareByTableStats);
  const groups: GroupStanding[][] = [];

  sorted.forEach(row => {
    const lastGroup = groups[groups.length - 1];
    const lastRow = lastGroup?.[0];
    if (
      lastGroup
      && lastRow
      && row.points === lastRow.points
      && row.goalsDifference === lastRow.goalsDifference
      && row.goalsFor === lastRow.goalsFor
    ) {
      lastGroup.push(row);
    } else {
      groups.push([row]);
    }
  });

  return groups.flatMap(group => resolveTiedRows(group, matches, disciplineScores, drawOrder));
};

export const getAdvancedTeams = (
  groups: string[],
  allTeams: Team[],
  allMatches: Match[],
  disciplineScores?: DisciplineScores,
  drawOrder?: DrawOrder
) => {
  const winners: Team[] = [];
  const runnersUp: Team[] = [];
  const thirdPlaces: { team: Team; standing: GroupStanding }[] = [];

  groups.forEach(groupLetter => {
    const groupTeams = allTeams.filter(t => t.group === groupLetter);
    const groupMatches = allMatches.filter(m => m.group === groupLetter);
    const standings = calculateGroupStandings(groupTeams, groupMatches, disciplineScores, drawOrder);

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
      if (b.standing.goalsFor !== a.standing.goalsFor) return b.standing.goalsFor - a.standing.goalsFor;

      const disciplineA = disciplineScores?.[a.team.id];
      const disciplineB = disciplineScores?.[b.team.id];
      if (disciplineA !== null && disciplineA !== undefined && disciplineB !== null && disciplineB !== undefined && disciplineB !== disciplineA) {
        return disciplineB - disciplineA;
      }

      const drawA = drawOrder?.[a.team.id];
      const drawB = drawOrder?.[b.team.id];
      if (drawA !== null && drawA !== undefined && drawB !== null && drawB !== undefined && drawA !== drawB) {
        return drawA - drawB;
      }

      return 0;
    })
    .slice(0, 8)
    .map(tp => tp.team);

  return { winners, runnersUp, bestThirdPlaces: sortedThirdPlaces };
};
