/**
 * About-section data — the developer profile behind the portfolio.
 * Sourced from the public GitHub profile (TanvirHasanHridoy), the shipped
 * projects and their real tech choices. Edit freely: this file is the single
 * source of truth for the About section copy.
 */

export const PROFILE = {
  name: 'S M Tanvir Hasan Hridoy',
  alias: 'thridoy°',
  role: 'Full-Stack Developer',
  /**
   * Portrait — drop the photo into `public/` keeping this filename
   * (`public/portrait.jpg`). If the file is missing, the About card
   * automatically falls back to the monogram tile, so nothing breaks.
   */
  photo: '/portrait.jpg',
  location: 'Chemnitz, Germany',
  timezone: 'Europe/Berlin · CET / CEST',
  /**
   * One-line pitch — mirrors the GitHub headline:
   * "Web Developer | React.js & Node.js | Open to Working Student &
   * Entry-Level Roles in Germany"
   */
  tagline:
    'Full-stack web apps with real-time 3D — typed TypeScript cores, live multiplayer services and interfaces that stay fast.',
  openTo: 'Open to Working-Student & Entry-Level roles in Germany',
  links: {
    github: 'https://github.com/TanvirHasanHridoy',
    linkedin: 'https://www.linkedin.com/in/th-hridoy/',
  },
  /** badges below the status card */
  githubStats: [
    '18 public repos',
    'Pull-Shark ×2',
    'Arctic Code Vault',
    'shipping since 2019',
  ],
  bio: [
    'Web developer in Chemnitz, Germany, building with React.js and Node.js. I ship complete products — REST APIs and WebSocket services on the back end, React front ends on the web, Expo apps on mobile.',
    'Recent work leans realtime and applied-AI: an ATS-aware CV engine (JobFlow AI), a live multiplayer sudoku hub with ELO ranking and peer-to-peer voice (co-doku), and a geofenced travel-alarm app for Android and iOS (NapTrip). I like hard, shippable problems: matchmaking, sync, offline storage, PDF generation.',
  ],
} as const

/**
 * Contact form endpoint. The footer posts to this URL directly, so the site
 * never ships a personal email address in HTML, JS, or a `mailto:` link.
 * Use a form service endpoint (Formspree/Web3Forms/Basin) or your own
 * serverless handler. Leave unset to keep the form in wire-me mode; the
 * submit button stays disabled and LinkedIn remains the fallback.
 *
 * Local:  VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxxx
 * Vercel: Project Settings -> Environment Variables -> same name.
 */
export const CONTACT_ENDPOINT = (import.meta.env.VITE_CONTACT_ENDPOINT ?? '').trim()

/** tech stack — categorized. Only tools actually used in the public repos. */
export const STACK: Array<{ title: string; note: string; items: string[] }> = [
  {
    title: 'Languages',
    note: 'typed & modern',
    items: ['TypeScript', 'JavaScript', 'Node.js', 'SQL'],
  },
  {
    title: 'Frontend',
    note: 'UI engineering',
    items: ['React 19', 'Next.js', 'Vite', 'Tailwind v4', 'Three.js / R3F', 'GSAP', 'Zustand'],
  },
  {
    title: 'Backend & Data',
    note: 'services & storage',
    items: ['Prisma', 'Supabase Auth / DB', 'PostgreSQL', 'REST APIs', 'Express'],
  },
  {
    title: 'Realtime & Media',
    note: 'live products',
    items: ['WebSockets', 'WebRTC P2P Voice', '@react-pdf/renderer'],
  },
  {
    title: 'Mobile',
    note: 'cross-platform',
    items: ['React Native', 'Expo', 'EAS Build', 'AsyncStorage'],
  },
  {
    title: 'AI & Integrations',
    note: 'applied LLM',
    items: ['DeepSeek API', 'LLM classification', 'VBB / HAFAS Transit APIs'],
  },
  {
    title: 'Motion & 3D',
    note: 'this very site',
    items: ['Three.js / WebGL', 'React Three Fiber', 'GSAP ScrollTrigger', 'Rapier Physics'],
  },
  {
    title: 'Workflow',
    note: 'process',
    items: ['Git & GitHub', 'npm', 'Vite', 'Vercel', 'EAS pipelines'],
  },
]

/**
 * Experience timeline — milestones reconstructed from the public GitHub
 * history (repo creation/push dates). Keep entries outcome-focused.
 */
export const TIMELINE: Array<{
  year: string
  title: string
  org: string
  text: string
  tags: string[]
}> = [
  {
    year: '2026',
    title: '3D portfolio rebuild + tooling',
    org: 'Personal R&D · Chemnitz',
    text: 'Rebuilt the portfolio as a live WebGL experience — object carousel, physics pit, scroll choreography (Three.js + React Three Fiber + Rapier). Started an ER-quant analyzer in TypeScript.',
    tags: ['three.js', 'rapier', 'typescript'],
  },
  {
    year: '2025',
    title: 'Flagship builds — JobFlow AI · co-doku · NapTrip',
    org: 'Freelance / personal',
    text: 'Shipped three complete products end-to-end: an AI CV-tailoring engine with deterministic ATS match scoring (Next.js + DeepSeek + Prisma), a realtime multiplayer sudoku hub with ELO matchmaking and WebRTC voice, and an Expo travel companion with geofenced alarms.',
    tags: ['next.js', 'websockets', 'webrtc', 'expo'],
  },
  {
    year: '2024',
    title: 'Chemnitz institutions platform',
    org: 'Full-stack build',
    text: 'Designed and shipped a directory platform for Chemnitz institutions — React front end plus a Node/Express REST backend. First city-scale data project.',
    tags: ['rest api', 'react', 'node'],
  },
  {
    year: '2023',
    title: 'First portfolio + e-commerce stack',
    org: 'Learning by shipping',
    text: 'First portfolio site, then a full e-shop: a standalone REST API (E-SHOP-API) with a JavaScript storefront, plus media-app tooling.',
    tags: ['rest api', 'react'],
  },
  {
    year: '2019 – 22',
    title: 'Start — JavaScript & React Native',
    org: 'First repos',
    text: 'The JavaScript foundation: React Native practice apps (recipes, travel, colour tools) and the earliest GitHub history.',
    tags: ['react-native', 'javascript'],
  },
]
