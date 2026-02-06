
import { Team } from '../types';

export const TEAMS_DATA: Team[] = [
  // Group A
  { id: 'USA', name: 'USA', flag: '🇺🇸', iso2: 'us', group: 'A' },
  { id: 'MEX', name: 'México', flag: '🇲🇽', iso2: 'mx', group: 'A' },
  { id: 'CAN', name: 'Canada', flag: '🇨🇦', iso2: 'ca', group: 'A' },
  { id: 'NZL', name: 'N. Zelândia', flag: '🇳🇿', iso2: 'nz', group: 'A' },
  // Group B
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷', iso2: 'br', group: 'B' },
  { id: 'ESP', name: 'Espanha', flag: '🇪🇸', iso2: 'es', group: 'B' },
  { id: 'MAR', name: 'Marrocos', flag: '🇲🇦', iso2: 'ma', group: 'B' },
  { id: 'KOR', name: 'C. do Sul', flag: '🇰🇷', iso2: 'kr', group: 'B' },
  // Group C
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', iso2: 'ar', group: 'C' },
  { id: 'FRA', name: 'França', flag: '🇫🇷', iso2: 'fr', group: 'C' },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳', iso2: 'sn', group: 'C' },
  { id: 'AUS', name: 'Austrália', flag: '🇦🇺', iso2: 'au', group: 'C' },
  // Group D
  { id: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso2: 'gb-eng', group: 'D' },
  { id: 'GER', name: 'Alemanha', flag: '🇩🇪', iso2: 'de', group: 'D' },
  { id: 'JPN', name: 'Japão', flag: '🇯🇵', iso2: 'jp', group: 'D' },
  { id: 'ECU', name: 'Equador', flag: '🇪🇨', iso2: 'ec', group: 'D' },
  // Group E
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', iso2: 'pt', group: 'E' },
  { id: 'BEL', name: 'Bélgica', flag: '🇧🇪', iso2: 'be', group: 'E' },
  { id: 'COL', name: 'Colômbia', flag: '🇨🇴', iso2: 'co', group: 'E' },
  { id: 'KSA', name: 'Arábia Saudita', flag: '🇸🇦', iso2: 'sa', group: 'E' },
  // Group F
  { id: 'NED', name: 'Holanda', flag: '🇳🇱', iso2: 'nl', group: 'F' },
  { id: 'CRO', name: 'Croácia', flag: '🇭🇷', iso2: 'hr', group: 'F' },
  { id: 'URU', name: 'Uruguai', flag: '🇺🇾', iso2: 'uy', group: 'F' },
  { id: 'TUN', name: 'Tunísia', flag: '🇹🇳', iso2: 'tn', group: 'F' },
  // Group G
  { id: 'ITA', name: 'Itália', flag: '🇮🇹', iso2: 'it', group: 'G' },
  { id: 'SUI', name: 'Suíça', flag: '🇨🇭', iso2: 'ch', group: 'G' },
  { id: 'GHA', name: 'Gana', flag: '🇬🇭', iso2: 'gh', group: 'G' },
  { id: 'PER', name: 'Peru', flag: '🇵🇪', iso2: 'pe', group: 'G' },
  // Group H
  { id: 'DEN', name: 'Dinamarca', flag: '🇩🇰', iso2: 'dk', group: 'H' },
  { id: 'AUT', name: 'Áustria', flag: '🇦🇹', iso2: 'at', group: 'H' },
  { id: 'EGY', name: 'Egito', flag: '🇪🇬', iso2: 'eg', group: 'H' },
  { id: 'PAR', name: 'Paraguai', flag: '🇵🇾', iso2: 'py', group: 'H' },
  // Group I
  { id: 'SRB', name: 'Sérvia', flag: '🇷🇸', iso2: 'rs', group: 'I' },
  { id: 'POL', name: 'Polônia', flag: '🇵🇱', iso2: 'pl', group: 'I' },
  { id: 'CHI', name: 'Chile', flag: '🇨🇱', iso2: 'cl', group: 'I' },
  { id: 'CMR', name: 'Camarões', flag: '🇨🇲', iso2: 'cm', group: 'I' },
  // Group J
  { id: 'SWE', name: 'Suécia', flag: '🇸🇪', iso2: 'se', group: 'J' },
  { id: 'NGA', name: 'Nigéria', flag: '🇳🇬', iso2: 'ng', group: 'J' },
  { id: 'NOR', name: 'Noruega', flag: '🇳🇴', iso2: 'no', group: 'J' },
  { id: 'CRC', name: 'Costa Rica', flag: '🇨🇷', iso2: 'cr', group: 'J' },
  // Group K
  { id: 'SCO', name: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', iso2: 'gb-sct', group: 'K' },
  { id: 'ALG', name: 'Argélia', flag: '🇩🇿', iso2: 'dz', group: 'K' },
  { id: 'PAN', name: 'Panamá', flag: '🇵🇦', iso2: 'pa', group: 'K' },
  { id: 'IRN', name: 'Irã', flag: '🇮🇷', iso2: 'ir', group: 'K' },
  // Group L
  { id: 'WAL', name: 'País de Gales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', iso2: 'gb-wls', group: 'L' },
  { id: 'CIV', name: 'C. do Marfim', flag: '🇨🇮', iso2: 'ci', group: 'L' },
  { id: 'JAM', name: 'Jamaica', flag: '🇯🇲', iso2: 'jm', group: 'L' },
  { id: 'MLI', name: 'Mali', flag: '🇲🇱', iso2: 'ml', group: 'L' },
];

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
