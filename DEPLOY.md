# Deployment pe Vercel

## Pași pentru a pune proiectul online

### 1. Pregătirea proiectului

Asigură-te că ai:
- Un cont GitHub/GitLab/Bitbucket
- Proiectul este pus pe Git (comitat și push-uit)

### 2. Crearea contului Vercel

1. Mergi pe [vercel.com](https://vercel.com)
2. Click pe "Sign Up" sau "Log In"
3. Conectează-te cu GitHub/GitLab/Bitbucket

### 3. Deployment

#### Opțiunea 1: Prin interfața Vercel (Recomandat)

1. După ce te-ai conectat, click pe "Add New Project"
2. Selectează repository-ul tău (`itp-saas`)
3. Vercel va detecta automat că este un proiect Next.js
4. **Configurare importantă:**
   - **Root Directory**: `web` (selectează din dropdown sau setează manual)
   - **Framework Preset**: Next.js (ar trebui detectat automat)
   - **Build Command**: `pnpm build` (sau lasă-l gol, Vercel detectează automat)
   - **Output Directory**: `.next` (lasă-l gol, Vercel detectează automat)
   - **Install Command**: `pnpm install` (sau lasă-l gol)

5. **Variabile de mediu** (dacă folosești Supabase):
   - Dacă ai variabile de mediu, adaugă-le în secțiunea "Environment Variables"
   - De exemplu:
     - `NEXT_PUBLIC_SUPABASE_URL` (dacă folosești)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dacă folosești)

6. Click pe "Deploy"

#### Opțiunea 2: Prin CLI Vercel

```bash
# Instalează Vercel CLI global
npm i -g vercel

# Navighează în directorul web
cd web

# Login în Vercel
vercel login

# Deploy
vercel

# Pentru production
vercel --prod
```

### 4. După deployment

- Vercel va genera automat un URL de tip: `https://itp-saas-xxx.vercel.app`
- Fiecare push pe branch-ul principal va declanșa un nou deployment automat
- Poți vedea toate deployment-urile în dashboard-ul Vercel

### 5. Configurare domeniu personalizat (Opțional)

1. În dashboard-ul Vercel, mergi la proiectul tău
2. Click pe "Settings" → "Domains"
3. Adaugă domeniul tău (dacă ai unul)
4. Urmează instrucțiunile pentru a configura DNS-ul

### 6. Notă importantă despre localStorage

⚠️ **Atenție**: Proiectul folosește `localStorage` pentru stocarea datelor. Acest lucru înseamnă că:
- Datele sunt stocate local în browser-ul utilizatorului
- Nu sunt sincronizate între dispozitive
- Se pierd dacă utilizatorul șterge datele browser-ului

Pentru un mediu de producție real, ar trebui să:
- Folosești Supabase sau o altă bază de date
- Implementezi autentificare reală
- Sincronizezi datele între utilizatori

### 7. Verificare după deployment

1. Accesează URL-ul generat de Vercel
2. Verifică că aplicația se încarcă corect
3. Testează funcționalitățile principale:
   - Login/Signup
   - Crearea de stații
   - Adăugarea de clienți și mașini
   - Programarea ITP-urilor

### 8. Troubleshooting

**Eroare la install (`ERR_NPM_META_FETCH_FAIL` / `ERR_INVALID_THIS` / URLSearchParams):**
- Cauză: incompatibilitate pnpm + Node.js pe Vercel. Proiectul folosește `engines.node: ">=20.10"` și `packageManager: "pnpm@9.15.0"` în `web/package.json` pentru a evita versiunile problematice.
- Dacă eroarea persistă: în Vercel → Project Settings → General → Node.js Version, setează explicit **20.x** sau **22.x** (evită versiuni foarte vechi de Node 20).

**Eroare la build:**
- Verifică că toate dependențele sunt în `package.json`
- Asigură-te că `pnpm install` rulează fără erori local

**Eroare de runtime:**
- Verifică console-ul browser-ului pentru erori
- Verifică logs-urile în dashboard-ul Vercel

**Probleme cu localStorage:**
- localStorage funcționează doar în browser
- Nu funcționează în server-side rendering (SSR)
- Asigură-te că toate operațiunile cu localStorage sunt în `useEffect` sau evenimente client-side

## Suport

Pentru probleme, verifică:
- [Documentația Vercel](https://vercel.com/docs)
- [Documentația Next.js](https://nextjs.org/docs)
- Logs-urile din dashboard-ul Vercel
