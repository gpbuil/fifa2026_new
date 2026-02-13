import React from 'react';
import { Team, Match } from '../types';
import { calculateGroupStandings } from '../services/simulator';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  matches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
  predictionsLocked?: boolean;
  officialScores?: Record<string, { a: number | null; b: number | null }>;
}

const FlagImage: React.FC<{ iso2: string; name: string }> = ({ iso2, name }) => (
  <span className="pv-flag-wrap" aria-label={`Bandeira ${name}`}>
    <img
      src={`https://flagcdn.com/w20/${iso2.toLowerCase().startsWith('gb-') ? 'gb' : iso2.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${iso2.toLowerCase().startsWith('gb-') ? 'gb' : iso2.toLowerCase()}.png 2x`}
      alt={`Bandeira ${name}`}
      className="pv-flag"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
        const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = 'inline-flex';
      }}
    />
    <span className="pv-flag-fallback">{iso2.toUpperCase().slice(0, 2)}</span>
  </span>
);

const GroupCard: React.FC<GroupCardProps> = ({
  groupLetter,
  teams,
  matches,
  onScoreChange,
  predictionsLocked = false,
  officialScores
}) => {
  const standings = calculateGroupStandings(teams, matches);

  return (
    <article className="pv-group-card" data-testid={`group-card-${groupLetter}`}>
      <header className="pv-group-head">
        <h3 className="pv-group-title">Grupo {groupLetter}</h3>
        <span className="pv-group-chip">{matches.length} jogos</span>
      </header>

      <div className="pv-group-body">
        <section className="pv-group-matches">
          <div className="pv-table-head">
            <span>Confronto</span>
            <span>Placar</span>
          </div>

          <div className="pv-match-list">
            {matches.map((match) => {
              const teamA = teams.find((team) => team.id === match.teamA);
              const teamB = teams.find((team) => team.id === match.teamB);
              const official = officialScores?.[match.id];
              const hasOfficial = official && official.a !== null && official.b !== null;

              return (
                <div key={match.id} className="pv-match-row" data-testid="group-match-row">
                  <div className="pv-team-cell pv-team-cell-right">
                    <span className="pv-team-name">{teamA?.name}</span>
                    {teamA && <FlagImage iso2={teamA.iso2} name={teamA.name} />}
                  </div>

                  <div className="pv-score-cell">
                    <div className="pv-score-inline">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={match.scoreA === null ? '' : match.scoreA}
                        onChange={(event) => onScoreChange(match.id, 'A', event.target.value)}
                        disabled={predictionsLocked}
                        className="pv-score-input"
                      />
                      <span className="pv-score-sep">x</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={match.scoreB === null ? '' : match.scoreB}
                        onChange={(event) => onScoreChange(match.id, 'B', event.target.value)}
                        disabled={predictionsLocked}
                        className="pv-score-input"
                      />
                    </div>
                    {predictionsLocked && (
                      <div className="pv-lock-meta">
                        <span>Seu palpite: {match.scoreA ?? '-'} x {match.scoreB ?? '-'}</span>
                        <span>Oficial: {hasOfficial ? `${official!.a} x ${official!.b}` : '-'}</span>
                      </div>
                    )}
                  </div>

                  <div className="pv-team-cell">
                    {teamB && <FlagImage iso2={teamB.iso2} name={teamB.name} />}
                    <span className="pv-team-name">{teamB?.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="pv-group-standings">
          <div className="pv-table-head pv-table-head-standings">
            <span>Classificacao</span>
            <span>P</span>
            <span>SG</span>
          </div>

          <div className="pv-standings-list">
            {standings.map((standing, index) => {
              const team = teams.find((item) => item.id === standing.teamId);
              const isQualified = index < 2 && standing.played > 0;
              return (
                <div key={standing.teamId} className={`pv-standings-row ${isQualified ? 'is-qualified' : ''}`}>
                  <div className="pv-standings-team">
                    <span className={`pv-dot ${isQualified ? 'is-on' : ''}`} />
                    {team && <FlagImage iso2={team.iso2} name={team.name} />}
                    <span className="pv-team-name">{team?.name}</span>
                  </div>
                  <div className="pv-standings-points">{standing.points}</div>
                  <div className="pv-standings-sg">{standing.goalsDifference}</div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </article>
  );
};

export default GroupCard;
