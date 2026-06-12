import fs from "node:fs";
import path from "node:path";
import pg from "pg";

function loadEnv() {
  const text = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const env = loadEnv();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;
const { Client } = pg;

const regions = ["us-east-1","us-west-1","eu-west-1","eu-west-2","eu-central-1","eu-central-2","ap-southeast-1","ap-south-1"];
const hosts = [];
for (const p of ["aws-0","aws-1"]) for (const r of regions) hosts.push({ host: `${p}-${r}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` });

for (const cfg of hosts) {
  const client = new Client({ ...cfg, password, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 7000 });
  try {
    await client.connect();
    const r = await client.query("select current_database(), inet_server_addr()");
    console.log(`SUCCESS ${cfg.host} ->`, r.rows[0]);
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(`${cfg.host}: ${e.code} ${e.message}`);
    try { await client.end(); } catch {}
  }
}
console.log("No pooler host worked.");
