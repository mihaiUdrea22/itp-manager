# Schema Bazei de Date - ITP Manager

## Overview

Baza de date este structurată pentru a suporta:
- **Multi-tenancy**: Fiecare companie are datele izolate
- **Clienți comuni**: Clienții sunt shared între toate stațiile unei companii
- **ITP-uri specifice**: Fiecare ITP este asociat unei stații specifice
- **Perioade flexibile**: ITP-uri cu 6, 12 sau 24 luni
- **Calcul automat**: Data expirare se calculează automat

## Structura Tabelelor

### 1. `companies`
Organizațiile care dețin stații ITP.

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `name` - Numele companiei
- `cui` - CUI unic
- `subscription_plan` - Plan abonament (basic/professional/enterprise)

### 2. `users`
Utilizatorii sistemului (Manageri și Ingineri).

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `company_id` - ID-ul companiei
- `station_id` - NULL pentru manageri, ID stație pentru ingineri
- `role` - 'manager' sau 'engineer'
- `email` - Email unic
- `password_hash` - Parolă hash-uită

**Reguli:**
- Managerii au `station_id = NULL`
- Inginerii trebuie să aibă `station_id` setat

### 3. `stations`
Stațiile ITP ale fiecărei companii.

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `company_id` - ID-ul companiei
- `code` - Cod unic per companie (ex: ITP-001)
- `inspector_name` - Numele inspectorului autorizat
- `inspector_license` - Număr licență

**Unicitate:**
- `(company_id, code)` - Cod unic per companie

### 4. `clients` ⭐ COMUNI
Clienții sunt **comuni pentru toată compania**.

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `company_id` - ID-ul companiei
- `type` - 'individual' sau 'fleet'
- Pentru individuali: `first_name`, `last_name`, `cnp`
- Pentru flote: `company_name`, `cui`
- `phone` - Obligatoriu pentru căutare

**Indexuri pentru căutare:**
- `phone` - Căutare după telefon
- `cnp` - Căutare după CNP (individuali)
- `cui` - Căutare după CUI (flote)
- Full-text search pe nume

**Reguli:**
- Clienții nu trebuie reintroduși pentru fiecare stație
- Căutare după telefon, CNP sau CUI pentru a verifica dacă există deja

### 5. `vehicles` ⭐ COMUNI
Mașinile sunt **comune pentru toată compania**.

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `company_id` - ID-ul companiei
- `client_id` - ID-ul clientului (un client poate avea mai multe mașini)
- `license_plate` - Număr înmatriculare (unic per companie)
- `vin` - Vehicle Identification Number
- `make`, `model`, `year` - Detalii mașină
- `type` - Tip vehicul (car, truck, motorcycle, bus, trailer)
- `fuel_type` - Tip combustibil

**Unicitate:**
- `(company_id, license_plate)` - Număr înmatriculare unic per companie

### 6. `inspections` ⭐ SPECIFICE STAȚIEI
ITP-urile sunt **specifice fiecărei stații**.

**Câmpuri importante:**
- `id` (UUID) - Primary key
- `station_id` - ID-ul stației (SPECIFIC)
- `vehicle_id` - ID-ul mașinii
- `client_id` - ID-ul clientului
- `engineer_id` - ID-ul inginerului care efectuează inspecția
- `scheduled_date` - Data programării
- `completed_date` - Data completării
- `status` - scheduled, in_progress, passed, failed, cancelled
- `result` - passed, failed, conditional
- **`period_months`** - 6, 12 sau 24 luni ⭐
- **`expiration_date`** - Calculat automat la programare ⭐
- **`next_inspection_date`** - Calculat automat la completare ⭐

**Calcul Automat:**
- La inserare/update, trigger-ul calculează `expiration_date` = `scheduled_date` + `period_months`
- La completare (status = passed/failed), se calculează `next_inspection_date` = `completed_date` + `period_months`

### 7. `notifications`
Notificări pentru utilizatori.

## Flow-uri Importante

### Flow: Adăugare Client Nou

1. **Căutare client existent:**
   - Caută după `phone` (obligatoriu)
   - Dacă e individual: caută și după `cnp`
   - Dacă e flotă: caută și după `cui`

2. **Dacă există:**
   - Afișează clientul existent
   - Permite selectarea (nu reintroducere)

3. **Dacă nu există:**
   - Creează client nou
   - `created_at` = NOW() (automat)
   - `company_id` = ID-ul companiei utilizatorului

### Flow: Programare ITP

1. **Selectare client:**
   - Căutare client existent sau adăugare nou
   - Dacă clientul are mașini, le afișează

2. **Selectare mașină:**
   - Dacă clientul nu are mașini, permite adăugare
   - Un client poate avea mai multe mașini

3. **Programare:**
   - Selectează data și ora
   - Selectează perioada ITP (6, 12 sau 24 luni)
   - `scheduled_date` = data selectată
   - `expiration_date` = calculat automat (scheduled_date + period_months)
   - `station_id` = stația inginerului curent
   - `engineer_id` = ID-ul inginerului

### Flow: Completare ITP

1. **Update status:**
   - `status` = 'in_progress' → 'passed' sau 'failed'
   - `completed_date` = NOW()
   - `next_inspection_date` = calculat automat (completed_date + period_months)

## Indexuri și Performanță

### Indexuri pentru Căutare Rapidă

**Clients:**
- `idx_clients_company` - Filtrare după companie
- `idx_clients_phone` - Căutare după telefon
- `idx_clients_cnp` - Căutare după CNP
- `idx_clients_cui` - Căutare după CUI
- `idx_clients_name` - Full-text search pe nume

**Vehicles:**
- `idx_vehicles_license_plate` - Căutare după număr înmatriculare

**Inspections:**
- `idx_inspections_station` - Filtrare după stație
- `idx_inspections_scheduled_date` - Sortare după dată
- `idx_inspections_expiration_date` - Căutare ITP-uri expirate

## Row Level Security (RLS)

- Utilizatorii pot vedea doar datele companiei lor
- Inginerii pot vedea doar ITP-urile stației lor
- Managerii pot vedea toate datele companiei

## Trigger-uri Automate

1. **`set_inspection_expiration_date`**
   - Calculează `expiration_date` la inserare/update
   - Calculează `next_inspection_date` la completare

2. **`update_updated_at_column`**
   - Actualizează `updated_at` automat la fiecare update

## Notițe de Implementare

### Căutare Clienți Existenți

```sql
-- Căutare după telefon
SELECT * FROM clients 
WHERE company_id = $1 AND phone = $2;

-- Căutare după CNP (individuali)
SELECT * FROM clients 
WHERE company_id = $1 AND cnp = $2;

-- Căutare după CUI (flote)
SELECT * FROM clients 
WHERE company_id = $1 AND cui = $2;
```

### Calcul Data Expirare

Trigger-ul calculează automat, dar poți calcula manual:
```sql
SELECT calculate_expiration_date('2024-01-15'::DATE, 12);
-- Returnează: 2025-01-15
```

### Calendar - Query Programări

```sql
SELECT 
  i.id,
  i.scheduled_date,
  v.license_plate,
  c.first_name || ' ' || c.last_name as client_name,
  s.name as station_name
FROM inspections i
JOIN vehicles v ON i.vehicle_id = v.id
JOIN clients c ON i.client_id = c.id
JOIN stations s ON i.station_id = s.id
WHERE i.station_id = $1
  AND i.status = 'scheduled'
  AND i.scheduled_date >= $2
  AND i.scheduled_date < $3
ORDER BY i.scheduled_date;
```
