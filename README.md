# BuddyRide 🛵

A modern **bike carpooling platform** for daily commuters — share rides, split costs, and reduce your carbon footprint.

## Features

- 🛵 **Bike-only carpooling** — find or offer motorcycle rides on your daily route
- 💰 **Live expense calculator** — compare commute cost vs Auto, Car Taxi, and Bike Taxi with monthly breakdown
- 🗺️ **Smart route matching** — Google Maps integration with offline Haversine fallback
- 📊 **Guest & Host dashboards** — track savings, earnings, pending requests, and ride history
- 🌙 **Dark / Light theme** — persisted in localStorage across sessions
- 📱 **Fully responsive** — desktop, tablet, and mobile layouts
- 🔐 **Auth-gated flows** — protected routes for posting/joining rides

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Routing | React Router v7 |
| Maps | Google Maps JS API (Places + Distance Matrix) |
| Backend | Supabase (auth + database) |

## Getting Started

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run typecheck  # TypeScript check (no emit)
```

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **No API key?** The app runs in mock mode with 28 sample Bengaluru locations and Haversine distance calculation — all features work offline.

## Google Maps Setup

Enable these APIs in [Google Cloud Console](https://console.cloud.google.com/):
- Maps JavaScript API
- Places API
- Distance Matrix API

Restrict the key to your domain in production.

## Deployment (Vercel)

The `vercel.json` at the project root configures SPA rewrites so React Router handles all client-side routes.

```bash
vercel --prod
```

Or connect your GitHub repo to Vercel and set the environment variables in the Vercel dashboard.

## Project Structure

```
src/
├── components/
│   ├── base/          # Reusable primitives (GooglePlacesInput)
│   ├── Navbar.tsx
│   ├── AnimatedRoad.tsx
│   ├── ExpenseCalculator.tsx
│   └── AccessibilityPanel.tsx  # BackToTop button
├── hooks/
│   └── useDistanceMatrix.ts
├── lib/
│   └── googleMaps.ts
├── mocks/
│   └── locations.ts
├── pages/
│   ├── LandingPage.tsx
│   ├── FindRidePage.tsx
│   ├── OfferRidePage.tsx
│   ├── DashboardPage.tsx
│   ├── AuthPage.tsx
│   └── ...
└── store/
    └── AppContext.tsx   # theme, mode, auth state
```

## License

MIT
