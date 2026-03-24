# Protocol Tracker

Luxury minimal supplement, peptide, injection & medication tracker.

## Features
- Daily check-off dashboard with progress ring
- Protocol management with categories
- Streak tracking & 7-day compliance charts
- Supply/reorder calculator with urgency alerts
- Per-user data (localStorage, isolated by username)
- Password-gated access
- Mobile-first, works great as PWA

## Deploy

```bash
npm install
npx vercel --prod
```

## Environment Variables (Vercel)

- `NEXT_PUBLIC_ACCESS_PASSWORD` — gate password (default: `protocol2026`)
