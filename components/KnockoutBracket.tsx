import React from 'react';
import { Team, Match } from '../types';

interface KnockoutBracketProps {
  allTeams: Team[];
  knockoutMatches: Match[];
  onScoreChange: (matchId: string, team: 'A' | 'B', value: string) => void;
  resolvePlaceholder: (id: string) => { team?: Team; label: string };
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

const TeamLine: React.FC<{
  teamId: string;
  score: number | null | undefined;
  onScoreChange: (val: string) => void;
  resolve: (id: string) => { team?: Team; label: string };
  disabled?: boolean;
}> = ({ teamId, score, onScoreChange, resolve, disabled = false }) => {
  const { team, label } = resolve(teamId);

  return (
    <div className="pv-ko-team-line">
      <div className="pv-ko-team-id">
        {team ? (
          <>
            <FlagImage iso2={team.iso2} name={team.name} />
            <span className="pv-team-name">{team.name}</span>
          </>
        ) : (
          <>
            <span className="pv-placeholder-slot">?</span>
            <span className="pv-placeholder-label">{label}</span>
          </>
        )}
      </div>
      <input
        type="number"
        min="0"
        placeholder="-"
        value={score === null || score === undefined ? '' : score}
        onChange={(event) => onScoreChange(event.target.value)}
        disabled={disabled}
        className="pv-score-input pv-score-input-ko"
      />
    </div>
  );
};

const ComparisonTeamRow: React.FC<{
  teamId: string;
  officialScore: number | null | undefined;
  predictedScore: number | null | undefined;
  resolve: (id: string) => { team?: Team; label: string };
}> = ({ teamId, officialScore, predictedScore, resolve }) => {
  const { team, label } = resolve(teamId);

  return (
    <div className="pv-ko-compare-row" data-testid="ko-compare-row">
      <div className="pv-ko-compare-team">
        {team ? (
          <>
            <FlagImage iso2={team.iso2} name={team.name} />
            <span className="pv-team-name">{team.name}</span>
          </>
        ) : (
          <>
            <span className="pv-placeholder-slot">?</span>
            <span className="pv-placeholder-label">{label}</span>
          </>
        )}
      </div>
      <div className="pv-ko-compare-cell is-center" data-testid="ko-compare-official">
        {officialScore ?? '-'}
      </div>
      <div className="pv-ko-compare-cell is-center" data-testid="ko-compare-predicted">
        {predictedScore ?? '-'}
      </div>
    </div>
  );
};

const KnockoutBracket: React.FC<KnockoutBracketProps> = ({
  knockoutMatches,
  onScoreChange,
  resolvePlaceholder,
  predictionsLocked = false,
  officialScores
}) => {
  const rounds = [
    { title: 'Rodada de 32', id: 'R32', matches: knockoutMatches.filter((match) => parseInt(match.id, 10) >= 73 && parseInt(match.id, 10) <= 88) },
    { title: 'Rodada de 16', id: 'R16', matches: knockoutMatches.filter((match) => parseInt(match.id, 10) >= 89 && parseInt(match.id, 10) <= 96) },
    { title: 'Quartas', id: 'QF', matches: knockoutMatches.filter((match) => parseInt(match.id, 10) >= 97 && parseInt(match.id, 10) <= 100) },
    { title: 'Semis', id: 'SF', matches: knockoutMatches.filter((match) => match.id === '101' || match.id === '102') },
    { title: 'Finais', id: 'F', matches: knockoutMatches.filter((match) => match.id === '103' || match.id === '104') }
  ];

  return (
    <section className="pv-ko-grid" data-testid="knockout-grid">
      {rounds.map((round) => (
        <article key={round.id} className="pv-round-panel">
          <header className="pv-round-head">{round.title}</header>

          <div className="pv-round-list">
            {round.matches
              .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
              .map((match) => {
                const official = officialScores?.[match.id];
                const isFinal = match.id === '104';
                const isThird = match.id === '103';
                return (
                  <div
                    key={match.id}
                    className={`pv-ko-match ${isFinal ? 'is-final' : ''} ${isThird ? 'is-third' : ''}`}
                    data-testid={predictionsLocked ? 'ko-compare-card' : undefined}
                  >
                    <div className="pv-ko-match-meta">
                      <span className="pv-ko-match-tag">
                        {isFinal ? 'Grande Final' : isThird ? 'Disputa 3o' : `Jogo ${match.id}`}
                      </span>
                      <span className="pv-ko-match-venue">{match.venue}</span>
                    </div>

                    {predictionsLocked ? (
                      <div className="pv-ko-compare-grid">
                        <div className="pv-ko-compare-head">
                          <span>Time</span>
                          <span className="is-center">Res.Ofic</span>
                          <span className="is-center">Palpite</span>
                        </div>
                        <ComparisonTeamRow
                          teamId={match.teamA}
                          officialScore={official?.a}
                          predictedScore={match.scoreA}
                          resolve={resolvePlaceholder}
                        />
                        <ComparisonTeamRow
                          teamId={match.teamB}
                          officialScore={official?.b}
                          predictedScore={match.scoreB}
                          resolve={resolvePlaceholder}
                        />
                      </div>
                    ) : (
                      <>
                        <TeamLine
                          teamId={match.teamA}
                          score={match.scoreA}
                          onScoreChange={(value) => onScoreChange(match.id, 'A', value)}
                          resolve={resolvePlaceholder}
                          disabled={predictionsLocked}
                        />
                        <TeamLine
                          teamId={match.teamB}
                          score={match.scoreB}
                          onScoreChange={(value) => onScoreChange(match.id, 'B', value)}
                          resolve={resolvePlaceholder}
                          disabled={predictionsLocked}
                        />
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </article>
      ))}
    </section>
  );
};

export default KnockoutBracket;
