# Dealigent · frontend

React 19 + Vite + Tailwind 4 + Recharts + Zustand. See the [root README](../README.md) for the full picture.

```bash
npm install
npm run dev                                       # http://localhost:5173, proxies /api → localhost:8000
DEALIGENT_API=http://localhost:8001 npm run dev   # backend on another port
npm run build                                     # production build; set VITE_API_URL to the deployed API
```
