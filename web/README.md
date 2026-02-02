# ITP Manager - Frontend

Aplicația frontend pentru ITP Manager - SaaS pentru stații ITP.

## Tehnologii

- **Next.js 16** - Framework React cu App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Lucide React** - Icons
- **pnpm** - Package manager

## Instalare

```bash
pnpm install
```

## Dezvoltare

**Din directorul `web`:**
```bash
cd web
pnpm install   # doar prima dată sau după ce ai modificat package.json
pnpm dev
```

**Din root-ul proiectului:**
```bash
pnpm run dev
```

**Ce port folosește:** în terminal, după ce pornește, apare o linie de tip:
`▲ Next.js 16.x.x | Local: http://localhost:3000`  
**Acela e portul** — deschide în browser exact URL-ul afișat acolo (poate fi 3000, 3001, 3002 dacă 3000 era ocupat).

**Dacă 3000 e ocupat:** poți forța alt port:
```bash
pnpm run dev:3001   # rulează pe http://localhost:3001
# sau
pnpm dev -- -p 3002   # pe 3002
```

## Build pentru producție

```bash
pnpm build
pnpm start
```

## Structura

- `app/` - Rute Next.js (App Router)
- `components/` - Componente React reutilizabile
- `types/` - Definiții TypeScript
- `lib/` - Funcții utilitare

## Dacă dev/build nu merge (Bus error sau server nu pornește)

- **Scripturile** folosesc `--webpack` (fără Turbopack) pentru stabilitate.
- Reinstalează dependențele: `rm -rf node_modules && pnpm install`
- Dacă build dă Bus error: `NODE_OPTIONS=--max-old-space-size=4096 pnpm run build`
- Node recomandat: v20 LTS sau v22 (verifică cu `node -v`).

Pentru mai multe detalii, vezi README-ul principal din root-ul proiectului.
