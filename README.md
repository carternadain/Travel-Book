# Travel Book

A free trip planner and memory book. Pick a month and a vibe and it suggests a trip to one of the
**New 7 Wonders** (or somewhere off the beaten path), lays the stops out on a map, and prices it
with real ticket fares and live exchange rates. Keeps a scrapbook of everywhere you've been, with
your photos.

- **Discover:** an interactive 3D globe of the bucket list and where you've been, *Where to go in [month]*, road trips from your home airport, and hidden gems
- **Plan:** "Surprise me" trip generator across 40+ trips. You get a day-by-day itinerary, a route map, a cost breakdown with real ticket prices, last year's weather, a packing list built from that weather, and pre-filled flight/hotel links (or Google Maps on road trips)
- **Bucket list:** 40 places to see before you die (the New 7 Wonders + 33 more icons), with continent filters and progress tracking. Tick one off and it goes into your memory book
- **Memories:** polaroid scrapbook with photo uploads, notes, ratings, a map, a wishlist of saved trips with a countdown and a monthly savings target, and JSON backup/restore

## Where the numbers come from

| Data | Source | Live? |
|---|---|---|
| Wonder entry tickets | Researched Oct 2026; every price links to its source in the app | Static, re-check before buying |
| Exchange rates | [open.er-api.com](https://www.exchangerate-api.com/docs/free) | ✅ live |
| Weather | [Open-Meteo](https://open-meteo.com) archive: real observations for that month last year | ✅ live |
| Photos & descriptions | Wikipedia API | ✅ live |
| Place search (memory book) | Open-Meteo geocoding | ✅ live |
| Flights | Distance-based estimate. The app links to Google Flights for real fares | Estimate |
| Stay / food / transport | Per-day averages from traveler budget guides | Estimate |

None of these need API keys and nothing costs money. All your data stays on your device:
settings, notes and trips in `localStorage`, photos in IndexedDB.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

## Deploy for free

**Vercel (recommended):** go to [vercel.com/new](https://vercel.com/new), import this repo, and click
Deploy. You don't need to change any settings, environment variables or base path. The free Hobby
plan covers it: the app is a static site with no server code, so there are no function or database
costs. Every push to `main` redeploys.

**GitHub Pages:** in **Settings → Pages**, set *Source* to **GitHub Actions**. The included
workflow deploys to `https://<you>.github.io/<repo-name>/`.

On your phone, open the site and use *Share → Add to Home Screen* to get an app icon.

## Photos

Headline places use hand-picked, freely licensed photos from Wikimedia Commons (`photo` in
`lib/data.ts`). Every other place uses the lead image of its Wikipedia article. If a Commons file
ever disappears, the app falls back to the Wikipedia image automatically. Your own photos go in
the Memory Book. They're resized on-device and stored in your browser.

## Adding destinations

Everything lives in `lib/data.ts`. Add a `Destination` with its places (`wiki` is the English
Wikipedia page title used for photos), daily costs, and best months.

## Stack

Next.js 15 (static export) · React 19 · Tailwind CSS v4 · Motion · cobe (WebGL globe) · Leaflet + CARTO tiles · lucide icons
