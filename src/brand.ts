// Marca do painel (nome, subtítulo, monograma do emblema). Opcional no ingest.
// Sem marca gravada, o painel usa um emblema neutro — nada de cliente fixo no HTML.

export interface Brand {
  name: string;
  subtitle: string;
  /** Até 4 letras/números do emblema. Vazio = o painel deriva as iniciais do nome. */
  mark: string;
}

export class BrandMark {
  /** O que o painel mostra. `null` = marca genérica. Autocontida: vai embutida no JS do painel. */
  static resolve(brand: { name?: string; subtitle?: string; mark?: string } | null | undefined): { name: string; subtitle: string; mark: string } {
    if (!brand || !brand.name) return { name: "Painel", subtitle: "Status dos bots", mark: "pb" };
    var nome = String(brand.name);
    var sub = brand.subtitle ? String(brand.subtitle) : "";
    var mark = brand.mark ? String(brand.mark).toLowerCase() : "";
    if (!/^[a-z0-9]{1,4}$/.test(mark)) {
      var parts = nome.split(/\s+/);
      var ini = "";
      for (var i = 0; i < parts.length && ini.length < 3; i++) {
        var piece = parts[i] || "";
        var base = piece.normalize ? piece.normalize("NFD") : piece;
        base = base.replace(/[\u0300-\u036f]/g, "");
        var ch = base.replace(/[^A-Za-z0-9]/g, "").charAt(0);
        if (ch) ini += ch.toLowerCase();
      }
      mark = ini || "pb";
    }
    return { name: nome, subtitle: sub, mark: mark };
  }

  /** Estado salvo no disco: formato estranho vira null (o painel cai no genérico). */
  static sane(v: unknown): Brand | null {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.name !== "string" || !o.name.trim() || o.name.length > 60) return null;
    if (typeof o.subtitle !== "string" || o.subtitle.length > 80) return null;
    if (typeof o.mark !== "string" || o.mark.length > 4) return null;
    if (o.mark && !/^[a-z0-9]{1,4}$/.test(o.mark)) return null;
    return { name: o.name, subtitle: o.subtitle, mark: o.mark };
  }
}
