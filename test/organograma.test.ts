// Organograma: árvore a partir do "Reporta a", casamento com os bots do painel, cache/snapshot do servidor,
// rota /api/organograma e a correção A (selo NOVO em linha) e B (rótulos do mapa não cobrem bots).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import {
  ORG_TTL_MS,
  OrgSource,
  cargoCurto,
  carregaSnapshot,
  linhasDoNotion,
  linhasValidas,
  nomeCurto,
  orgArvore,
  orgCasa,
  orgNovo,
  type OrgLinha,
} from "../src/organograma.js";
import { posicionaRotulo } from "../src/painel.js";
import { createApp } from "../src/server.js";
import { Store } from "../src/store.js";
import { panelPage } from "../src/page.js";

const FORA_DO_ROSTER = ["Comprador", "Guru Financeiro", "Saúde Lucas", "Isadora", "Professor de Canto", "Assinaturas"];
function dadosDeHoje() {
  const snap = carregaSnapshot();
  const roster = snap.linhas.map((l) => l.nome).filter((n) => !FORA_DO_ROSTER.includes(n)).concat(["Engenheiro de Fluxo"]);
  const casa: Record<string, string | null> = {};
  for (const l of snap.linhas) casa[l.nome] = roster.includes(l.nome) ? l.nome : null;
  return { snap, roster, casa, arvore: orgArvore(snap.linhas, roster, casa) };
}

test("orgArvore: diretores na ordem DM, COO, DV, CFO, CS e times vindos do 'Reporta a'", () => {
  const { arvore: a } = dadosDeHoje();
  assert.equal(a.raiz, "Lucas Braga");
  assert.equal(a.ceo, "CEO ANA");
  assert.deepEqual(a.dirs.map((d) => d.nome), ["DM ANA", "COO ANA", "DV ANA", "CFO ANA", "CS ANA"]);
  const dm = a.dirs[0]!.filhos.map((f) => f.nome);
  assert.equal(dm.length, 8);
  assert.ok(!dm.includes("Eventos ANA"), "Eventos é do COO, não do DM");
  assert.deepEqual(dm.slice(0, 3), ["Tráfego ANA", "SEO & AEO ANA", "Design ANA"]);
  const coo = a.dirs[1]!.filhos;
  assert.deepEqual(coo.map((f) => f.nome), ["RH ANA", "Formações ANA", "Eventos ANA", "Produto ANA", "Processos ANA"]);
  assert.deepEqual(coo.find((f) => f.nome === "Produto ANA")!.filhos.map((f) => f.nome), ["Plataforma ANA"], "Plataforma fica recuada sob Produto");
  assert.deepEqual(a.dirs[2]!.filhos.map((f) => f.nome), ["Caçador de Vendas ANA"]);
  assert.equal(a.dirs[3]!.filhos.length + a.dirs[4]!.filhos.length, 0, "CFO e CS sem subordinados no Notion");
  assert.equal(a.pai["Plataforma ANA"], "Produto ANA");
  assert.equal(a.pai["CEO ANA"], "Lucas Braga");
});

test("orgArvore: faixa de apoio com 5 colunas fixas, bot fora do Notion e total de 39", () => {
  const { arvore: a } = dadosDeHoje();
  assert.deepEqual(a.apoio.map((b) => b.titulo), ["ASSISTÊNCIA", "INFRA DE BOTS", "PESSOAL", "TECH · RESEARCH", "GERAL · OPS"]);
  const donna = a.apoio[0]!.itens[0]!;
  assert.equal(donna.filhos[0]!.nome, "Comprador", "Comprador reporta à Donna");
  assert.deepEqual(a.apoio[2]!.itens.map((i) => i.nome), ["Guru Financeiro", "Saúde Lucas", "Isadora", "Professor de Canto"]);
  const eng = a.apoio[3]!.itens.find((i) => i.nome === "Engenheiro de Fluxo");
  assert.ok(eng?.fora, "Engenheiro de Fluxo está no roster e não no Notion: tira-teima 'fora do Notion'");
  assert.deepEqual(a.foraNotion, ["Engenheiro de Fluxo"]);
  assert.equal(a.total, 39);
});

