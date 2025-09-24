window.__APPLICATION_CATALOG__ = [
  {
    "id": "cosmic-breaker",
    "order": 1,
    "tag": "Interactive Arcade",
    "title": "Cosmic Breaker",
    "summary": "Immersive space-themed arcade experience blending reactive physics with neon UI systems.",
    "description": "Cosmic Breaker reimagines the block-breaker genre as a cinematic mission console. We combined tactile paddle mechanics with procedurally generated sectors, telemetry overlays, and adaptive power-up orchestration to keep momentum high across varied play styles.",
    "highlights": [
      "Dynamic mission sequencing with difficulty sculpting per sector.",
      "Overlay-driven HUD system designed for controller, touch, and keyboard parity.",
      "Particle and neon glow pipeline optimised for WebGL fallbacks."
    ],
    "tech": [
      "TypeScript",
      "Canvas API",
      "Web Audio"
    ],
    "links": [
      {
        "label": "Launch playable demo",
        "href": "./applications/cosmic-breaker/cosmic-breaker.html"
      }
    ],
    "paneClass": "pane--aurora"
  },
  {
    "id": "global-scheduler",
    "order": 2,
    "tag": "Ops Dashboard",
    "title": "Global Scheduler",
    "summary": "Daylight-aware scheduling cockpit for distributed teams with weather overlays.",
    "description": "Global Scheduler orchestrates cross-timezone planning with a drag-to-select UTC grid. Teams can preview local conversions, surfacing daylight savings nuances alongside location-based weather insights for more human scheduling.",
    "highlights": [
      "Simulated UTC control board with hour-level drag selection.",
      "Automatic timezone translation leveraging the Intl API for DST resilience.",
      "Location panels augment availability with projected five-day weather."
    ],
    "tech": [
      "React",
      "Intl API",
      "CSS Grid"
    ],
    "links": [
      {
        "label": "Open Global Scheduler",
        "href": "./applications/global-scheduler/global-scheduler.html"
      }
    ],
    "paneClass": "pane--scheduler"
  }
];
