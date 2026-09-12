import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fwuowtvhvsvqpwipuqsz.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_fO2wl7Iv4BqkpbccGY5nqw_zhdzFYb0";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    })
  : null;

// Helper to derive the public player join URL (respects VITE_PUBLIC_APP_URL)
export const getPublicJoinUrl = (roomCode = "EXPO26") => {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  const baseUrl = envUrl ? envUrl.trim().replace(/\/+$/, "") : window.location.origin;
  return `${baseUrl}/join?room=${roomCode}`;
};

export const isLocalhostUrl = (url) => {
  if (!url) return true;
  return url.includes("localhost") || url.includes("127.0.0.1");
};

// High-contrast, visually intuitive SVG AI starter assets (Base64-encoded to guarantee zero CSS syntax issues)
const generateSVGDataUrl = (title, subtitle, bgGrad1, bgGrad2, accentColor, iconShape) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad1}"/>
        <stop offset="100%" stop-color="${bgGrad2}"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="800" fill="url(#bg)"/>
    <rect width="800" height="800" fill="url(#grid)"/>
    <circle cx="400" cy="350" r="180" fill="none" stroke="${accentColor}" stroke-width="6" stroke-dasharray="10 15" opacity="0.6"/>
    <circle cx="400" cy="350" r="120" fill="rgba(255,255,255,0.04)" stroke="${accentColor}" stroke-width="4"/>
    ${iconShape}
    <text x="400" y="600" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="40" font-weight="900" letter-spacing="3">${title}</text>
    <text x="400" y="650" text-anchor="middle" fill="${accentColor}" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="4">${subtitle}</text>
    <rect x="200" y="700" width="400" height="40" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)"/>
    <text x="400" y="726" text-anchor="middle" fill="#8E99B7" font-family="sans-serif" font-size="14" font-weight="700">TCS EEE EXPO 2026 • AI PUZZLE ASSET</text>
  </svg>`;
  
  try {
    const encoded = typeof window !== "undefined" && window.btoa ? btoa(unescape(encodeURIComponent(svg))) : "";
    if (encoded) return `data:image/svg+xml;base64,${encoded}`;
  } catch (e) {}
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_AI_IMAGES = [
  {
    id: "asset-1",
    name: "Friendly AI Robot",
    category: "ROBOTICS",
    description: "Autonomous humanoid robot assistant",
    public_url: generateSVGDataUrl(
      "FRIENDLY AI ROBOT",
      "HUMANOID AUTOMATION",
      "#0f172a",
      "#1e1b4b",
      "#00d2ff",
      `<path d="M 370 290 Q 400 240 430 290 L 440 370 L 360 370 Z" fill="#00d2ff" opacity="0.9"/>
       <circle cx="375" cy="320" r="14" fill="#ffffff"/>
       <circle cx="425" cy="320" r="14" fill="#ffffff"/>
       <path d="M 380 370 Q 400 395 420 370" stroke="#00d2ff" stroke-width="8" fill="none"/>`
    ),
    times_used: 0,
    is_active: true
  },
  {
    id: "asset-2",
    name: "AI Neural Brain",
    category: "GENERATIVE AI",
    description: "Cognitive AI neural network matrix",
    public_url: generateSVGDataUrl(
      "AI NEURAL BRAIN",
      "DEEP LEARNING MATRIX",
      "#090d1f",
      "#2e1065",
      "#7c5cff",
      `<circle cx="400" cy="350" r="70" fill="#7c5cff" opacity="0.8"/>
       <path d="M 300 350 L 500 350 M 400 250 L 400 450 M 330 280 L 470 420 M 330 420 L 470 280" stroke="#ffffff" stroke-width="6" opacity="0.7"/>`
    ),
    times_used: 0,
    is_active: true
  },
  {
    id: "asset-3",
    name: "Smart Expo City",
    category: "SMART CITY",
    description: "Connected IoT metropolitan grid",
    public_url: generateSVGDataUrl(
      "SMART EXPO CITY",
      "CONNECTED METROPOLIS",
      "#06101e",
      "#064e3b",
      "#10b981",
      `<rect x="310" y="280" width="55" height="130" fill="#10b981" opacity="0.8"/>
       <rect x="375" y="220" width="65" height="190" fill="#34d399" opacity="0.9"/>
       <rect x="450" y="300" width="50" height="110" fill="#10b981" opacity="0.8"/>`
    ),
    times_used: 0,
    is_active: true
  },
  {
    id: "asset-4",
    name: "Cybersecurity Shield",
    category: "CYBERSECURITY",
    description: "AI-powered threat protection grid",
    public_url: generateSVGDataUrl(
      "CYBERSECURITY SHIELD",
      "QUANTUM THREAT PROTECTION",
      "#17062e",
      "#030712",
      "#f59e0b",
      `<path d="M 400 240 L 480 280 L 480 380 Q 400 460 400 460 Q 400 460 320 380 L 320 280 Z" fill="#f59e0b" opacity="0.85"/>
       <path d="M 380 340 L 395 360 L 430 320" stroke="#ffffff" stroke-width="8" fill="none"/>`
    ),
    times_used: 0,
    is_active: true
  },
  {
    id: "asset-5",
    name: "Cloud AI Infrastructure",
    category: "CLOUD",
    description: "Distributed cloud computing matrix",
    public_url: generateSVGDataUrl(
      "CLOUD AI MATRIX",
      "DISTRIBUTED DATACENTER",
      "#071330",
      "#1e3a8a",
      "#3b82f6",
      `<path d="M 310 360 Q 310 290 360 290 Q 390 250 440 260 Q 490 260 500 310 Q 540 320 530 370 Q 520 410 470 410 L 340 410 Q 310 410 310 360 Z" fill="#3b82f6" opacity="0.9"/>`
    ),
    times_used: 0,
    is_active: true
  }
];

export const CATEGORIES = [
  "ALL",
  "AI",
  "GENERATIVE AI",
  "ROBOTICS",
  "CYBERSECURITY",
  "CLOUD",
  "SMART CITY",
  "FUTURE OF WORK",
  "DIGITAL TECHNOLOGY",
  "TCS",
  "OTHER"
];

// Placeholder list of TCS Units - Replace with exact list if needed
export const TCS_UNITS = [
  "BFSI (Banking & Financial Services)",
  "Retail & CPG",
  "Communications, Media & Tech (CMT)",
  "Life Sciences & Healthcare",
  "Manufacturing",
  "Energy, Resources & Utilities (ERU)",
  "Public Services & Government",
  "TCS Interactive & Digital",
  "Corporate Functions & HR",
  "EEE Expo Core Team",
  "Other TCS Unit"
];