test("orgArvore: quem não cabe nas colunas fixas vai para OUTROS e o RH não volta para o CEO", () => {
  const linhas: OrgLinha[] = [
    { nome: "Lucas Braga", reporta: [] },
    { nome: "CEO ANA", reporta: ["Lucas Braga"] },
    { nome: "COO ANA", reporta: ["CEO ANA"] },
    { nome: "RH ANA", reporta: ["COO ANA"] },
    { nome: "Bot Novo", reporta: ["Lucas Braga"] },
  ];
  const a = orgArvore(linhas, ["CEO ANA", "COO ANA", "RH ANA", "Bot Novo"], { "CEO ANA": "CEO ANA", "COO ANA": "COO ANA", "RH ANA": "RH ANA", "Bot Novo": "Bot Novo" });
  assert.deepEqual(a.dirs.map((d) => d.nome), ["COO ANA"]);
  assert.equal(a.pai["RH ANA"], "COO ANA");
  assert.deepEqual(a.apoio.find((b) => b.titulo === "OUTROS")!.itens.map((i) => i.nome), ["Bot Novo"]);
});

test("orgCasa: casa pelo ID do bot (no link do chat) e, sem id, pelo nome exato", () => {
  const linhas: OrgLinha[] = [
    { nome: "Nome no Notion", reporta: [], id: "ABCD-1234" },
    { nome: "Igual", reporta: [] },
    { nome: "Sumiu", reporta: [] },
  ];
  const bots = { "Nome no painel": { chat: "grokbot://app/v1/agent?id=abcd-1234" }, Igual: {}, Outro: { chat: "grokbot://app/v1/agent?id=zzzz-9999" } };
  assert.deepEqual(orgCasa(linhas, bots), { "Nome no Notion": "Nome no painel", Igual: "Igual", Sumiu: null });
});

test("cargoCurto, nomeCurto e selo NOVO (menos de 14 dias)", () => {
  assert.equal(cargoCurto("Donna Secretária · administrativo"), "Secretária Executiva");
  assert.equal(cargoCurto("Bot Qualquer", "Analista (rascunho) de Dados"), "Analista de Dados");
  assert.equal(nomeCurto("Donna Secretária · administrativo"), "Donna Secretária");
  const agora = Date.parse("2026-11-11T12:00:00-03:00");
  assert.equal(orgNovo("2026-11-01T10:00:00.000Z", agora), true);
  assert.equal(orgNovo("2026-10-20T10:00:00.000Z", agora), false);
  assert.equal(orgNovo(undefined, agora), false);
  assert.equal(orgNovo("lixo", agora), false);
  assert.equal(orgNovo("2027-01-01T00:00:00Z", agora), false, "data no futuro não é NOVO");
});

test("snapshot embutido: 39 linhas, rotulado como snapshot, sem nenhum token", async () => {
  const s = carregaSnapshot();
  assert.equal(s.fonte, "snapshot");
  assert.equal(s.linhas.length, 39);
  assert.ok(s.linhas.every((l) => l.nome && Array.isArray(l.reporta)));
  const bruto = await readFile(new URL("../../src/organograma-fallback.json", import.meta.url), "utf8");
  assert.doesNotMatch(bruto, /secret_|ntn_|Bearer/);
});

// ---- Notion simulado (sem rede) ----
const pg = (id: string, nome: string, pais: string[], extra: Record<string, unknown> = {}) => ({
  id,
  created_time: "2026-11-05T10:00:00.000Z",
  properties: {
    Agente: { title: [{ plain_text: nome }] },
    "Reporta a": { relation: pais.map((p) => ({ id: p })) },
    Cargo: { rich_text: [{ plain_text: "Cargo " + nome }] },
    "ID do bot": { rich_text: extra["id"] ? [{ plain_text: String(extra["id"]) }] : [] },
  },
});
const PAGINAS = [pg("aaaa-0001", "Lucas Braga", []), pg("aaaa-0002", "CEO ANA", ["aaaa-0001"], { id: "id-ceo" }), pg("aaaa-0003", "DM ANA", ["aaaa-0002"])];

function notionFalso(modo: { falha?: boolean; paginas?: unknown[][] } = {}) {
  const chamadas: { url: string; headers: Record<string, string>; body: string }[] = [];
  const fetchFn = async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
    chamadas.push({ url, headers: init.headers, body: init.body });
    if (modo.falha) return { ok: false, status: 500, json: async () => ({}) };
    const partes = modo.paginas ?? [PAGINAS];
    const i = chamadas.length - 1;
    const res = partes[Math.min(i, partes.length - 1)]!;
    return { ok: true, status: 200, json: async () => ({ results: res, has_more: i < partes.length - 1, next_cursor: i < partes.length - 1 ? "c" + i : null }) };
  };
  return { fetchFn, chamadas };
}

test("linhasDoNotion: resolve 'Reporta a' por nome e lê cargo, ID do bot e criado", () => {
  const l = linhasDoNotion(PAGINAS);
  assert.deepEqual(l.map((x) => x.nome), ["Lucas Braga", "CEO ANA", "DM ANA"]);
  assert.deepEqual(l[2]!.reporta, ["CEO ANA"]);
  assert.equal(l[1]!.id, "id-ceo");
  assert.equal(l[1]!.cargo, "Cargo CEO ANA");
  assert.equal(l[1]!.criado, "2026-11-05T10:00:00.000Z");
  assert.equal(linhasValidas([{ nome: "" }]), null);
  assert.equal(linhasValidas("x"), null);
});

