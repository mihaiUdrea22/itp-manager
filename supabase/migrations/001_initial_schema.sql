-- Schema bazei de date pentru ITP Manager SaaS
-- Supabase PostgreSQL

-- Extensii necesare
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pentru căutare text

-- Tabel: companies (Organizații/Companii)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cui VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel: users (Utilizatori - Manageri și Ingineri)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    station_id UUID, -- NULL pentru manageri (FK adăugat după tabelul stations)
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Hash-uit cu bcrypt
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'engineer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email),
    CONSTRAINT engineer_must_have_station CHECK (
        (role = 'engineer' AND station_id IS NOT NULL) OR 
        (role = 'manager' AND station_id IS NULL)
    )
);

-- Tabel: stations (Stații ITP)
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    inspector_name VARCHAR(255) NOT NULL,
    inspector_license VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code) -- Cod unic per companie
);

-- Adaugă foreign key pentru users.station_id după ce stations există
ALTER TABLE users ADD CONSTRAINT fk_users_station 
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL;

-- Tabel: clients (Clienți - COMUNI pentru toată compania)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('individual', 'fleet')),
    -- Pentru clienți individuali
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    cnp VARCHAR(13),
    -- Pentru flote auto
    company_name VARCHAR(255),
    cui VARCHAR(50),
    -- Contact comun
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT client_type_check CHECK (
        (type = 'individual' AND first_name IS NOT NULL AND last_name IS NOT NULL) OR
        (type = 'fleet' AND company_name IS NOT NULL)
    )
);

-- Index pentru căutare rapidă clienți
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_cnp ON clients(cnp) WHERE cnp IS NOT NULL;
CREATE INDEX idx_clients_cui ON clients(cui) WHERE cui IS NOT NULL;
CREATE INDEX idx_clients_name ON clients USING gin(to_tsvector('romanian', COALESCE(first_name || ' ' || last_name, company_name)));

-- Tabel: vehicles (Mașini - COMUNE pentru toată compania)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    vin VARCHAR(50) UNIQUE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('car', 'truck', 'motorcycle', 'bus', 'trailer')),
    fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng')),
    color VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, license_plate) -- Număr înmatriculare unic per companie
);

-- Index pentru căutare rapidă mașini
CREATE INDEX idx_vehicles_company ON vehicles(company_id);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);

-- Tabel: inspections (ITP-uri - SPECIFICE fiecărei stații)
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    engineer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'cancelled')),
    result VARCHAR(50) CHECK (result IN ('passed', 'failed', 'conditional')),
    -- Perioada ITP (în luni)
    period_months INTEGER NOT NULL DEFAULT 12 CHECK (period_months IN (6, 12, 24)),
    -- Data expirare (calculată automat)
    expiration_date DATE NOT NULL,
    next_inspection_date DATE, -- Calculat după completare
    mileage INTEGER,
    notes TEXT,
    -- Detalii inspecție
    emissions_test BOOLEAN DEFAULT false,
    emissions_result VARCHAR(50) CHECK (emissions_result IN ('passed', 'failed')),
    brake_test BOOLEAN DEFAULT false,
    brake_result VARCHAR(50) CHECK (brake_result IN ('passed', 'failed')),
    lights_test BOOLEAN DEFAULT false,
    lights_result VARCHAR(50) CHECK (lights_result IN ('passed', 'failed')),
    -- Documente
    certificate_number VARCHAR(100),
    certificate_file_url TEXT,
    photos TEXT[], -- Array de URL-uri
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru inspecții
CREATE INDEX idx_inspections_station ON inspections(station_id);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX idx_inspections_client ON inspections(client_id);
CREATE INDEX idx_inspections_engineer ON inspections(engineer_id);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_expiration_date ON inspections(expiration_date);
CREATE INDEX idx_inspections_status ON inspections(status);

-- Tabel: notifications (Notificări)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('inspection_due', 'inspection_expired', 'inspection_scheduled', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50) CHECK (related_entity_type IN ('inspection', 'vehicle', 'client')),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pentru notificări
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_station ON notifications(station_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Funcții pentru calcul automat data expirare
CREATE OR REPLACE FUNCTION calculate_expiration_date(
    start_date DATE,
    period_months INTEGER
) RETURNS DATE AS $$
BEGIN
    RETURN start_date + (period_months || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger pentru calcul automat data expirare la inserare/update ITP
CREATE OR REPLACE FUNCTION set_inspection_expiration_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Dacă este programare nouă, calculează din scheduled_date
    IF NEW.status = 'scheduled' AND NEW.expiration_date IS NULL THEN
        NEW.expiration_date := calculate_expiration_date(
            NEW.scheduled_date::DATE,
            NEW.period_months
        );
    END IF;
    
    -- Dacă ITP-ul este completat și a trecut, calculează next_inspection_date
    IF NEW.status IN ('passed', 'failed') AND NEW.completed_date IS NOT NULL THEN
        NEW.next_inspection_date := calculate_expiration_date(
            NEW.completed_date::DATE,
            NEW.period_months
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_inspection_expiration_date
    BEFORE INSERT OR UPDATE ON inspections
    FOR EACH ROW
    EXECUTE FUNCTION set_inspection_expiration_date();

-- Funcție pentru actualizare updated_at automat
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger-uri pentru updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Utilizatorii pot vedea doar datele companiei lor
CREATE POLICY "Users can view own company data" ON companies
    FOR SELECT USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own company users" ON users
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own company stations" ON stations
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own company clients" ON clients
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own company vehicles" ON vehicles
    FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Inginerii pot vedea doar ITP-urile stației lor
CREATE POLICY "Engineers can view own station inspections" ON inspections
    FOR SELECT USING (
        station_id IN (
            SELECT station_id FROM users WHERE id = auth.uid()
        ) OR
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() WHERE role = 'manager'
        )
    );

-- Managerii pot vedea toate ITP-urile companiei
-- (Policy de mai sus acoperă și managerii)

-- Nota: Pentru autentificare, va trebui să folosim Supabase Auth
-- Aceste policy-uri presupun că auth.uid() returnează user_id din tabelul users
-- În producție, va trebui să sincronizăm Supabase Auth cu tabelul users
