import { test } from "node:test";
import assert from "node:assert/strict";
import { BrandMark } from "../src/brand.js";
import { OrgChart, type OrgState } from "../src/orgchart.js";

test("marca genérica quando nada foi enviado; iniciais e monograma explícito", () => {
  assert.deepEqual(BrandMark.resolve(null), { name: "Painel", subtitle: "Status dos bots", mark: "pb" });
  assert.deepEqual(BrandMark.resolve({ name: "Atlas Consultoria", subtitle: "Gestão", mark: "" }), {
    name: "Atlas Consultoria",
    subtitle: "Gestão",
    mark: "ac",
  });
  assert.equal(BrandMark.resolve({ name: "Grupo RRB", subtitle: "Consultoria & Gestão", mark: "RRB" }).mark, "rrb");
  assert.equal(BrandMark.sane({ name: "Atlas", subtitle: "", mark: "atl" })?.mark, "atl");
  assert.equal(BrandMark.sane({ name: "", subtitle: "", mark: "" }), null);
  assert.equal(BrandMark.sane({ name: "Atlas", subtitle: "", mark: "!!!" }), null);
});

const arvore: OrgState = {
  owner: { name: "Dono", role: "humano · decide" },
  nodes: [
    { bot: "CEO", role: "geral", reports_to: "Dono" },
    { bot: "Jurídico", role: "diretoria", reports_to: "CEO" },
    { bot: "Comercial", role: "diretoria", reports_to: "CEO" },
    { bot: "Petições", role: "peças", reports_to: "Jurídico" },
    { bot: "Closer", role: "vendas", reports_to: "Comercial" },
  ],
  cobra: [{ from: "Comercial", label: "cobra prazos de todos", to: null }],
};

test("layout: dono, liderança, colunas e quem ficou de fora", () => {
  const lay = OrgChart.layout(arvore, ["CEO", "Jurídico", "Comercial", "Petições", "Closer", "Extra"]);
  assert.ok(lay);
  assert.equal(lay!.owner?.nome, "Dono");
  assert.equal(lay!.ceo?.nome, "CEO");
  assert.deepEqual(lay!.colunas.map((c) => c.head.nome), ["Comercial", "Jurídico"]);
  assert.deepEqual(lay!.colunas[0]!.stack.map((s) => s.nome), ["Closer"]);
  assert.deepEqual(lay!.colunas[1]!.stack.map((s) => s.nome), ["Petições"]);
  assert.deepEqual(lay!.fora, ["Extra"]);
  assert.equal(lay!.cobra[0]!.label, "cobra prazos de todos");
  assert.equal(lay!.cobra[0]!.to, null);
});

test("sem org, ou só lixo no disco, o layout some e o sane devolve null", () => {
  assert.equal(OrgChart.layout(null, ["A"]), null);
  assert.equal(OrgChart.layout({ owner: null, nodes: [], cobra: [] }, []), null);
  assert.equal(OrgChart.sane(null), null);
  assert.equal(OrgChart.sane({ owner: null, nodes: [], cobra: [] }), null);
  assert.equal(OrgChart.sane({ owner: { name: "Dono", role: "x" }, nodes: arvore.nodes, cobra: arvore.cobra })?.owner?.name, "Dono");
  assert.equal(OrgChart.sane({ nodes: [{ bot: "A", role: "", reports_to: "A" }], cobra: [] }), null);
});

test("ciclo não trava e os dois bots aparecem", () => {
  const lay = OrgChart.layout(
    {
      owner: null,
      nodes: [
        { bot: "A", role: "", reports_to: "B" },
        { bot: "B", role: "", reports_to: "A" },
      ],
      cobra: [],
    },
    ["A", "B"],
  );
  assert.ok(lay);
  const nomes = [lay!.ceo?.nome, ...lay!.colunas.flatMap((c) => [c.head.nome, ...c.stack.map((s) => s.nome)])].filter(Boolean);
  assert.deepEqual(nomes.sort(), ["A", "B"]);
});
