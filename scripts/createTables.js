import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // make sure .env has DATABASE_URL
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "clerkUserId" TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      "imageUrl" TEXT,
      industry TEXT,
      bio TEXT,
      experience INT,
      skills TEXT[],
      createdAt TIMESTAMPTZ DEFAULT NOW(),
      updatedAt TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "Resume" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" TEXT UNIQUE REFERENCES "User"(id),
      content TEXT,
      "atsScore" FLOAT,
      feedback TEXT,
      createdAt TIMESTAMPTZ DEFAULT NOW(),
      updatedAt TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add all remaining tables here based on your schema.prisma
  `);

  console.log("All tables created successfully!");
  await pool.end();
}

main().catch(console.error);
