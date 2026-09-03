import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Create an pg Pool instance
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Pass the pool instance object into PrismaPg
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with the adapter
export const prisma = new PrismaClient({ adapter });
