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
                const hasOfficial = official && official.a !== null && official.b !== null;
                const isFinal = match.id === '104';
                const isThird = match.id === '103';
                return (
                  <div key={match.id} className={`pv-ko-match ${isFinal ? 'is-final' : ''} ${isThird ? 'is-third' : ''}`}>
                    <div className="pv-ko-match-meta">
                      <span className="pv-ko-match-tag">
                        {isFinal ? 'Grande Final' : isThird ? 'Disputa 3º' : `Jogo ${match.id}`}
                      </span>
                      <span className="pv-ko-match-venue">{match.venue}</span>
                    </div>

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

                    {predictionsLocked && (
                      <div className="pv-lock-meta pv-lock-meta-ko">
                        <span>Seu palpite: {match.scoreA ?? '-'} x {match.scoreB ?? '-'}</span>
                        <span>Oficial: {hasOfficial ? `${official!.a} x ${official!.b}` : '-'}</span>
                      </div>
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
