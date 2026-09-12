-- ========================================================
-- MEMORY RUSH - SUPABASE DATABASE SCHEMA
-- TCS EEE EXPO BOOTH EDITION
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GAME IMAGES TABLE
CREATE TABLE IF NOT EXISTS game_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'AI',
  storage_path TEXT,
  public_url TEXT NOT NULL,
  times_used INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GAMES TABLE
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'LOBBY', -- LOBBY, MEMORY, COUNTDOWN, PUZZLE, RESULT, FINISHED
  current_round INT DEFAULT 1,
  total_rounds INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- 3. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT DEFAULT NULL,
  tcs_unit TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING, MEMORIZING, PLAYING, COMPLETED, DISCONNECTED
  tournament_status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ADVANCED, ELIMINATED, WINNER
  eliminated_in_round INT DEFAULT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  connected BOOLEAN DEFAULT true,
  total_score INT DEFAULT 0
);

-- MIGRATION NOTE FOR EXISTING DATABASE:
-- ALTER TABLE players ALTER COLUMN employee_id DROP NOT NULL;
-- ALTER TABLE players ALTER COLUMN tcs_unit DROP NOT NULL;
-- ALTER TABLE players DROP CONSTRAINT IF EXISTS unique_room_employee_id;


-- 4. GAME ROUNDS TABLE
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  image_id UUID REFERENCES game_images(id),
  image_url TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM', -- EASY (9), MEDIUM (16), HARD (25), EXTREME (36)
  piece_count INT NOT NULL DEFAULT 16,
  memory_seconds INT NOT NULL DEFAULT 15,
  puzzle_seconds INT NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'PENDING',
  memory_start_at TIMESTAMPTZ,
  puzzle_start_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- 5. ROUND RESULTS TABLE
CREATE TABLE IF NOT EXISTS round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL DEFAULT 'EXPO26',
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  game_round_id UUID REFERENCES game_rounds(id) ON DELETE SET NULL,
  round_number INT NOT NULL DEFAULT 1,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  completion_time NUMERIC(10, 2) NOT NULL,
  score INT NOT NULL DEFAULT 100,
  rank INT NOT NULL DEFAULT 1,
  result_status TEXT NOT NULL DEFAULT 'ADVANCED', -- ADVANCED, ELIMINATED, WINNER
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  final_piece_order INT[]
);

-- 6. WINNERS TABLE
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  player_name TEXT NOT NULL,
  position INT NOT NULL, -- 1 = Champion, 2 = Runner Up, 3 = Third Place
  total_score INT NOT NULL,
  average_time NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_code);
CREATE INDEX IF NOT EXISTS idx_round_results_room_round ON round_results(room_code, round_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_round_player_result ON round_results(room_code, round_number, player_id);
CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_round_results_round ON round_results(game_round_id);
CREATE INDEX IF NOT EXISTS idx_game_images_category ON game_images(category);

-- SEED PRELOADED AI IMAGES
INSERT INTO game_images (name, description, category, public_url, times_used)
VALUES 
  ('Future of Generative AI', 'AI-powered neural interface workspace at TCS Expo', 'Generative AI', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=85', 12),
  ('Quantum Cybernetics', 'Futuristic AI neural grid and cyber architecture', 'Cybersecurity', 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=85', 8),
  ('Robotics & Automation', 'Autonomous humanoid robotics and smart manufacturing', 'Robotics', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=85', 5),
  ('Cloud AI Matrix', 'Distributed cloud computing infrastructure', 'Cloud', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85', 15),
  ('Smart Expo City 2026', 'Connected IoT metropolitan city grid of tomorrow', 'Smart City', 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1000&q=85', 9)
ON CONFLICT DO NOTHING;
