// Visual ANA: lógica pura (parado há +12h, quem senta na mesa, lugares da copa) e o que o HTML precisa ter
// (abas, organograma "em breve", faixa de erro, fontes do próprio serviço, paleta ANA, identidade dos bots).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type http from "node:http";
import { createApp } from "../src/server.js";
import { Store } from "../src/store.js";
import { distribuiCopa, parados, sentaNaMesa } from "../src/painel.js";
import { loginPage, panelPage } from "../src/page.js";

const AGORA = Date.parse("2026-11-11T13:00:00Z");
const h = (horas: number, min = 0) => new Date(AGORA - (horas * 60 + min) * 60000).toISOString();
const w = (nome: string, horas: number, min = 0, status = "waiting_user") => ({ nome, status, status_at: h(horas, min) });

test("parado há +12h: só waiting_user com MAIS de 12 h; 12 h cravadas e status diferentes ficam de fora", () => {
  const r = parados(
    [w("A", 12), w("B", 12, 1), w("C", 30, 0, "idle"), w("D", 20, 0, "error"), w("E", 13), { nome: "F", status: "waiting_user" }, { nome: "G", status: "waiting_user", status_at: "lixo" }],
    AGORA,
    12,
  );
  assert.deepEqual(r.map((x) => x.nome), ["E", "B"]);
});

test("parado há +12h: do mais antigo ao mais novo, rótulo 17h53 e barra relativa ao mais antigo", () => {
  const r = parados([w("Plataforma", 13, 23), w("Integra", 17, 53), w("Editor", 16, 13)], AGORA, 12);
  assert.deepEqual(r.map((x) => [x.nome, x.label]), [["Integra", "17h53"], ["Editor", "16h13"], ["Plataforma", "13h23"]]);
  assert.equal(r[0]!.pct, 100);
  assert.ok(r[1]!.pct > r[2]!.pct && r[2]!.pct >= 6 && r[1]!.pct < 100);
  assert.equal(parados([w("X", 14, 5)], AGORA, 12)[0]!.label, "14h05");
  assert.deepEqual(parados([], AGORA, 12), []);
});

test("quem trabalha, espera ou está com erro senta à mesa; o resto descansa na copa", () => {
  for (const s of ["working", "waiting_user", "error"]) assert.equal(sentaNaMesa(s), true, s);
  for (const s of ["idle", "done", undefined, null, ""]) assert.equal(sentaNaMesa(s as string), false, String(s));
});

test("copa: lugar estável, quem chega pega o menor livre e passando do total vira lugar em pé", () => {
  const a = distribuiCopa(["Zé", "Ana", "Bia"], null, 3);
  assert.deepEqual(a, { Ana: 0, Bia: 1, Zé: 2 });
  // Bia saiu da copa, Caio chegou: Ana e Zé não mudam de lugar; Caio ocupa o lugar livre
  assert.deepEqual(distribuiCopa(["Zé", "Ana", "Caio"], a, 3), { Ana: 0, Zé: 2, Caio: 1 });
  // mais bots que lugares: excedentes ganham índices >= total, sem repetir
  const cheio = distribuiCopa(["a", "b", "c", "d", "e"], null, 3);
  assert.deepEqual(Object.values(cheio).sort(), [0, 1, 2, 3, 4]);
  assert.ok(Object.values(cheio).filter((i) => i >= 3).length === 2);
  // lugar repetido em `atuais` não duplica
  const dup = distribuiCopa(["a", "b"], { a: 0, b: 0 }, 3);
  assert.notEqual(dup["a"], dup["b"]);
});

const html = panelPage("nonce-ana");

test("abas não encolhem: MAPA, LISTA e ORGANOGRAMA ficam inteiras", () => {
  const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
  assert.match(css, /\.abas\{[^}]*flex:none[^}]*min-width:max-content/);
  assert.match(css, /\.abas button\{[^}]*white-space:nowrap/);
});

