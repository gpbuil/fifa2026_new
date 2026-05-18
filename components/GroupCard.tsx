import React from 'react';
import { DisciplineScores, DrawOrder, Team, Match } from '../types';
import { calculateGroupStandings } from '../services/simulator';
import { FIFA_DRAW_ORDER } from '../data/fifaDrawOrder';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  matches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
  predictionsLocked?: boolean;
  officialScores?: Record<string, { a: number | null; b: number | null }>;
  disciplineScores?: DisciplineScores;
  drawOrder?: DrawOrder;
}

const FlagImage: React.FC<{ iso2: string; name: string }> = ({ iso2, name }) => (
  <span className="pv-flag-wrap" aria-label={`Bandeira ${name}`}>
    <img
      src={`https://flagcdn.com/w20/${iso2.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png 2x`}
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
  officialScores,
  disciplineScores,
  drawOrder
}) => {
  const standings = calculateGroupStandings(teams, matches, disciplineScores, drawOrder);

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
            <span aria-hidden="true" />
          </div>

          <div className="pv-match-list">
            {matches.map((match) => {
              const teamA = teams.find((team) => team.id === match.teamA);
              const teamB = teams.find((team) => team.id === match.teamB);
              const official = officialScores?.[match.id];
              const hasOfficial = official && official.a !== null && official.b !== null;
              const predictionA = match.scoreA;
              const predictionB = match.scoreB;
              const hasPrediction = predictionA !== null && predictionB !== null;

              const predictedLabel = `${predictionA ?? '-'} x ${predictionB ?? '-'}`;
              const officialLabel = hasOfficial ? `${official.a} x ${official.b}` : '-';

              let statusLabel = 'Sem oficial';
              let statusClass = 'is-pending';

              if (hasOfficial && hasPrediction) {
                if (predictionA === official.a && predictionB === official.b) {
                  statusLabel = 'Acertou placar';
                  statusClass = 'is-exact';
                } else {
                  const predictedOutcome = predictionA === predictionB ? 'draw' : predictionA > predictionB ? 'a' : 'b';
                  const officialOutcome = official.a === official.b ? 'draw' : official.a > official.b ? 'a' : 'b';
                  if (predictedOutcome === officialOutcome) {
                    statusLabel = 'Acertou resultado';
                    statusClass = 'is-outcome';
                  } else {
                    statusLabel = 'Nao acertou';
                    statusClass = 'is-miss';
                  }
                }
              } else if (hasOfficial) {
                statusLabel = 'Sem palpite';
                statusClass = 'is-pending';
              }

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
                      <div className="pv-result-compare">
                        <span className="pv-result-chip">
                          <span className="pv-result-label">Palpite:</span> {predictedLabel}
                        </span>
                        <span className="pv-result-chip">
                          <span className="pv-result-label">Oficial:</span> {officialLabel}
                        </span>
                        <span className={`pv-result-status ${statusClass}`}>{statusLabel}</span>
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
            <span>Seleção</span>
            <span>PG</span>
            <span>SG</span>
            <span>GT</span>
            <span>DISC</span>
            <span>FIFA</span>
          </div>

          <div className="pv-standings-list">
            {standings.map((standing, index) => {
              const team = teams.find((item) => item.id === standing.teamId);
              const isQualified = index < 2 && standing.played > 0;
              const disciplineScore = disciplineScores?.[standing.teamId];
              const fifaDrawRank = drawOrder?.[standing.teamId] ?? FIFA_DRAW_ORDER[standing.teamId];
              return (
                <div
                  key={standing.teamId}
                  className={`pv-standings-row ${isQualified ? 'is-qualified' : ''}`}
                  title={team?.name}
                >
                  <div className="pv-standings-team" aria-label={team?.name}>
                    <span className={`pv-dot ${isQualified ? 'is-on' : ''}`} />
                    {team && <FlagImage iso2={team.iso2} name={team.name} />}
                  </div>
                  <div className="pv-standings-points">{standing.points}</div>
                  <div className="pv-standings-sg">{standing.goalsDifference}</div>
                  <div className="pv-standings-gp">{standing.goalsFor}</div>
                  <div className="pv-standings-discipline">{disciplineScore ?? '-'}</div>
                  <div className="pv-standings-draw">{fifaDrawRank ?? '-'}</div>
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
