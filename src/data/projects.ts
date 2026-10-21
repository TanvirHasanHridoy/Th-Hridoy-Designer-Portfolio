/**
 * Featured work — the three flagship projects only (per user request):
 * JobFlow AI, Sudoku Showdown and NapTrip.
 * `tech`/`features` power the focus-mode detail panel; feature copy is
 * sourced from each project's GitHub README.
 * `tone` drives each slab's procedural gradient cover (no image assets);
 * live 3D models per project live in `src/canvas/ProjectModels.tsx`.
 */
export type ProjectId = 'job-flow' | 'sudoku-online' | 'naptrip'

export interface Project {
  id: ProjectId
  index: string
  title: string
  year: string
  tags: string[]
  description: string
  /** chips in the focus detail panel */
  tech: string[]
  /** headline features shown in the focus detail panel */
  features: string[]
  href: string
  demo?: string
  tone: [string, string] // gradient stops
  ink: string // big numeral color on the cover
}

export const PROJECTS: Project[] = [
  {
    id: 'job-flow',
    index: '01',
    title: 'JobFlow AI',
    year: '2025',
    tags: ['ai', 'next.js', 'prisma', 'postgres', 'pdf-web'],
    description:
      'AI job-hunt copilot — tailors CVs and cover letters to beat ATS scanners, with a deterministic match-score engine, DIN 5008 DACH templates and a Kanban pipeline.',
    tech: ['Next.js 16', 'DeepSeek AI', 'Prisma + Supabase', 'React PDF Engine', 'Tailwind v4', 'TypeScript'],
    features: [
      'Deterministic ATS match-score engine — semantic LLM_CLASSES only, math stays audit-ready in TypeScript',
      'DeepSeek tailoring of CVs + cover letters with exact / adjacent / missing skill classification',
      'DIN 5008-compliant DACH Lebenslauf & Anschreiben templates beside UK/US formats',
      'Kanban application tracker with full lifecycle + status history analytics',
      'Vector-native PDF exporters (@react-pdf/renderer) — selectable UTF-8 text scanners can parse',
    ],
    href: 'https://github.com/TanvirHasanHridoy/Job-Flow',
    demo: 'https://job-flow.devhridoy.site',
    tone: ['#1A2FFB', '#0A0A0E'],
    ink: '#F0F1FA',
  },
  {
    id: 'sudoku-online',
    index: '02',
    title: 'Sudoku Showdown',
    year: '2025',
    tags: ['realtime', 'websockets', 'webrtc', 'elo-ranks'],
    description:
      'Real-time multiplayer Sudoku — ELO matchmaking, P2P voice chat, live spectating and mana-powered sabotage abilities served over WebSockets.',
    tech: ['React 19 + Vite', 'WebSockets', 'WebRTC P2P Voice', 'Supabase Auth & DB', 'Tailwind v4', 'Zustand'],
    features: [
      'ELO matchmaking across 7 rank tiers — Bronze up to Grandmaster, default 1450 (Diamond IV)',
      'Mana & combo-powered sabotages: Ink Splash, Keypad Scramble, Cleanse Shield',
      'WebRTC peer-to-peer voice chat + live spectator streaming of both boards',
      'Full sudoku engine — pencil marks with smart notes auto-removal, undo/redo, strikes',
      '15-second disconnect grace with cached-room auto reconnection and board resync',
    ],
    href: 'https://github.com/TanvirHasanHridoy/Sudoku-Online',
    demo: 'https://co-doku.devhridoy.site',
    tone: ['#0A0A0E', '#2439E0'],
    ink: '#F0F1FA',
  },
  {
    id: 'naptrip',
    index: '03',
    title: 'NapTrip',
    year: '2025',
    tags: ['expo', 'react-native', 'typescript', 'mobile'],
    description:
      'Cross-platform travel companion prototype — offline-friendly flows and a full TypeScript core, shipped end-to-end through the EAS cloud pipeline.',
    tech: ['Expo + React Native', 'TypeScript', 'VBB / HAFAS Transit API', 'Expo Location', 'AsyncStorage', 'EAS Build'],
    features: [
      'Geofenced wake-up alarms — app alarms louder than silent mode when nearing your stop',
      'Sleep-monitoring trip state machine with journey progress, speed-based ETA and distance left',
      'Live VBB arrival boards with delay checks before you board',
      'Dark map with geofence circles, long-press pin dropping and POI resolution',
      'Offline-friendly favourites & recents persisted through AsyncStorage',
    ],
    href: 'https://github.com/TanvirHasanHridoy/NapTrip',
    tone: ['#2B2BD8', '#0A0A0E'],
    ink: '#F0F1FA',
  },
]