test("topbar: emblema genérico, título, Ao vivo, pílulas, abas MAPA | LISTA | ORGANOGRAMA e Sair", () => {
  for (const s of ['id="emblema">pb', 'id="marca-nome">Painel', 'id="marca-sub">Status dos bots', "PAINEL DOS BOTS", 'id="vivotxt"', 'id="contas"', 'data-aba="mapa">MAPA', 'data-aba="lista">LISTA', 'data-aba="org">ORGANOGRAMA', 'action="/logout"', "brandResolve("])
    assert.ok(html.includes(s), "faltou " + s);
  assert.ok(!html.includes("GRUPO RRB") && !html.includes("A NOVA"), "a marca não vem cravada no HTML");
});

test("faixa de erro: só quando há bot em erro, com o motivo e botão que abre o chat", () => {
  assert.ok(html.includes('<div id="errs" hidden></div>'));
  const f = html.slice(html.indexOf("function faixaErro("), html.indexOf("function esquerda("));
  assert.ok(f.includes("stt(n)==='error'"));
  assert.ok(f.includes("box.toggleAttribute('hidden',!es.length)"));
  assert.ok(f.includes("b.step||'deu erro'"));
  assert.ok(f.includes("linkChat(n,'go','Abrir chat')"));
});

test("coluna esquerda: Precisa de você (waiting_user + pedido + Abrir chat), Parado há +12h, Andares e Atividade", () => {
  const e = html.slice(html.indexOf("function esquerda("), html.indexOf("function direita("));
  for (const s of ["'Precisa de você'", "stt(n)==='waiting_user'", "b.step||'sem pedido registrado'", "linkChat(n,'bt')", "parados(", "PARADO HÁ +", "'Andares'", "'Atividade'"])
    assert.ok(e.includes(s), "faltou " + s);
  assert.ok(html.includes("PARADO_H=12"));
});

test("coluna direita e aba LISTA existem; LISTA usa os mesmos dados do estado", () => {
  for (const s of ["'Consumo da semana'", "'Rotinas'", "'Passos recentes'", "function tabela(", "'Todos os bots'"]) assert.ok(html.includes(s), "faltou " + s);
  assert.ok(html.includes("linkChat(botSel,'cta','Abrir chat')"));
});

