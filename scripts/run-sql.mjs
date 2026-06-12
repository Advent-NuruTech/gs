// One-off migration runner. Usage: node scripts/run-sql.mjs <path-to-sql>
// Reads Supabase DB connection from .env.local.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Provide a SQL file path.");
  process.exit(1);
}
const sql = fs.readFileSync(path.resolve(process.cwd(), sqlFile), "utf8");

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;

// IPv4 session pooler (region discovered via probe-db.mjs).
const candidates = [
  { host: `aws-1-eu-central-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
];

const { Client } = pg;

async function tryConnect(cfg) {
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

let client = null;
for (const cfg of candidates) {
  try {
    process.stdout.write(`Connecting ${cfg.host} (${cfg.user}) ... `);
    client = await tryConnect(cfg);
    console.log("OK");
    break;
  } catch (e) {
    console.log(`failed (${e.code || e.message})`);
  }
}

if (!client) {
  console.error("Could not connect to the database on any host.");
  process.exit(1);
}

try {
  await client.query(sql);
  console.log("SQL applied successfully.");
} catch (e) {
  console.error("SQL error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
