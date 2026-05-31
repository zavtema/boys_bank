# Boys Bank Frontend

React + Vite + TypeScript fintech dashboard. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` when backend is not on `http://localhost:8080`.

```bash
npm install
npm run dev
npm run build
```

## Vercel deployment

The app uses React Router with browser URLs such as `/dashboard`, `/accounts/:id`, and `/transactions`. Vercel must serve `index.html` for those routes so refreshes and direct links do not return `404: NOT_FOUND`. The `vercel.json` file in this directory configures that SPA fallback.
