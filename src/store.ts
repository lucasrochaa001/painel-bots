// Estado do painel: arquivo JSON em DATA_DIR (volume do Railway) com escrita atômica,
// ou só memória quando DATA_DIR não está definido/gravável.
import { promises as fs } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { BrandMark, type Brand } from "./brand.js";
import { OrgChart, type OrgState } from "./orgchart.js";
import type { Msg, Status } from "./validate.js";

export interface BotState {
  status?: Status;
  step?: string;
  status_at?: string;
  routines?: { name: string; schedule: string; next_run: string | null }[];
  routines_at?: string;
  look?: { shape: string; color: string; accessory: string };
  team?: string;
  chat?: string;
  /** Últimos passos (mais novo primeiro), guardados pelo servidor. */
  recent?: StepEntry[];
}

export interface StepEntry {
  at: string;
  status: Status;
  step: string;
}

export const RECENT_MAX = 10;
export const RESOLVED_STEP = "Resolvido pelo Lucas no painel";
export const FEED_MAX = 50;
/** Passagens de tarefa guardadas (as mais novas) e por quanto tempo. */
export const HANDOFF_MAX = 20;
export const HANDOFF_TTL_MS = 10 * 60 * 1000;

/** Um bot passou uma tarefa a outro (o painel anima o boneco indo até a mesa). */
export interface Handoff {
  id: string;
  at: string;
  from: string;
  to: string;
  task: string;
}

export interface State {
  version: 1;
  bots: Record<string, BotState>;
  roster: string[] | null;
  usage: { total_used_pct: number; resets_at: string; bots: Record<string, number>; at: string } | null;
  updated_at: string | null;
  /** Ordem dos andares (times). Opcional, vem de groups.floors. */
  floors: string[] | null;
  /** Atividade global (mais novo primeiro). */
  feed: (StepEntry & { bot: string })[];
  /** Bots com foto enviada: nome → data do envio. */
  avatars: Record<string, string>;
  /**
   * Passagens de tarefa recentes (mais nova primeiro), no máximo HANDOFF_MAX,
   * cada uma vale HANDOFF_TTL_MS. Só em memória: não vai para o arquivo.
   */
  handoffs: Handoff[];
  /** Marca do painel (nome, subtítulo, monograma). null = emblema genérico. */
  brand: Brand | null;
  /** Hierarquia do organograma. null = o painel agrupa por andar. */
  org: OrgState | null;
}

export function emptyState(): State {
  return {
    version: 1,
    bots: Object.create(null),
    roster: null,
    usage: null,
    updated_at: null,
    floors: null,
    feed: [],
    avatars: Object.create(null),
    handoffs: [],
    brand: null,
    org: null,
  };
}

export const AVATAR_MAX = 512 * 1024;

function avatarFile(bot: string): string {
  return createHash("sha256").update(bot, "utf8").digest("hex") + ".png";
}

export class Store {
  state: State = emptyState();
  private file: string | null = null;
  private avatarDir: string | null = null;
  private avatarMem = new Map<string, Buffer>();
  private chain: Promise<void> = Promise.resolve();
  mode: "arquivo" | "memória" = "memória";

