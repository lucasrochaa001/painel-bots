// Organograma vindo do ingest (type "org"): quem reporta a quem, cargo e linhas tracejadas
// de "cobra prazos". Sem esses dados o painel agrupa por andar. A função layout é
// autocontida (vai embutida no JS do painel) e não entra em ciclo.

export interface OrgPerson {
  name: string;
  role: string;
}

export interface OrgNode {
  bot: string;
  role: string;
  reports_to: string | null;
}

export interface OrgCobra {
  from: string;
  label: string;
  to: string | null;
}

export interface OrgState {
  owner: OrgPerson | null;
  nodes: OrgNode[];
  cobra: OrgCobra[];
}

export interface OrgCard {
  nome: string;
  role: string;
  humano: boolean;
}

export interface OrgColuna {
  head: OrgCard;
  stack: OrgCard[];
}

export interface OrgLayout {
  owner: OrgCard | null;
  ceo: OrgCard | null;
  colunas: OrgColuna[];
  cobra: OrgCobra[];
  fora: string[];
}

export class OrgChart {
  /** Árvore para desenhar. `null` = sem hierarquia (o painel agrupa por andar). */
  static layout(org: OrgState | null | undefined, roster: string[]): OrgLayout | null {
    if (!org) return null;
    var nodes = org.nodes || [];
    var owner = org.owner && org.owner.name ? org.owner : null;
    if (!owner && !nodes.length) return null;
    var byName: Record<string, OrgNode> = {};
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n && n.bot && !byName[n.bot]) byName[n.bot] = n;
    }
    var ownerName = owner ? owner.name : "";
    var kids: Record<string, OrgNode[]> = {};
    function add(p: string, node: OrgNode) {
      if (!kids[p]) kids[p] = [];
      kids[p].push(node);
    }
    var names = Object.keys(byName);
    for (var j = 0; j < names.length; j++) {
      var key = names[j] || "";
      var node = byName[key];
      if (!node) continue;
      var p = node.reports_to || "";
      if (p === node.bot) p = "";
      if (p && p !== ownerName && !byName[p]) p = "";
      if (!p && ownerName) p = ownerName;
      add(p || "\0", node);
    }
    function byBot(a: OrgNode, b: OrgNode) {
      return a.bot.localeCompare(b.bot, "pt-BR");
    }
    function cardOf(node: OrgNode): OrgCard {
      return { nome: node.bot, role: node.role || "", humano: false };
    }
    var placed: Record<string, number> = {};
    if (ownerName && !byName[ownerName]) placed[ownerName] = 1;
    function take(parent: string): OrgNode[] {
      var list = (kids[parent] || []).slice().sort(byBot);
      var out: OrgNode[] = [];
      for (var k = 0; k < list.length; k++) {
        var item = list[k];
        if (!item || placed[item.bot]) continue;
        placed[item.bot] = 1;
        out.push(item);
      }
      return out;
    }
    function desc(nome: string): OrgCard[] {
      var out: OrgCard[] = [];
      var list = take(nome);
      for (var k = 0; k < list.length; k++) {
        var item = list[k];
        if (!item) continue;
        out.push(cardOf(item));
        var sub = desc(item.bot);
        for (var s = 0; s < sub.length; s++) {
          var card = sub[s];
          if (card) out.push(card);
        }
      }
      return out;
    }
    var topKids = take(ownerName || "\0");
    var unico = topKids.length === 1 ? topKids[0] : null;
    var ceo: OrgCard | null = null;
    var colSrc: OrgNode[] = topKids;
    if (unico && (kids[unico.bot] || []).length) {
      ceo = cardOf(unico);
      colSrc = take(unico.bot);
    }
    var colunas: OrgColuna[] = [];
    for (var c = 0; c < colSrc.length; c++) {
      var head = colSrc[c];
      if (!head) continue;
      colunas.push({ head: cardOf(head), stack: desc(head.bot) });
    }
    var left = names.slice().sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    });
    for (var L = 0; L < left.length; L++) {
      var nome = left[L] || "";
      if (!nome || placed[nome]) continue;
      placed[nome] = 1;
      var ln = byName[nome];
      if (!ln) continue;
      colunas.push({ head: cardOf(ln), stack: desc(ln.bot) });
    }
    var fora: string[] = [];
    var ros = roster || [];
    for (var r = 0; r < ros.length; r++) {
      var rn = ros[r] || "";
      if (rn && !placed[rn]) fora.push(rn);
    }
    var cobra: OrgCobra[] = [];
    var cs = org.cobra || [];
    for (var q = 0; q < cs.length; q++) {
      var cb = cs[q];
      if (!cb) continue;
      cobra.push({ from: cb.from, label: cb.label, to: cb.to || null });
    }
    return {
      owner: owner ? { nome: owner.name, role: owner.role || "", humano: true } : null,
      ceo: ceo,
      colunas: colunas,
      cobra: cobra,
      fora: fora,
    };
  }

  /** Estado salvo no disco. Formato estranho vira null e o painel agrupa por andar. */
  static sane(v: unknown): OrgState | null {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const o = v as Record<string, unknown>;
    let owner: OrgPerson | null = null;
    if (o.owner != null) {
      if (typeof o.owner !== "object" || Array.isArray(o.owner)) return null;
      const ow = o.owner as Record<string, unknown>;
      if (typeof ow.name !== "string" || !ow.name.trim() || ow.name.length > 60) return null;
      if (typeof ow.role !== "string" || ow.role.length > 80) return null;
      owner = { name: ow.name, role: ow.role };
    }
    if (!Array.isArray(o.nodes) || !Array.isArray(o.cobra)) return null;
    if (o.nodes.length > 200 || o.cobra.length > 40) return null;
    const seen = new Set<string>();
    const nodes: OrgNode[] = [];
    for (const item of o.nodes) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const n = item as Record<string, unknown>;
      if (typeof n.bot !== "string" || !n.bot.trim() || n.bot.length > 60) return null;
      if (seen.has(n.bot)) return null;
      seen.add(n.bot);
      if (typeof n.role !== "string" || n.role.length > 80) return null;
      if (n.reports_to != null && (typeof n.reports_to !== "string" || n.reports_to.length > 60)) return null;
      const reports = n.reports_to == null || n.reports_to === "" ? null : n.reports_to;
      if (reports === n.bot) return null;
      nodes.push({ bot: n.bot, role: n.role, reports_to: reports });
    }
    const cobra: OrgCobra[] = [];
    for (const item of o.cobra) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const c = item as Record<string, unknown>;
      if (typeof c.from !== "string" || !c.from.trim() || c.from.length > 60) return null;
      if (typeof c.label !== "string" || !c.label.trim() || c.label.length > 80) return null;
      if (c.to != null && (typeof c.to !== "string" || !c.to.trim() || c.to.length > 60)) return null;
      const to = c.to == null || c.to === "" ? null : c.to;
      if (to === c.from) return null;
      cobra.push({ from: c.from, label: c.label, to });
    }
    if (!owner && nodes.length === 0) return null;
    return { owner, nodes, cobra };
  }
}