test("paleta: fundo escuro, dourado, verde de quem trabalha, erro; sem fundo claro", () => {
  const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
  for (const c of ["#0c0b09", "#d4af37", "#f6f1e6", "#e85d4c", "#3dcc7a"]) assert.ok(css.includes(c), "faltou " + c);
  assert.match(css, /--bg:#0c0b09/);
  assert.doesNotMatch(css, /background:\s*(?:#fff\b|#ffffff\b|#e9ecf1|white)/i, "fundo claro");
  for (const f of ["Orbitron", "Inter", "JetBrains Mono"]) assert.ok(css.includes(f), "faltou fonte " + f);
});

test("identidade dos bots: forma e cor do look e a foto de /avatar/<nome> continuam", () => {
  for (const s of ["var look=(b&&b.look)||{},forma=look.shape||'blob',cor=hex(look.color||'violet')", "'/avatar/'+encodeURIComponent(nome)", "st.avatars[nome]", "function formas(s)"])
    assert.ok(html.includes(s), "faltou " + s);
});

test("mapa: mesa com cadeira, copa para quem descansa e rótulo fixo só de trabalhando/esperando/erro", () => {
  for (const s of ["function cadeira(", "function mesa(", "COPA · DESCANSO", "var dorme=lista.filter(function(nn){return !sentaNaMesa(stt(nn));})", "function dica(", "if(s==='working'||s==='waiting_user'||s==='error')bals.push("])
    assert.ok(html.includes(s), "faltou " + s);
});

test("login também no tema escuro e sem fundo claro", () => {
  const l = loginPage("n", "chave errada");
  assert.ok(l.includes("chave errada") && l.includes('class="login glass"') && l.includes("#0c0b09"));
});

let server: http.Server;
let base = "";
before(async () => {
  server = createApp({ token: "teste-" + "z".repeat(40), store: await Store.open(undefined), log: () => {} });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

test("fontes: servidas pelo próprio serviço (woff2, só as 3 da lista) e a CSP libera font-src 'self' e nada de fora", async () => {
  for (const f of ["orbitron", "inter", "jetbrains-mono"]) {
    const r = await fetch(`${base}/fonts/${f}.woff2`);
    assert.equal(r.status, 200, f);
    assert.equal(r.headers.get("content-type"), "font/woff2");
    const buf = Buffer.from(await r.arrayBuffer());
    assert.equal(buf.subarray(0, 4).toString("latin1"), "wOF2", "arquivo woff2");
  }
  for (const rota of ["/fonts/../package.json", "/fonts/%2e%2e/package.json", "/fonts/outra.woff2", "/fonts/inter.woff2.map"])
    assert.equal((await fetch(`${base}${rota}`)).status, 404, rota);
  const csp = (await fetch(`${base}/`)).headers.get("content-security-policy") ?? "";
  assert.match(csp, /font-src 'self'/);
  assert.match(csp, /default-src 'none'/);
  assert.ok(!/https?:|data:|\*/.test(csp), "CSP sem origem externa");
  // as fontes não abrem nenhum dado: /api/state continua protegido
  assert.equal((await fetch(`${base}/api/state`)).status, 401);
});

test("rótulos do mapa desviam do letreiro COPA e dos textos do piso (colisão contra texto, não só contra bots)", () => {
  assert.ok(html.includes("function obstTexto("));
  assert.ok(html.includes("obstTexto(sv('text',{transform:tm,"), "letreiro COPA vira obstáculo");
  assert.ok(html.includes("obstTexto(t,m,sz);return t;}"), "textos do piso (ÁREA DE TRABALHO / COPA · DESCANSO) viram obstáculo");
  // os balões consideram esses retângulos (rects) além dos outros bots; rects nasce antes do primeiro texto
  assert.ok(html.indexOf(" var rects=[];") > 0 && html.indexOf(" var rects=[];") < html.indexOf("function obstTexto("));
  // o rótulo também desvia de TODOS os bots do piso, inclusive o próprio dono (correção B), via posicionaRotulo
  assert.ok(html.includes("posicionaRotulo(b.x,b.y,w,h,postos,rects,vb)"));
  assert.ok(!html.includes("r.nome!==b.nome"));
});

test("LISTA: avatar de cada linha usa o mesmo boneco do mapa (look + foto) e ids de gradiente nunca repetem", () => {
  assert.ok(html.includes("function mini(nome,px){var s=boneco(nome,bot(nome),px||26);"));
  assert.ok(html.includes("nd.appendChild(mini(n,28))"));
  // o contador de ids não volta a zero: um svg antigo (mapa escondido) não rouba o gradiente do boneco da lista
  assert.doesNotMatch(html, /uid=0[;,]?[^,]*desenhar|if\(!transAndar\)uid=0/);
  assert.equal((html.match(/uid=0/g) ?? []).length, 1, "uid só é inicializado na declaração");
});

test("LISTA: rola dentro do painel central, cabeçalho fixo e a rolagem sobrevive ao redesenho", () => {
  const css = html.slice(html.indexOf("<style"), html.indexOf("</style>"));
  assert.match(css, /\.rol\{overflow:auto/);
  assert.match(css, /\.lista-wrap \.rol\{flex:1 1 0;min-height:0\}/);
  assert.match(css, /\.tabela th\{[^}]*position:sticky;top:0/);
  assert.match(css, /#C\{[^}]*overflow:hidden/);
  assert.ok(html.includes("topo=ro?ro.scrollTop:0") && html.includes("rol.scrollTop=topo;"));
});
