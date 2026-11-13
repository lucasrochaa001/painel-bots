import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type http from "node:http";
import { createApp } from "../src/server.js";
import { Store } from "../src/store.js";

const TOKEN = "teste-" + "m".repeat(40);
let server: http.Server;
let base = "";
let dir = "";

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "painel-marca-"));
  server = createApp({ token: TOKEN, store: await Store.open(dir), log: () => {} });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  await rm(dir, { recursive: true, force: true });
});

const auth = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
function ingest(body: unknown) {
  return fetch(`${base}/ingest`, { method: "POST", headers: auth, body: JSON.stringify(body) });
}
async function state() {
  const r = await fetch(`${base}/api/state`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(r.status, 200);
  return (await r.json()) as { brand: unknown; org: unknown; bots: Record<string, unknown> };
}

test("estado novo não traz marca nem organograma", async () => {
  const s = await state();
  assert.equal(s.brand, null);
  assert.equal(s.org, null);
});

test("brand válido entra no estado e no arquivo; campo extra ou monograma inválido → 400", async () => {
  const ok = await ingest({ type: "brand", name: "Atlas Consultoria", subtitle: "Gestão", mark: "ATL" });
  assert.equal(ok.status, 200);
  assert.deepEqual((await state()).brand, { name: "Atlas Consultoria", subtitle: "Gestão", mark: "atl" });
  assert.equal((await ingest({ type: "brand", name: "Atlas", logo: "http://x" })).status, 400);
  assert.equal((await ingest({ type: "brand", name: "Atlas", mark: "!!!!" })).status, 400);
  assert.equal((await ingest({ type: "brand", name: "" })).status, 400);
  const saved = JSON.parse(await readFile(path.join(dir, "state.json"), "utf8"));
  assert.equal(saved.brand.mark, "atl");
  const deNovo = await Store.open(dir);
  assert.equal(deNovo.state.brand?.name, "Atlas Consultoria");
});

test("org com reports_to, cargo e cobra; lista vazia limpa; inválido → 400", async () => {
  const ok = await ingest({
    type: "org",
    owner: { name: "Dono", role: "humano · decide" },
    nodes: [
      { bot: "CEO", role: "geral", reports_to: "Dono" },
      { bot: "Jurídico", role: "diretoria", reports_to: "CEO" },
    ],
    cobra: [{ from: "Jurídico", label: "cobra prazos de todos" }],
  });
  assert.equal(ok.status, 200);
  const org = (await state()).org as { owner: { name: string }; nodes: { bot: string }[]; cobra: { to: string | null }[] };
  assert.equal(org.owner.name, "Dono");
  assert.deepEqual(org.nodes.map((n) => n.bot), ["CEO", "Jurídico"]);
  assert.equal(org.cobra[0]!.to, null);
  assert.equal((await ingest({ type: "org", nodes: [{ bot: "CEO", role: "x", reports_to: "CEO" }] })).status, 400);
  assert.equal((await ingest({ type: "org", nodes: [{ bot: "A" }, { bot: "A" }] })).status, 400);
  assert.equal((await ingest({ type: "org", nodes: [], extra: 1 })).status, 400);
  // limpa: volta o fallback por andar
  assert.equal((await ingest({ type: "org", nodes: [] })).status, 200);
  assert.equal((await state()).org, null);
  const depois = await state();
  assert.equal(depois.org, null);
  assert.equal((await ingest({ type: "status", bot: "CEO", status: "working", step: "Reunião" })).status, 200);
  assert.equal((await state()).bots["CEO"] != null, true);
});
