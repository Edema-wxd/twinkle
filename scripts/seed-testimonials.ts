import { neonConfig, Pool } from '@neondatabase/serverless'

// Node 18+ has a native WebSocket global; no ws package needed
neonConfig.webSocketConstructor = globalThis.WebSocket

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      quote TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    INSERT INTO testimonials (name, quote, display_order) VALUES
      ('Adaeze O.', 'These beads are absolutely stunning. I get compliments every single time I wear them.', 0),
      ('Funmi A.',  'Best quality loc accessories I have found in Nigeria. Fast delivery and beautiful packaging.', 1),
      ('Chiamaka B.', 'The 24K gold beads are exactly what I needed for my anniversary look. Worth every kobo.', 2)
    ON CONFLICT DO NOTHING
  `)

  await pool.end()
  console.log('Done — testimonials table created and seeded.')
}

main().catch((e) => { console.error(e); process.exit(1) })
