// Validação estrita das mensagens recebidas em POST /ingest.
// Nenhuma função aqui loga dados: os erros descrevem o campo, nunca o valor.

export const STATUSES = ["working", "idle", "waiting_user", "error", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STEP_MAX = 80;
export const NAME_MAX = 60;
export const MAX_BOTS_PER_MSG = 200;
export const MAX_ROUTINES = 50;
export const CHAT_PREFIX = "grokbot://app/v1/agent?id=";
const CHAT_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SHAPE_RE = /^[a-z][a-z0-9_-]{0,19}$/;
/** Cores nomeadas do app Grok Bot (além de hex). */
export const NAMED_COLORS = ["violet", "blue", "cyan", "green", "orange", "red", "black", "gray"] as const;
export const MAX_FLOORS = 50;
export const MAX_COBRA = 40;
export const ROLE_MAX = 80;
export const SUBTITLE_MAX = 80;
export const MARK_MAX = 4;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

export type Msg =
  | { type: "status"; bot: string; status: Status; step: string; step_truncated: boolean }
  | { type: "routines"; bot: string; items: { name: string; schedule: string; next_run: string | null }[] }
  | { type: "roster"; names: string[] }
  | { type: "looks"; bots: Record<string, { shape: string; color: string; accessory: string }> }
  | { type: "groups"; bots: Record<string, string>; floors?: string[] }
  | { type: "chat"; bots: Record<string, string> }
  | { type: "usage"; total_used_pct: number; resets_at: string; bots: Record<string, number> }
  | { type: "handoff"; from: string; to: string; task: string; task_truncated: boolean }
  | { type: "brand"; name: string; subtitle: string; mark: string }
  | {
      type: "org";
      owner: { name: string; role: string } | null;
      nodes: { bot: string; role: string; reports_to: string | null }[];
      cobra: { from: string; label: string; to: string | null }[];
    };

export class ValidationError extends Error {}

function fail(msg: string): never {
  throw new ValidationError(msg);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function onlyKeys(o: Record<string, unknown>, allowed: string[], where: string): void {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) fail(`${where}: campo desconhecido "${k.slice(0, 40)}"`);
  }
}

function str(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== "string") fail(`${field}: deve ser texto`);
  const s = v.trim();
  if (s.length < min) fail(`${field}: obrigatório`);
  if (s.length > max) fail(`${field}: máximo de ${max} caracteres`);
  if (CONTROL_RE.test(s)) fail(`${field}: caracteres de controle não são permitidos`);
  return s;
}

export function botName(v: unknown, field: string): string {
  return str(v, field, 1, NAME_MAX);
}

function isoDate(v: unknown, field: string): string {
  const s = str(v, field, 1, 40);
  const t = Date.parse(s);
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}T/.test(s)) fail(`${field}: data ISO 8601 inválida (ex.: 2026-11-02T09:00:00-03:00)`);
  return new Date(t).toISOString();
}

