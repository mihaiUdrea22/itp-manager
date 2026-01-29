# Supabase Database Schema

Această schemă definește structura bazei de date pentru ITP Manager SaaS.

## Structura Tabelelor

### 1. `companies`
Organizațiile care dețin stații ITP.

### 2. `users`
Utilizatorii sistemului:
- **Manager**: Proprietar organizației, poate crea stații și ingineri
- **Engineer**: Inginer asociat unei stații specifice

### 3. `stations`
Stațiile ITP ale fiecărei companii.

### 4. `clients` (COMUNI)
Clienții sunt comuni pentru toată compania. Nu trebuie reintroduși pentru fiecare stație.

### 5. `vehicles` (COMUNI)
Mașinile sunt comune pentru toată compania. Un client poate avea mai multe mașini.

### 6. `inspections` (SPECIFICE STAȚIEI)
ITP-urile sunt specifice fiecărei stații. Fiecare inginer gestionează ITP-urile stației sale.

### 7. `notifications`
Notificări pentru utilizatori.

## Caracteristici

### Calcul Automat Data Expirare
- La programare ITP, se calculează automat `expiration_date` bazat pe `period_months` (6, 12, sau 24 luni)
- La completare ITP, se calculează automat `next_inspection_date`

### Perioade ITP
- 6 luni (pentru anumite tipuri de vehicule)
- 12 luni (standard)
- 24 luni (pentru vehicule noi)

### Row Level Security (RLS)
- Utilizatorii pot vedea doar datele companiei lor
- Inginerii pot vedea doar ITP-urile stației lor
- Managerii pot vedea toate datele companiei

## Instalare

1. Creează un proiect Supabase
2. Rulează migrațiile:
```bash
supabase db push
```

Sau copiază conținutul din `001_initial_schema.sql` în SQL Editor din Supabase Dashboard.

## Note

- Pentru autentificare, va trebui să integrezi Supabase Auth cu tabelul `users`
- Policy-urile RLS presupun că `auth.uid()` returnează `user_id` din tabelul `users`
- În producție, va trebui să sincronizezi Supabase Auth users cu tabelul `users`