test("OrgSource: Notion fresco, cache de 10 min e rótulo 'cache' quando o Notion falha", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "org-"));
  try {
    let t = Date.parse("2026-11-11T12:00:00-03:00");
    const ok = notionFalso();
    const src = new OrgSource({ token: "tok-de-teste", dir, fetchFn: ok.fetchFn, now: () => t });
    const a = await src.get();
    assert.equal(a.fonte, "notion");
    assert.equal(a.linhas.length, 3);
    assert.equal(ok.chamadas.length, 1);
    assert.match(ok.chamadas[0]!.url, /\/v1\/databases\/7c6ab94d-9f4e-4dc1-b541-c8ee6df911c3\/query$/);
    assert.equal(ok.chamadas[0]!.headers["Notion-Version"], "2022-06-28");
    assert.ok(ok.chamadas[0]!.headers["Authorization"]?.startsWith("Bearer "));
    t += ORG_TTL_MS - 1000;
    await src.get();
    assert.equal(ok.chamadas.length, 1, "dentro dos 10 min usa a memória");
    // espelho em arquivo, sem token
    const arq = await readFile(path.join(dir, "organograma-cache.json"), "utf8");
    assert.equal(JSON.parse(arq).linhas.length, 3);
    assert.ok(!arq.includes("tok-de-teste"));
    // depois do TTL o Notion cai: serve o último cache, rotulado
    const ruim = notionFalso({ falha: true });
    const src2 = new OrgSource({ token: "tok-de-teste", dir, fetchFn: ruim.fetchFn, now: () => t + ORG_TTL_MS + 5000 });
    const b = await src2.get();
    assert.equal(b.fonte, "cache");
    assert.equal(b.linhas.length, 3);
    assert.equal(Date.parse(b.em), Date.parse("2026-11-11T12:00:00-03:00"));
    assert.equal(ruim.chamadas.length, 1);
    await src2.get();
    assert.equal(ruim.chamadas.length, 1, "depois de falhar espera 1 min antes de tentar de novo");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("OrgSource: sem token, ou sem cache e com Notion fora, serve o snapshot embutido", async () => {
  const semToken = new OrgSource({ fetchFn: notionFalso().fetchFn });
  assert.equal(semToken.temToken, false);
  assert.equal((await semToken.get()).fonte, "snapshot");
  const f = notionFalso({ falha: true });
  const dir = await mkdtemp(path.join(tmpdir(), "org-"));
  try {
    await writeFile(path.join(dir, "organograma-cache.json"), "{isto não é json");
    const src = new OrgSource({ token: "x", dir, fetchFn: f.fetchFn });
    const r = await src.get();
    assert.equal(r.fonte, "snapshot");
    assert.equal(r.linhas.length, 39);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("OrgSource: paginação do Notion e uma só busca para pedidos simultâneos", async () => {
  const f = notionFalso({ paginas: [PAGINAS.slice(0, 2), PAGINAS.slice(2)] });
  const src = new OrgSource({ token: "x", fetchFn: f.fetchFn });
  const [a, b] = await Promise.all([src.get(), src.get()]);
  assert.equal(a.linhas.length, 3);
  assert.equal(b.linhas.length, 3);
  assert.equal(f.chamadas.length, 2, "2 páginas, uma vez só");
  assert.match(f.chamadas[1]!.body, /start_cursor/);
});

// ---- rota ----
test("GET /api/organograma exige login, não aceita POST e nunca devolve o token", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "org-rota-"));
  const TOKEN = "teste-" + "o".repeat(40);
  const NOTION = "ntn_segredo_do_notion_" + "z".repeat(20);
  const f = notionFalso();
  const server = createApp({ token: TOKEN, store: await Store.open(dir), log: () => {}, org: new OrgSource({ token: NOTION, fetchFn: f.fetchFn }) });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/organograma`)).status, 401);
    const post = await fetch(`${base}/api/organograma`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(post.status, 405);
    const r = await fetch(`${base}/api/organograma`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(r.headers.get("cache-control"), "no-store");
    const txt = await r.text();
    assert.ok(!txt.includes(NOTION), "token do Notion nunca sai do servidor");
    const j = JSON.parse(txt);
    assert.equal(j.fonte, "notion");
    assert.equal(j.linhas.length, 3);
    const html = await (await fetch(`${base}/`, { headers: { Authorization: `Bearer ${TOKEN}` } })).text();
    assert.ok(!html.includes(NOTION));
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});

// ---- página ----
const html = panelPage("n");

test("aba ORGANOGRAMA: hierarquia do ingest org, fallback por andar, sem Notion na página", () => {
  assert.ok(!html.includes('id="breve"') && !html.includes("EM BREVE"));
  assert.ok(html.includes('<div class="org" id="org" hidden></div>'));
  assert.ok(html.includes("mostra('org',aba==='org')"));
  assert.ok(!html.includes("/api/organograma"), "a aba lê st.org, não o Notion");
  for (const s of ["Sem hierarquia definida", "agrupado por andar", "quem reporta a quem", "No organograma", "Reporta a", "Cobra prazos de", "orgLayout(", "minmax(0,1fr)", "sem status"])
    assert.ok(html.includes(s), "faltou " + s);
  assert.ok(!/notion\.com|secret_|ntn_|GRUPO RRB|COO ANA/.test(html), "a página não fala com o Notion nem crava um cliente");
  assert.ok(html.includes("prefers-reduced-motion"));
});

test("cartão do organograma: cargo em linha e ponto de status", () => {
  const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
  assert.match(css, /#org \.nd \.c\{[^}]*display:flex[^}]*gap:6px/);
  assert.match(css, /#org \.nd \.c \.ct\{[^}]*white-space:normal/);
  assert.match(css, /#org \.nd \.n\{[^}]*white-space:normal/);
  assert.match(css, /#org \.nd \.sd\{/);
  assert.ok(html.includes("function orgCard("));
  assert.doesNotMatch(css, /#org \.nd \.c \.ct\{[^}]*position:\s*absolute/);
});

test("organograma: colunas não crescem pelo texto (minmax(0,…)) e as outras abas seguem intactas", () => {
  const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
  assert.match(css, /#org \.r2\{[^}]*minmax\(158px,1fr\)/);
  assert.ok(html.includes("minmax(158px,1fr)"));
  for (const s of ['data-aba="mapa"', 'data-aba="lista"', "mostra('lista',aba==='lista')"]) assert.ok(html.includes(s), "faltou " + s);
});

// ---- correção B ----
test("correção B: com 9 bots esperando na mesma fileira, nenhum rótulo cobre um boneco nem outro rótulo", () => {
  const vb = { x0: 0, y0: 0, x1: 1400, y1: 900 };
  const W = 150;
  const H = 30;
  const postos = Array.from({ length: 9 }, (_, i) => ({ x: 120 + i * 62, y: 420 + (i % 2) * 14, w: 40, h: 56 }));
  const feitos: { x: number; y: number; w: number; h: number }[] = [];
  for (const p of postos) {
    const r = posicionaRotulo(p.x + p.w / 2, p.y, W, H, postos, feitos, vb);
    assert.ok(r.livre, "achou lugar limpo");
    const caixa = { x: r.x, y: r.y, w: W, h: H };
    for (const q of postos) assert.ok(!(caixa.x < q.x + q.w && caixa.x + W > q.x && caixa.y < q.y + q.h && caixa.y + H > q.y), "rótulo cobre um boneco (inclusive o do próprio dono)");
    for (const o of feitos) assert.ok(!(caixa.x < o.x + o.w && caixa.x + W > o.x && caixa.y < o.y + o.h && caixa.y + H > o.y), "rótulo cobre outro rótulo");
    feitos.push(caixa);
  }
  assert.equal(feitos.length, 9);
});

test("correção B: o próprio boneco conta como obstáculo e a página usa posicionaRotulo com todos os rects", () => {
  const vb = { x0: 0, y0: 0, x1: 800, y1: 600 };
  const dono = { x: 300, y: 200, w: 40, h: 56 };
  // sem nada em volta o rótulo fica acima; com um texto colado acima, escolhe outro lado sem tocar o dono
  const texto = { x: 200, y: 140, w: 260, h: 34 };
  const r = posicionaRotulo(320, 200, 150, 30, [dono], [texto], vb);
  const c = { x: r.x, y: r.y, w: 150, h: 30 };
  assert.ok(!(c.x < dono.x + dono.w && c.x + c.w > dono.x && c.y < dono.y + dono.h && c.y + c.h > dono.y), "não cobre o dono");
  assert.ok(!(c.x < texto.x + texto.w && c.x + c.w > texto.x && c.y < texto.y + texto.h && c.y + c.h > texto.y), "não cobre o texto");
  assert.ok(html.includes("posicionaRotulo(b.x,b.y,w,h,postos,rects,vb)"));
  assert.ok(!html.includes("r.nome!==b.nome"), "o próprio boneco não sai mais da lista de obstáculos");
});
