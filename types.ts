
export interface Team {
  id: string;
  name: string;
  flag: string;
  iso2: string; // Código ISO alpha-2 para bandeiras SVG
  group: string;
}

export interface Match {
  id: string;
  group: string;
  teamA: string;
  teamB: string;
  scoreA?: number | null;
  scoreB?: number | null;
  venue?: string; // Sede do jogo
}

export interface GroupStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDifference: number;
  points: number;
}

export type DisciplineScores = Record<string, number | null | undefined>;
export type FifaRanking = Record<string, number | null | undefined>;

export interface Prediction {
  id?: string;
  user_id: string;
  match_id: string;
  score_a: number;
  score_b: number;
  updated_at?: string;
}

export enum ViewMode {
  GROUPS = 'groups',
  KNOCKOUT = 'knockout',
  OFFICIAL = 'official',
  AUTH = 'auth'
}
