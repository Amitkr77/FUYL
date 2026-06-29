// Tailwind v4 — theme is defined in globals.css via @theme {}
// This file kept minimal for tooling compatibility
import type { Config } from 'tailwindcss'
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'] }
export default config