  static async open(dataDir: string | undefined): Promise<Store> {
    const s = new Store();
    if (!dataDir) return s;
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const file = path.join(dataDir, "state.json");
      // testa se dá pra gravar
      const probe = path.join(dataDir, `.probe-${process.pid}`);
      await fs.writeFile(probe, "");
      await fs.rm(probe);
      s.file = file;
      s.mode = "arquivo";
      s.avatarDir = path.join(dataDir, "avatars");
      await fs.mkdir(s.avatarDir, { recursive: true });
      try {
        const raw = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(raw) as State;
        if (parsed && parsed.version === 1 && typeof parsed.bots === "object") {
          const base = emptyState();
          s.state = {
            ...base,
            ...parsed,
            bots: Object.assign(Object.create(null), parsed.bots),
            feed: Array.isArray(parsed.feed) ? parsed.feed : [],
            floors: Array.isArray(parsed.floors) ? parsed.floors : null,
            avatars: Object.assign(Object.create(null), parsed.avatars ?? {}),
            handoffs: [],
            brand: BrandMark.sane(parsed.brand),
            org: OrgChart.sane(parsed.org),
          };
        } else throw new Error("formato");
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
          await fs.rename(file, `${file}.corrompido-${Date.now()}`).catch(() => {});
          console.warn("estado salvo ilegível; iniciando vazio (arquivo antigo renomeado)");
        }
      }
    } catch {
      console.warn("DATA_DIR não gravável; usando só memória");
      s.file = null;
      s.avatarDir = null;
      s.mode = "memória";
    }
    return s;
  }

  private bot(name: string): BotState {
    let b = this.state.bots[name];
    if (!b) {
      b = {};
      this.state.bots[name] = b;
    }
    return b;
  }

  apply(m: Msg, now = new Date()): void {
    const at = now.toISOString();
    switch (m.type) {
      case "status": {
        const b = this.bot(m.bot);
        const last = b.recent?.[0];
        b.status = m.status;
        b.step = m.step;
        b.status_at = at;
        const entry: StepEntry = { at, status: m.status, step: m.step };
        if (last && last.status === m.status && last.step === m.step) {
          last.at = at; // mesmo passo repetido: só atualiza a hora
        } else {
          b.recent = [entry, ...(b.recent ?? [])].slice(0, RECENT_MAX);
          this.state.feed = [{ bot: m.bot, ...entry }, ...this.state.feed].slice(0, FEED_MAX);
        }
        break;
      }
      case "routines": {
        const b = this.bot(m.bot);
        b.routines = m.items;
        b.routines_at = at;
        break;
      }
      case "roster":
        this.state.roster = m.names;
        break;
      case "looks":
        for (const [n, look] of Object.entries(m.bots)) this.bot(n).look = look;
        break;
      case "groups":
        for (const [n, team] of Object.entries(m.bots)) this.bot(n).team = team;
        if (m.floors) this.state.floors = m.floors;
        break;
      case "chat":
        for (const [n, link] of Object.entries(m.bots)) this.bot(n).chat = link;
        break;
      case "usage":
        this.state.usage = { total_used_pct: m.total_used_pct, resets_at: m.resets_at, bots: m.bots, at };
        break;
      case "handoff": {
        const h: Handoff = { id: randomUUID(), at, from: m.from, to: m.to, task: m.task };
        this.state.handoffs = [h, ...this.state.handoffs].slice(0, HANDOFF_MAX);
        this.pruneHandoffs(now);
        break;
      }
      case "brand":
        this.state.brand = { name: m.name, subtitle: m.subtitle, mark: m.mark };
        break;
      case "org":
        this.state.org = !m.owner && m.nodes.length === 0 ? null : { owner: m.owner, nodes: m.nodes, cobra: m.cobra };
        break;
    }
    this.state.updated_at = at;
  }

  /** Tira as passagens com mais de HANDOFF_TTL_MS. */
  pruneHandoffs(now = new Date()): void {
    const min = now.getTime() - HANDOFF_TTL_MS;
    this.state.handoffs = this.state.handoffs.filter((h) => Date.parse(h.at) >= min);
  }

  /**
   * Botão "Resolvido" do painel: tira o bot de waiting_user e põe em idle,
   * registrando o passo em recent e na Atividade (mesmo caminho do /ingest).
   */
  resolve(name: string, now = new Date()): "ok" | "desconhecido" | "nao_esperando" {
    const b = this.state.bots[name];
    if (!b) return "desconhecido";
    if (b.status !== "waiting_user") return "nao_esperando";
    this.apply({ type: "status", bot: name, status: "idle", step: RESOLVED_STEP, step_truncated: false }, now);
    return "ok";
  }

  async putAvatar(bot: string, png: Buffer, now = new Date()): Promise<void> {
    if (this.avatarDir) {
      const file = path.join(this.avatarDir, avatarFile(bot));
      const tmp = `${file}.tmp-${process.pid}`;
      await fs.writeFile(tmp, png, { mode: 0o600 });
      await fs.rename(tmp, file);
    } else {
      this.avatarMem.set(bot, png);
    }
    this.state.avatars[bot] = now.toISOString();
    this.state.updated_at = now.toISOString();
    await this.persist();
  }

  async getAvatar(bot: string): Promise<Buffer | null> {
    if (!this.state.avatars[bot]) return null;
    if (!this.avatarDir) return this.avatarMem.get(bot) ?? null;
    try {
      return await fs.readFile(path.join(this.avatarDir, avatarFile(bot)));
    } catch {
      return null;
    }
  }

  /** Grava de forma atômica (tmp + fsync + rename), serializando as escritas. */
  persist(): Promise<void> {
    const file = this.file;
    if (!file) return Promise.resolve();
    // Passagens de tarefa são efêmeras (expiram em minutos): não vão para o arquivo.
    const data = JSON.stringify({ ...this.state, handoffs: [] });
    const next = this.chain.then(async () => {
      const tmp = `${file}.tmp-${process.pid}`;
      const fh = await fs.open(tmp, "w", 0o600);
      try {
        await fh.writeFile(data, "utf8");
        await fh.sync();
      } finally {
        await fh.close();
      }
      await fs.rename(tmp, file);
    });
    this.chain = next.catch(() => {});
    return next;
  }
}
