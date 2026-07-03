import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// Single pooled connection + Drizzle client. Repositories are the only layer
// that imports this (see architecture: route → controller → service → repository).
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export { schema };
export type DB = typeof db;
