// Integration de seguridad contra un Supabase LOCAL real, orquestado con
// testcontainers-node (sin bash ni CLI de Supabase). Levanta una vez:
//   Postgres (+migraciones) · PostgREST · GoTrue · gateway nginx
// y prueba: el flujo de invitaciones (create/redeem) y la RLS por el camino real
// (HTTP → PostgREST → auth.uid()). Cleanup automático (Ryuk + after()).
//
// Fuera de test/*.test.js → `npm test` no lo ejecuta. Lánzalo con:
//   npm run test:integration

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GenericContainer, Network, Wait } from "testcontainers";
import createInvite from "../../api/create-invite.js";
import redeemInvite from "../../api/redeem-invite.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const PGPW = "postgres";
const ADMIN_SECRET = "test-admin-secret";

const jwt = (role) => {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b({ alg: "HS256", typ: "JWT" });
  const payload = b({ role, iss: "local", iat: now, exp: now + 86400 });
  const sig = crypto.createHmac("sha256", SECRET).update(head + "." + payload).digest("base64url");
  return `${head}.${payload}.${sig}`;
};
const SERVICE = jwt("service_role");
const ANON = jwt("anon");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let network, db, rest, auth, gw, BASE;

before(async () => {
  network = await new Network().start();

  db = await new GenericContainer("supabase/postgres:15.1.0.147")
    .withNetwork(network).withNetworkAliases("db")
    .withEnvironment({ POSTGRES_PASSWORD: PGPW })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  // supabase/postgres reinicia durante el init; esperamos 3 respuestas estables.
  let ok = 0;
  for (let i = 0; i < 60 && ok < 3; i++) {
    const r = await db.exec(["psql", "-U", "postgres", "-d", "postgres", "-tAc", "select 1"]);
    ok = r.exitCode === 0 ? ok + 1 : 0;
    if (ok < 3) await sleep(1000);
  }
  if (ok < 3) throw new Error("Postgres no quedó estable");

  // Passwords de los roles de servicio (como superusuario, por TCP).
  await db.exec(["bash", "-lc",
    `PGPASSWORD=${PGPW} psql -h 127.0.0.1 -U supabase_admin -d postgres -c ` +
    `"alter role authenticator with password '${PGPW}'; alter role supabase_auth_admin with password '${PGPW}';"`]);

  // Migraciones (crea las tablas que PostgREST cacheará al arrancar).
  const migDir = path.join(ROOT, "supabase", "migrations");
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(migDir, f), "utf8");
    const r = await db.exec(["psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", sql]);
    if (r.exitCode !== 0) throw new Error(`migración ${f} falló: ${r.output}`);
  }

  rest = await new GenericContainer("postgrest/postgrest:v12.2.3")
    .withNetwork(network).withNetworkAliases("rest")
    .withEnvironment({
      PGRST_DB_URI: `postgres://authenticator:${PGPW}@db:5432/postgres`,
      PGRST_DB_SCHEMAS: "public", PGRST_DB_ANON_ROLE: "anon",
      PGRST_JWT_SECRET: SECRET, PGRST_DB_USE_LEGACY_GUCS: "true",
    })
    .withExposedPorts(3000)
    .withWaitStrategy(Wait.forHttp("/", 3000).forStatusCode(200))
    .start();

  auth = await new GenericContainer("supabase/gotrue:v2.151.0")
    .withNetwork(network).withNetworkAliases("auth")
    .withEnvironment({
      GOTRUE_API_HOST: "0.0.0.0", GOTRUE_API_PORT: "9999", API_EXTERNAL_URL: "http://localhost:9999",
      GOTRUE_DB_DRIVER: "postgres",
      GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${PGPW}@db:5432/postgres`,
      GOTRUE_SITE_URL: "http://localhost:3000", GOTRUE_JWT_SECRET: SECRET,
      GOTRUE_JWT_AUD: "authenticated", GOTRUE_JWT_ADMIN_ROLES: "service_role",
      GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated", GOTRUE_MAILER_AUTOCONFIRM: "true",
      GOTRUE_DISABLE_SIGNUP: "false", GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
    })
    .withExposedPorts(9999)
    .withWaitStrategy(Wait.forHttp("/health", 9999).forStatusCode(200))
    .start();

  const nginxConf = `events {}
http {
  server {
    listen 8000;
    location /rest/v1/ { proxy_pass http://rest:3000/; }
    location /auth/v1/ { proxy_pass http://auth:9999/; }
  }
}`;
  gw = await new GenericContainer("nginx:alpine")
    .withNetwork(network).withNetworkAliases("gw")
    .withCopyContentToContainer([{ content: nginxConf, target: "/etc/nginx/nginx.conf" }])
    .withExposedPorts(8000)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  BASE = `http://${gw.getHost()}:${gw.getMappedPort(8000)}`;
  // Las funciones serverless leen estas env en tiempo de ejecución.
  process.env.SUPABASE_URL = BASE;
  process.env.SUPABASE_SERVICE_ROLE = SERVICE;
  process.env.ADMIN_TRIGGER_SECRET = ADMIN_SECRET;
}, { timeout: 240_000 });

after(async () => {
  await gw?.stop(); await auth?.stop(); await rest?.stop(); await db?.stop(); await network?.stop();
});

// ── helpers ─────────────────────────────────────────────────────────────────
const mockRes = () => ({ statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; } });
let uniq = 0;
async function signup() {
  const email = `it${Date.now()}_${uniq++}@example.com`;
  const j = await (await fetch(`${BASE}/auth/v1/signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  })).json();
  return { token: j.access_token, id: j.user && j.user.id };
}
async function newInvite() {
  const res = mockRes();
  await createInvite({ method: "POST", headers: { "x-admin-secret": ADMIN_SECRET } }, res);
  return res;
}
function rest_(pathQuery, { token, method = "GET", body, prefer } = {}) {
  const headers = { apikey: token, Authorization: "Bearer " + token };
  if (body) headers["Content-Type"] = "application/json";
  if (prefer) headers["Prefer"] = prefer;
  return fetch(`${BASE}/rest/v1/${pathQuery}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
const provision = (userId, nombre) => rest_("porra_jugadores", { token: SERVICE, method: "POST", prefer: "return=minimal", body: { nombre, user_id: userId } });

// ── flujo de invitaciones ─────────────────────────────────────────────────────
describe("invite flow (serverless contra Supabase local)", () => {
  test("create-invite: secreto incorrecto → 401", async () => {
    const res = mockRes();
    await createInvite({ method: "POST", headers: { "x-admin-secret": "malo" } }, res);
    assert.equal(res.statusCode, 401);
  });
  test("create-invite: con el secreto crea invitación (token + caducidad)", async () => {
    const res = await newInvite();
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token && res.body.expires_at);
  });
  test("redeem-invite: invitación válida da de alta al jugador", async () => {
    const inv = await newInvite();
    const u = await signup();
    const res = mockRes();
    await redeemInvite({ method: "POST", headers: { authorization: "Bearer " + u.token }, body: { token: inv.body.token } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.nombre);
  });
  test("redeem-invite: segundo canje es idempotente", async () => {
    const inv = await newInvite();
    const u = await signup();
    const req = { method: "POST", headers: { authorization: "Bearer " + u.token }, body: { token: inv.body.token } };
    const r1 = mockRes(); await redeemInvite(req, r1);
    const r2 = mockRes(); await redeemInvite(req, r2);
    assert.equal(r1.statusCode, 200);
    assert.equal(r2.body.alreadyMember, true);
  });
  test("redeem-invite: invitación caducada → 403", async () => {
    const token = "00000000-0000-0000-0000-0000000000ff";
    await rest_("invitaciones", { token: SERVICE, method: "POST", prefer: "return=minimal", body: { token, expires_at: new Date(Date.now() - 1000).toISOString() } });
    const u = await signup();
    const res = mockRes();
    await redeemInvite({ method: "POST", headers: { authorization: "Bearer " + u.token }, body: { token } }, res);
    assert.equal(res.statusCode, 403);
  });
  test("redeem-invite: sin sesión → 401; sin token → 400", async () => {
    const r1 = mockRes();
    await redeemInvite({ method: "POST", headers: {}, body: { token: "x" } }, r1);
    assert.equal(r1.statusCode, 401);
    const u = await signup();
    const r2 = mockRes();
    await redeemInvite({ method: "POST", headers: { authorization: "Bearer " + u.token }, body: {} }, r2);
    assert.equal(r2.statusCode, 400);
  });
});

// ── RLS por el camino real (PostgREST + JWT) ───────────────────────────────────
describe("RLS vía REST real", () => {
  test("anon no puede leer jugadores", async () => {
    const u = await signup();
    const nombre = "Anon" + Date.now();
    await provision(u.id, nombre);
    const res = await rest_(`porra_jugadores?nombre=eq.${encodeURIComponent(nombre)}`, { token: ANON });
    const j = await res.json().catch(() => null);
    assert.ok(res.status >= 400 || (Array.isArray(j) && j.length === 0));
  });
  test("un autenticado NO-miembro tampoco puede leer (invite-only real)", async () => {
    const u = await signup();   // logueado pero sin alta → no es miembro
    const res = await rest_("porra_jugadores?select=user_id", { token: u.token });
    const j = await res.json().catch(() => null);
    assert.ok(Array.isArray(j) && j.length === 0, "un no-miembro no debe ver ninguna fila");
  });
  test("un miembro sí lee la clasificación completa", async () => {
    const a = await signup(); const b = await signup();
    await provision(a.id, "MemberA"); await provision(b.id, "MemberB");
    const res = await rest_("porra_jugadores?select=user_id", { token: a.token });
    const j = await res.json();
    assert.equal(res.status, 200);
    assert.ok(j.length >= 2, "un miembro ve a todos los jugadores");
  });
  test("anon no puede insertar jugadores", async () => {
    const res = await rest_("porra_jugadores", { token: ANON, method: "POST", prefer: "return=minimal", body: { nombre: "Hacker", user_id: "33333333-3333-3333-3333-333333333333" } });
    assert.ok(res.status >= 400);
  });
  test("el dueño puede actualizar SU fila", async () => {
    const a = await signup();
    await provision(a.id, "OwnerA");
    const res = await rest_(`porra_jugadores?user_id=eq.${a.id}`, { token: a.token, method: "PATCH", prefer: "return=representation", body: { nombre: "OwnerA2" } });
    const j = await res.json();
    assert.equal(res.status, 200);
    assert.equal(j.length, 1);
    assert.equal(j[0].nombre, "OwnerA2");
  });
  test("un usuario NO puede modificar la fila de otro", async () => {
    const a = await signup(); const b = await signup();
    await provision(a.id, "A"); await provision(b.id, "B-orig");
    const res = await rest_(`porra_jugadores?user_id=eq.${b.id}`, { token: a.token, method: "PATCH", prefer: "return=representation", body: { nombre: "HACK" } });
    assert.equal((await res.json()).length, 0);
    const check = await (await rest_(`porra_jugadores?user_id=eq.${b.id}&select=nombre`, { token: SERVICE })).json();
    assert.equal(check[0].nombre, "B-orig");
  });
  test("authenticated no puede leer invitaciones", async () => {
    const u = await signup();
    const res = await rest_("invitaciones?select=token", { token: u.token });
    const j = await res.json().catch(() => null);
    assert.ok(res.status >= 400 || (Array.isArray(j) && j.length === 0));
  });
});
