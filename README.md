# ITP Manager - SaaS pentru Stații ITP

Sistem complet de management pentru stații ITP (Inspecție Tehnică Periodică), care permite companiilor să gestioneze mai multe stații ITP, clienți (individuali și flote auto), mașini și inspecții tehnice periodice.

## 🚀 Funcționalități Principale

### 1. Multi-Tenancy
- **Companii Multiple**: Fiecare companie poate avea propriul cont și mai multe stații ITP
- **Gestionare Stații**: Adaugă, editează și gestionează mai multe stații ITP sub același cont
- **Roluri Utilizatori**: Sistem de permisiuni pentru admin, manager stație, inspector și operator

### 2. Gestionare Clienți
- **Clienți Individuali**: Gestionează clienți cu date personale (nume, CNP, contact)
- **Flote Auto**: Suport complet pentru companii cu flote de mașini
- **Istoric Complet**: Vezi toate mașinile și ITP-urile pentru fiecare client

### 3. Gestionare Mașini
- **Baza de Date Completă**: Stocare detalii complete despre fiecare mașină (marcă, model, an, tip, combustibil)
- **Tracking ITP**: Urmărire automată a datelor ITP și notificări pentru expirare
- **Status Vizual**: Indicatori vizuali pentru ITP-uri valide, expirate sau expirând curând

### 4. Gestionare Inspecții
- **Programări**: Sistem complet de programare ITP cu calendar
- **Tracking Status**: Urmărire status inspecții (programat, în progres, trecut, eșuat)
- **Rapoarte Detaliate**: Stocare detalii complete despre fiecare inspecție
- **Certificate**: Gestionare certificate ITP și documente asociate

### 5. Dashboard și Analitice
- **Statistici Real-Time**: Vizualizare statistici despre inspecții, clienți, mașini
- **Performanță**: Rata de trecere, venituri, tendințe
- **Alerte**: Notificări pentru ITP-uri expirate sau expirând curând

### 6. Notificări Inteligente
- **Notificări Automate**: Alerte pentru ITP-uri expirate sau expirând în curând
- **Notificări Programări**: Confirmări și reminder-uri pentru programări
- **Centru Notificări**: Interfață centralizată pentru toate notificările

### 7. Calendar și Programări
- **Vizualizare Calendar**: Vezi toate programările organizate pe zile
- **Gestionare Programări**: Adaugă, editează și anulează programări
- **Filtrare**: Filtrează după stație, client sau dată

## 🛠️ Tehnologii

- **Framework**: Next.js 16 (App Router)
- **Limbaj**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Package Manager**: pnpm

## 📁 Structura Proiectului

```
web/
├── app/
│   ├── (dashboard)/          # Rute protejate pentru dashboard
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── stations/          # Gestionare stații ITP
│   │   ├── clients/           # Gestionare clienți
│   │   ├── vehicles/          # Gestionare mașini
│   │   ├── inspections/       # Gestionare inspecții
│   │   ├── calendar/          # Calendar programări
│   │   ├── notifications/     # Centru notificări
│   │   ├── settings/          # Setări
│   │   └── layout.tsx         # Layout pentru dashboard
│   ├── layout.tsx             # Layout root
│   └── page.tsx               # Pagină principală (redirect la dashboard)
├── components/
│   ├── layout/                # Componente layout (Sidebar, Header, etc.)
│   └── ui/                    # Componente UI reutilizabile
├── types/                     # Tipuri TypeScript
│   └── index.ts               # Definiții tipuri principale
└── lib/                       # Utilitare
    └── utils.ts               # Funcții utilitare
```

## 🚀 Instalare și Rulare

### Cerințe
- Node.js 18+ 
- pnpm (recomandat) sau npm

### Pași

1. **Instalează dependențele**:
```bash
cd web
pnpm install
```

2. **Rulează serverul de dezvoltare**:
```bash
pnpm dev
```

3. **Deschide aplicația**:
Deschide [http://localhost:3000](http://localhost:3000) în browser

## 📊 Model de Date

### Entități Principale

- **Company**: Companie care deține stații ITP
- **Station**: Stație ITP individuală
- **User**: Utilizator al sistemului (cu roluri diferite)
- **Client**: Client (individual sau flotă auto)
- **Vehicle**: Mașină înregistrată
- **Inspection**: Inspecție tehnică periodică

### Relații

```
Company
  ├── Stations (1:N)
  ├── Users (1:N)
  └── Clients (1:N)
      └── Vehicles (1:N)
          └── Inspections (1:N)
```

## 🎯 Funcționalități Inovatoare

### 1. **Notificări Proactive**
- Sistem automat de notificări pentru ITP-uri expirate sau expirând
- Email și notificări în aplicație
- Notificări pentru flote auto (centralizate pentru toate mașinile)

### 2. **Dashboard Inteligent**
- Statistici real-time
- Alerte vizuale pentru probleme urgente
- Tendințe și analize de performanță

### 3. **Gestionare Flote Auto**
- Suport special pentru companii cu flote
- Notificări centralizate pentru toate mașinile din flotă
- Rapoarte consolidate

### 4. **Tracking Complet**
- Istoric complet pentru fiecare mașină
- Urmărire automată a datelor ITP
- Calcul automat al următoarei date de inspecție

## 🔮 Funcționalități Viitoare

- [ ] Portal pentru clienți (self-service)
- [ ] Integrare cu sisteme externe (API-uri guvernamentale)
- [ ] Export rapoarte (PDF, Excel)
- [ ] Integrare plăți online
- [ ] Aplicație mobilă
- [ ] Sistem de facturare integrat
- [ ] Integrare cu sisteme de management stocuri
- [ ] AI pentru predicție nevoi ITP
- [ ] Integrare cu sisteme de tracking GPS pentru flote

## 📝 Licență

Acest proiect este proprietate privată.

## 👥 Contribuții

Pentru contribuții, te rugăm să deschizi un issue sau pull request.