function pct(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${field}: deve ser número`);
  if (v < 0 || v > 100) fail(`${field}: deve estar entre 0 e 100`);
  return Math.round(v * 100) / 100;
}

function botMap<T>(v: unknown, field: string, each: (val: unknown, f: string) => T): Record<string, T> {
  if (!isObj(v)) fail(`${field}: deve ser objeto {nome: valor}`);
  const keys = Object.keys(v);
  if (keys.length === 0) fail(`${field}: vazio`);
  if (keys.length > MAX_BOTS_PER_MSG) fail(`${field}: máximo de ${MAX_BOTS_PER_MSG} bots`);
  const out: Record<string, T> = Object.create(null);
  for (const k of keys) {
    const name = botName(k, `${field} (nome do bot)`);
    out[name] = each(v[k], `${field}.${name}`);
  }
  return out;
}

/** Texto curto de uma linha: tira controles e corta em STEP_MAX caracteres (com "…"). */
function shortText(v: unknown, field: string): { text: string; truncated: boolean } {
  if (v === undefined) return { text: "", truncated: false };
  if (typeof v !== "string") fail(`${field}: deve ser texto`);
  let text = v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  const chars = Array.from(text);
  if (chars.length <= STEP_MAX) return { text, truncated: false };
  text = chars.slice(0, STEP_MAX - 1).join("") + "…";
  return { text, truncated: true };
}

export function parseMessage(raw: unknown): Msg {
  if (!isObj(raw)) fail("corpo deve ser um objeto JSON");
  const type = raw.type;
  switch (type) {
    case "status": {
      onlyKeys(raw, ["type", "bot", "status", "step"], "status");
      const bot = botName(raw.bot, "bot");
      if (typeof raw.status !== "string" || !(STATUSES as readonly string[]).includes(raw.status))
        fail(`status: use um de ${STATUSES.join("|")}`);
      const { text: step, truncated } = shortText(raw.step, "step");
      return { type, bot, status: raw.status as Status, step, step_truncated: truncated };
    }
    case "routines": {
      onlyKeys(raw, ["type", "bot", "items"], "routines");
      const bot = botName(raw.bot, "bot");
      if (!Array.isArray(raw.items)) fail("items: deve ser lista");
      if (raw.items.length > MAX_ROUTINES) fail(`items: máximo de ${MAX_ROUTINES}`);
      const items = raw.items.map((it, i) => {
        if (!isObj(it)) fail(`items[${i}]: deve ser objeto`);
        onlyKeys(it, ["name", "schedule", "next_run"], `items[${i}]`);
        return {
          name: str(it.name, `items[${i}].name`, 1, 100),
          schedule: str(it.schedule, `items[${i}].schedule`, 1, 100),
          next_run: it.next_run === null || it.next_run === undefined ? null : isoDate(it.next_run, `items[${i}].next_run`),
        };
      });
      return { type, bot, items };
    }
    case "roster": {
      onlyKeys(raw, ["type", "names"], "roster");
      if (!Array.isArray(raw.names)) fail("names: deve ser lista");
      if (raw.names.length > MAX_BOTS_PER_MSG) fail(`names: máximo de ${MAX_BOTS_PER_MSG}`);
      const names = [...new Set(raw.names.map((n, i) => botName(n, `names[${i}]`)))];
      return { type, names };
    }
    case "looks": {
      onlyKeys(raw, ["type", "bots"], "looks");
      const bots = botMap(raw.bots, "bots", (v, f) => {
        if (!isObj(v)) fail(`${f}: deve ser objeto {shape, color, accessory}`);
        onlyKeys(v, ["shape", "color", "accessory"], f);
        const shape = str(v.shape, `${f}.shape`, 1, 20).toLowerCase();
        if (!SHAPE_RE.test(shape)) fail(`${f}.shape: use letras minúsculas, números, - ou _`);
        const color = str(v.color, `${f}.color`, 3, 7).toLowerCase();
        const named = (NAMED_COLORS as readonly string[]).includes(color === "grey" ? "gray" : color);
        if (!HEX_RE.test(color) && !named)
          fail(`${f}.color: use hex (ex.: #3366ff) ou um nome: ${NAMED_COLORS.join("|")}`);
        const accessory = v.accessory === undefined ? "" : str(v.accessory, `${f}.accessory`, 0, 40);
        return { shape, color: color === "grey" ? "gray" : color, accessory };
      });
      return { type, bots };
    }
    case "groups": {
      onlyKeys(raw, ["type", "bots", "floors"], "groups");
      const bots = botMap(raw.bots, "bots", (v, f) => str(v, f, 1, NAME_MAX));
      if (raw.floors === undefined) return { type, bots };
      if (!Array.isArray(raw.floors)) fail("floors: deve ser lista de nomes de time");
      if (raw.floors.length > MAX_FLOORS) fail(`floors: máximo de ${MAX_FLOORS}`);
      const floors = [...new Set(raw.floors.map((t, i) => str(t, `floors[${i}]`, 1, NAME_MAX)))];
      return { type, bots, floors };
    }
    case "chat": {
      onlyKeys(raw, ["type", "bots"], "chat");
      const bots = botMap(raw.bots, "bots", (v, f) => {
        const link = str(v, f, 1, 200);
        if (!link.startsWith(CHAT_PREFIX)) fail(`${f}: link deve começar com ${CHAT_PREFIX}`);
        if (!CHAT_ID_RE.test(link.slice(CHAT_PREFIX.length))) fail(`${f}: id inválido no link`);
        return link;
      });
      return { type, bots };
    }
    case "usage": {
      onlyKeys(raw, ["type", "total_used_pct", "resets_at", "bots"], "usage");
      const total = pct(raw.total_used_pct, "total_used_pct");
      const resets_at = isoDate(raw.resets_at, "resets_at");
      const bots = raw.bots === undefined || (isObj(raw.bots) && Object.keys(raw.bots).length === 0) ? {} : botMap(raw.bots, "bots", (v, f) => pct(v, f));
      return { type, total_used_pct: total, resets_at, bots };
    }
    case "handoff": {
      onlyKeys(raw, ["type", "from", "to", "task"], "handoff");
      const from = botName(raw.from, "from");
      const to = botName(raw.to, "to");
      if (from === to) fail("to: deve ser outro bot (from e to iguais)");
      const { text: task, truncated } = shortText(raw.task, "task");
      return { type, from, to, task, task_truncated: truncated };
    }
    case "brand": {
      onlyKeys(raw, ["type", "name", "subtitle", "mark"], "brand");
      const name = str(raw.name, "name", 1, NAME_MAX);
      const subtitle = raw.subtitle === undefined ? "" : str(raw.subtitle, "subtitle", 0, SUBTITLE_MAX);
      const mark = raw.mark === undefined || raw.mark === "" ? "" : str(raw.mark, "mark", 1, MARK_MAX).toLowerCase();
      if (mark && !/^[a-z0-9]{1,4}$/.test(mark)) fail("mark: até 4 letras ou números");
      return { type, name, subtitle, mark };
    }
    case "org": {
      onlyKeys(raw, ["type", "owner", "nodes", "cobra"], "org");
      let owner: { name: string; role: string } | null = null;
      if (raw.owner !== undefined && raw.owner !== null) {
        if (!isObj(raw.owner)) fail("owner: deve ser objeto {name, role}");
        onlyKeys(raw.owner, ["name", "role"], "owner");
        owner = {
          name: str(raw.owner.name, "owner.name", 1, NAME_MAX),
          role: raw.owner.role === undefined ? "" : str(raw.owner.role, "owner.role", 0, ROLE_MAX),
        };
      }
      if (!Array.isArray(raw.nodes)) fail("nodes: deve ser lista");
      if (raw.nodes.length > MAX_BOTS_PER_MSG) fail(`nodes: máximo de ${MAX_BOTS_PER_MSG}`);
      const seen = new Set<string>();
      const nodes = raw.nodes.map((it, i) => {
        if (!isObj(it)) fail(`nodes[${i}]: deve ser objeto`);
        onlyKeys(it, ["bot", "role", "reports_to"], `nodes[${i}]`);
        const bot = botName(it.bot, `nodes[${i}].bot`);
        if (seen.has(bot)) fail(`nodes[${i}].bot: repetido`);
        seen.add(bot);
        const role = it.role === undefined ? "" : str(it.role, `nodes[${i}].role`, 0, ROLE_MAX);
        const reports_to =
          it.reports_to === undefined || it.reports_to === null || it.reports_to === ""
            ? null
            : botName(it.reports_to, `nodes[${i}].reports_to`);
        if (reports_to === bot) fail(`nodes[${i}].reports_to: não pode ser o próprio bot`);
        return { bot, role, reports_to };
      });
      const cobraRaw = raw.cobra === undefined ? [] : raw.cobra;
      if (!Array.isArray(cobraRaw)) fail("cobra: deve ser lista");
      if (cobraRaw.length > MAX_COBRA) fail(`cobra: máximo de ${MAX_COBRA}`);
      const cobra = cobraRaw.map((it, i) => {
        if (!isObj(it)) fail(`cobra[${i}]: deve ser objeto`);
        onlyKeys(it, ["from", "label", "to"], `cobra[${i}]`);
        const from = botName(it.from, `cobra[${i}].from`);
        const label = str(it.label, `cobra[${i}].label`, 1, ROLE_MAX);
        const to = it.to === undefined || it.to === null || it.to === "" ? null : botName(it.to, `cobra[${i}].to`);
        if (to === from) fail(`cobra[${i}].to: não pode ser o próprio bot`);
        return { from, label, to };
      });
      return { type, owner, nodes, cobra };
    }
    default:
      fail("type: use status|routines|roster|looks|groups|chat|usage|handoff|brand|org");
  }
}
