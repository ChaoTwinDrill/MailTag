import type { Book, ModoApp } from "../components/types/book";
import type { Media } from "../components/types/media";
import type { tags } from "../components/types/tag";
import { formatarDuracao } from "./duracao";

const DIA = 24 * 60 * 60 * 1000;

export type Cmp = ">" | "<" | "=" | ">=" | "<=";
export type CampoNum =
  | "tamanho"
  | "largura"
  | "altura"
  | "lado"
  | "duracao"
  | "paginas"
  | "tags";
export type CampoOrdem = "nome" | "tamanho" | "data" | "modificado" | "paginas";

export type Quando =
  | { tipo: "hoje" }
  | { tipo: "ontem" }
  | { tipo: "dias"; n: number }
  | { tipo: "dia"; ymd: string }
  | { tipo: "depois" | "desde" | "antes" | "ate"; ymd: string };

export type Termo = { id: string; negar: boolean } & (
  | { op: "tipo"; valor: "imagem" | "video" }
  | { op: "ext"; valor: string }
  | { op: "orientacao"; valor: "horizontal" | "vertical" | "quadrada" }
  | { op: "num"; campo: CampoNum; cmp: Cmp; valor: number }
  | { op: "data"; campo: "criado" | "modificado"; quando: Quando }
  | { op: "sem"; valor: "tags" | "sequencia" }
  | { op: "tem"; valor: "anterior" | "continuacao" }
  | { op: "fila" }
  | { op: "ou"; tagIds: string[] }
  | { op: "nome"; texto: string }
  | { op: "prefixo"; texto: string }
  | { op: "aleatorio"; n: number; semente: number }
  | { op: "ordem"; campo: CampoOrdem; desc: boolean }
);

type SemId<T> = T extends unknown ? Omit<T, "id"> : never;
export type NovoTermo = SemId<Termo>;

export type Interpretacao =
  | { tipo: "vazio" }
  | { tipo: "tag"; tag: tags; negar: boolean }
  | { tipo: "termo"; termo: NovoTermo }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "texto"; texto: string; negar: boolean };

export interface ItemBusca {
  id: string;
  nome: string;
  tagIds: string[];
  mime: string | null;
  ext: string;
  tamanho: number | null;
  largura: number | null;
  altura: number | null;
  duracao: number | null;
  paginas: number | null;
  criado: Date | null;
  modificado: Date | null;
  anteriorId: string | null;
}

export interface ContextoBusca {
  modo: ModoApp;
  tags: Map<string, tags>;
  filhas: Map<string, Set<string>>;
  continuacoes: Set<string>;
  fila: Set<string>;
}

export interface DefOperador {
  nome: string;
  descricao: string;
  exemplo: string;
  inserir: string;
  modos: ModoApp[];
  valores?: string[];
}

export interface SugestaoOperador {
  inserir: string;
  rotulo: string;
  descricao: string;
}

const AMBOS: ModoApp[] = ["imagens", "livros"];
const EXTENSOES = ["png", "jpg", "jpeg", "gif", "webp", "avif", "mp4", "webm", "mov", "mkv"];
const DATAS = ["hoje", "ontem", "7d", "30d", "365d"];

export const OPERADORES: DefOperador[] = [
  { nome: "tipo", descricao: "Imagem ou vídeo", exemplo: "tipo:video", inserir: "tipo:", modos: ["imagens"], valores: ["imagem", "video"] },
  { nome: "ext", descricao: "Extensão do arquivo", exemplo: "ext:png", inserir: "ext:", modos: ["imagens"], valores: EXTENSOES },
  { nome: "orientacao", descricao: "Horizontal, vertical ou quadrada", exemplo: "orientacao:vertical", inserir: "orientacao:", modos: ["imagens"], valores: ["horizontal", "vertical", "quadrada"] },
  { nome: "tamanho", descricao: "Tamanho do arquivo (kb, mb, gb)", exemplo: "tamanho>5mb", inserir: "tamanho>", modos: ["imagens"] },
  { nome: "largura", descricao: "Largura em pixels", exemplo: "largura>1920", inserir: "largura>", modos: ["imagens"] },
  { nome: "altura", descricao: "Altura em pixels", exemplo: "altura>1080", inserir: "altura>", modos: ["imagens"] },
  { nome: "res", descricao: "Resolução mínima", exemplo: "res:4k", inserir: "res:", modos: ["imagens"], valores: ["4k", "1440p", "1080p", "720p", "480p"] },
  { nome: "duracao", descricao: "Duração do vídeo (s, m, h)", exemplo: "duracao>2m", inserir: "duracao>", modos: ["imagens"] },
  { nome: "paginas", descricao: "Quantidade de páginas", exemplo: "paginas>20", inserir: "paginas>", modos: ["livros"] },
  { nome: "tags", descricao: "Quantidade de tags", exemplo: "tags=0", inserir: "tags=", modos: AMBOS },
  { nome: "criado", descricao: "Data de criação", exemplo: "criado:7d", inserir: "criado:", modos: AMBOS, valores: DATAS },
  { nome: "modificado", descricao: "Data de modificação", exemplo: "modificado:hoje", inserir: "modificado:", modos: AMBOS, valores: DATAS },
  { nome: "sem", descricao: "Sem tags ou sem sequência", exemplo: "sem:tags", inserir: "sem:", modos: AMBOS, valores: ["tags", "sequencia"] },
  { nome: "tem", descricao: "Tem anterior ou continuação", exemplo: "tem:anterior", inserir: "tem:", modos: AMBOS, valores: ["anterior", "continuacao"] },
  { nome: "fila", descricao: "Está na fila de reprodução", exemplo: "fila:sim", inserir: "fila:", modos: ["livros"], valores: ["sim", "nao"] },
  { nome: "aleatorio", descricao: "Amostra aleatória", exemplo: "aleatorio:20", inserir: "aleatorio:", modos: AMBOS },
  { nome: "ordem", descricao: "Ordenação (- no fim = decrescente)", exemplo: "ordem:tamanho-", inserir: "ordem:", modos: AMBOS, valores: ["nome", "nome-", "tamanho", "tamanho-", "data", "data-", "modificado", "modificado-", "paginas", "paginas-"] },
];

const CAMPOS_NUM: Record<ModoApp, CampoNum[]> = {
  imagens: ["tamanho", "largura", "altura", "lado", "duracao", "tags"],
  livros: ["paginas", "tags"],
};

const tem = (objeto: object, chave: string) =>
  Object.prototype.hasOwnProperty.call(objeto, chave);

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function tiraAspas(texto: string): string {
  return texto.trim().replace(/^"/, "").replace(/"$/, "");
}

// Divide em "|" ignorando o que está entre aspas
export function dividirOu(texto: string): string[] {
  const partes: string[] = [];
  let atual = "";
  let dentro = false;

  for (const c of texto) {
    if (c === '"') dentro = !dentro;

    if (c === "|" && !dentro) {
      partes.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }

  partes.push(atual);

  return partes;
}

function acharTag(texto: string, todasTags: tags[]): tags | null {
  const nome = tiraAspas(texto).toLowerCase();

  return nome ? todasTags.find((t) => t.name.toLowerCase() === nome) ?? null : null;
}

function ymdValido(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
  );
}

function parseTamanho(v: string): number | null {
  const m = v.replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);

  if (!m) return null;

  const mult: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

  return Math.round(parseFloat(m[1]) * mult[m[2]]);
}

function parseDuracao(v: string): number | null {
  const m = v.replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(s|m|min|h)$/);

  if (!m) return null;

  const mult: Record<string, number> = { s: 1, m: 60, min: 60, h: 3600 };

  return parseFloat(m[1]) * mult[m[2]];
}

function parseInteiro(v: string): number | null {
  const m = v.replace(/px$/, "").match(/^\d+$/);

  return m ? Number(m[0]) : null;
}

export function ordemAplicavel(campo: CampoOrdem, modo: ModoApp) {
  return modo === "imagens" ? campo !== "paginas" : campo !== "tamanho";
}

export function aplicavel(t: NovoTermo, modo: ModoApp): boolean {
  switch (t.op) {
    case "tipo":
    case "ext":
    case "orientacao":
      return modo === "imagens";
    case "num":
      return CAMPOS_NUM[modo].includes(t.campo);
    case "fila":
      return modo === "livros";
    case "ordem":
      return ordemAplicavel(t.campo, modo);
    default:
      return true;
  }
}

/* ------------------------------ interpretação ------------------------------ */

function interpretarOperador(
  campoBruto: string,
  cmp: string,
  valorBruto: string,
  negar: boolean,
  modo: ModoApp
): Interpretacao {
  const campo = normalizar(campoBruto);
  const def = OPERADORES.find((o) => o.nome === campo);

  if (!def) return { tipo: "erro", mensagem: `Operador desconhecido: ${campoBruto}` };

  if (!def.modos.includes(modo)) {
    return {
      tipo: "erro",
      mensagem: `"${def.nome}" só vale no modo ${def.modos[0]}`,
    };
  }

  const valor = valorBruto.trim();

  if (!valor) {
    return { tipo: "erro", mensagem: `Falta o valor (ex.: ${def.exemplo})` };
  }

  const v = normalizar(valor);
  const invalido: Interpretacao = {
    tipo: "erro",
    mensagem: `Valor inválido (ex.: ${def.exemplo})`,
  };
  const termo = (t: NovoTermo): Interpretacao => ({ tipo: "termo", termo: t });
  const doisPontos = cmp === ":";

  switch (def.nome) {
    case "tipo": {
      if (!doisPontos) return invalido;
      if (["imagem", "imagens", "foto", "fotos"].includes(v)) {
        return termo({ op: "tipo", valor: "imagem", negar });
      }
      if (["video", "videos", "filme", "filmes"].includes(v)) {
        return termo({ op: "tipo", valor: "video", negar });
      }
      return invalido;
    }

    case "ext": {
      const ext = v.replace(/^\./, "");

      return doisPontos && /^[a-z0-9]+$/.test(ext)
        ? termo({ op: "ext", valor: ext, negar })
        : invalido;
    }

    case "orientacao": {
      if (!doisPontos) return invalido;

      const mapa: Record<string, "horizontal" | "vertical" | "quadrada"> = {
        horizontal: "horizontal",
        horiz: "horizontal",
        vertical: "vertical",
        vert: "vertical",
        quadrada: "quadrada",
        quad: "quadrada",
        quadrado: "quadrada",
      };

      return tem(mapa, v) ? termo({ op: "orientacao", valor: mapa[v], negar }) : invalido;
    }

    case "tamanho":
    case "duracao":
    case "largura":
    case "altura":
    case "paginas":
    case "tags": {
      const n =
        def.nome === "tamanho"
          ? parseTamanho(v)
          : def.nome === "duracao"
            ? parseDuracao(v)
            : parseInteiro(v);

      if (n === null) return invalido;

      return termo({
        op: "num",
        campo: def.nome as CampoNum,
        cmp: doisPontos ? "=" : (cmp as Cmp),
        valor: n,
        negar,
      });
    }

    case "res": {
      if (!doisPontos) return invalido;

      const mapa: Record<string, number> = {
        "4k": 3840,
        "2k": 2560,
        "1440p": 2560,
        "1080p": 1920,
        fullhd: 1920,
        fhd: 1920,
        "720p": 1280,
        hd: 1280,
        "480p": 854,
      };

      return tem(mapa, v)
        ? termo({ op: "num", campo: "lado", cmp: ">=", valor: mapa[v], negar })
        : invalido;
    }

    case "criado":
    case "modificado": {
      const campoData = def.nome as "criado" | "modificado";

      if (doisPontos || cmp === "=") {
        if (v === "hoje") return termo({ op: "data", campo: campoData, quando: { tipo: "hoje" }, negar });
        if (v === "ontem") return termo({ op: "data", campo: campoData, quando: { tipo: "ontem" }, negar });

        const dias = v.match(/^(\d+)d$/);

        if (dias) {
          return termo({ op: "data", campo: campoData, quando: { tipo: "dias", n: Number(dias[1]) }, negar });
        }

        if (ymdValido(v)) {
          return termo({ op: "data", campo: campoData, quando: { tipo: "dia", ymd: v }, negar });
        }

        return invalido;
      }

      if (!ymdValido(v)) {
        return { tipo: "erro", mensagem: "Use uma data AAAA-MM-DD (ex.: criado>2026-10-01)" };
      }

      const tipo = cmp === ">" ? "depois" : cmp === ">=" ? "desde" : cmp === "<" ? "antes" : "ate";

      return termo({ op: "data", campo: campoData, quando: { tipo, ymd: v }, negar });
    }

    case "sem": {
      if (!doisPontos) return invalido;
      if (v === "tags") return termo({ op: "sem", valor: "tags", negar });
      if (v === "sequencia") return termo({ op: "sem", valor: "sequencia", negar });
      return invalido;
    }

    case "tem": {
      if (!doisPontos) return invalido;
      if (v === "anterior") return termo({ op: "tem", valor: "anterior", negar });
      if (v === "continuacao") return termo({ op: "tem", valor: "continuacao", negar });
      return invalido;
    }

    case "fila": {
      if (!doisPontos) return invalido;
      if (v === "sim") return termo({ op: "fila", negar });
      if (v === "nao") return termo({ op: "fila", negar: !negar });
      return invalido;
    }

    case "aleatorio": {
      const n = parseInteiro(v);

      if (!doisPontos || n === null || n < 1 || n > 100000) return invalido;

      return termo({
        op: "aleatorio",
        n,
        semente: Math.floor(Math.random() * 2 ** 31),
        negar: false,
      });
    }

    case "ordem": {
      if (!doisPontos) return invalido;

      const mapa: Record<string, CampoOrdem> = {
        nome: "nome",
        tamanho: "tamanho",
        data: "data",
        criado: "data",
        modificado: "modificado",
        paginas: "paginas",
      };

      const nomeCampo = v.replace(/[-+]$/, "");

      if (!tem(mapa, nomeCampo)) return invalido;

      const campoOrdem = mapa[nomeCampo];

      if (!ordemAplicavel(campoOrdem, modo)) {
        return { tipo: "erro", mensagem: `Não dá para ordenar por ${nomeCampo} neste modo` };
      }

      return termo({ op: "ordem", campo: campoOrdem, desc: v.endsWith("-"), negar: false });
    }

    default:
      return invalido;
  }
}

export function interpretar(texto: string, todasTags: tags[], modo: ModoApp): Interpretacao {
  let t = texto.trim();

  if (!t) return { tipo: "vazio" };

  const negar = t.startsWith("-");

  if (negar) t = t.slice(1).trim();

  if (!t) return { tipo: "vazio" };

  // Aspas abertas: ainda está digitando
  if ((t.match(/"/g) ?? []).length % 2 === 1) return { tipo: "vazio" };

  const partes = dividirOu(t);

  if (partes.length > 1) {
    const ids: string[] = [];

    for (const parte of partes) {
      const tag = acharTag(parte, todasTags);

      if (!tag) {
        return {
          tipo: "erro",
          mensagem: tiraAspas(parte)
            ? `Tag não encontrada: ${tiraAspas(parte)}`
            : "Complete a lista (ex.: gato|cachorro)",
        };
      }

      ids.push(tag.id);
    }

    return { tipo: "termo", termo: { op: "ou", tagIds: ids, negar } };
  }

  const tag = acharTag(t, todasTags);

  if (tag) return { tipo: "tag", tag, negar };

  const m = t.match(/^([^\s:<>="]+)(>=|<=|:|>|<|=)(.*)$/);

  if (m) return interpretarOperador(m[1], m[2], m[3], negar, modo);

  if (t.length > 1 && t.endsWith("*") && !t.startsWith('"')) {
    return { tipo: "termo", termo: { op: "prefixo", texto: t.slice(0, -1), negar } };
  }

  return { tipo: "texto", texto: tiraAspas(t), negar };
}

/* -------------------------------- sugestões -------------------------------- */

export function sugerirOperadores(texto: string, modo: ModoApp): SugestaoOperador[] {
  let t = texto.trimStart();
  const negacao = t.startsWith("-") ? "-" : "";

  if (negacao) t = t.slice(1);

  if (!t || /\s/.test(t) || /["|*]/.test(t)) return [];

  const m = t.match(/^([^:<>=]+)(>=|<=|:|>|<|=)(.*)$/);

  if (!m) {
    const n = normalizar(t);

    return OPERADORES.filter((o) => o.modos.includes(modo) && o.nome.startsWith(n))
      .slice(0, 8)
      .map((o) => ({
        inserir: negacao + o.inserir,
        rotulo: o.inserir,
        descricao: o.descricao,
      }));
  }

  const def = OPERADORES.find((o) => o.nome === normalizar(m[1]));

  if (!def || !def.modos.includes(modo) || !def.valores || m[2] !== ":") return [];

  const digitado = normalizar(m[3]);

  return def.valores
    .filter((valor) => valor.startsWith(digitado) && valor !== digitado)
    .slice(0, 10)
    .map((valor) => ({
      inserir: `${negacao}${def.nome}:${valor}`,
      rotulo: `${def.nome}:${valor}`,
      descricao: def.descricao,
    }));
}

/* --------------------------------- rótulos --------------------------------- */

const CMP_ROTULO: Record<Cmp, string> = { ">": ">", "<": "<", "=": "=", ">=": "≥", "<=": "≤" };

const NOME_CAMPO: Record<CampoNum, string> = {
  tamanho: "tamanho",
  largura: "largura",
  altura: "altura",
  lado: "resolução",
  duracao: "duração",
  paginas: "páginas",
  tags: "tags",
};

function formatarBytes(b: number) {
  const un = (v: number, s: string) => `${v.toFixed(1).replace(/\.0$/, "")} ${s}`;

  if (b >= 1024 ** 3) return un(b / 1024 ** 3, "GB");
  if (b >= 1024 ** 2) return un(b / 1024 ** 2, "MB");
  if (b >= 1024) return un(b / 1024, "KB");

  return `${b} B`;
}

function formatarYmd(ymd: string) {
  const [a, m, d] = ymd.split("-");

  return `${d}/${m}/${a}`;
}

function rotuloQuando(q: Quando): string {
  switch (q.tipo) {
    case "hoje": return "hoje";
    case "ontem": return "ontem";
    case "dias": return `últimos ${q.n} dias`;
    case "dia": return `em ${formatarYmd(q.ymd)}`;
    case "depois": return `depois de ${formatarYmd(q.ymd)}`;
    case "desde": return `desde ${formatarYmd(q.ymd)}`;
    case "antes": return `antes de ${formatarYmd(q.ymd)}`;
    case "ate": return `até ${formatarYmd(q.ymd)}`;
  }
}

export function rotuloTermo(t: NovoTermo, tagPorId: Map<string, tags>): string {
  const menos = t.negar && t.op !== "aleatorio" && t.op !== "ordem" ? "− " : "";

  switch (t.op) {
    case "tipo": return `${menos}tipo: ${t.valor === "video" ? "vídeo" : "imagem"}`;
    case "ext": return `${menos}ext: ${t.valor}`;
    case "orientacao": return `${menos}orientação: ${t.valor}`;
    case "num": {
      const valor =
        t.campo === "tamanho" ? formatarBytes(t.valor)
        : t.campo === "duracao" ? formatarDuracao(t.valor)
        : t.campo === "largura" || t.campo === "altura" || t.campo === "lado" ? `${t.valor}px`
        : String(t.valor);

      return `${menos}${NOME_CAMPO[t.campo]} ${CMP_ROTULO[t.cmp]} ${valor}`;
    }
    case "data": return `${menos}${t.campo}: ${rotuloQuando(t.quando)}`;
    case "sem": return `${menos}sem ${t.valor === "tags" ? "tags" : "sequência"}`;
    case "tem": return `${menos}tem ${t.valor === "anterior" ? "anterior" : "continuação"}`;
    case "fila": return `${menos}na fila`;
    case "ou":
      return `${menos}${t.tagIds.map((id) => tagPorId.get(id)?.name ?? "?").join(" | ")}`;
    case "nome": return `${menos}"${t.texto}"`;
    case "prefixo": return `${menos}${t.texto}*`;
    case "aleatorio": return `aleatório: ${t.n}`;
    case "ordem": return `ordem: ${t.campo} ${t.desc ? "↓" : "↑"}`;
  }
}

/* -------------------------------- avaliação -------------------------------- */

export function itemDeMidia(m: Media): ItemBusca {
  return {
    id: m.id,
    nome: m.name,
    tagIds: m.tags.map((t) => t.id),
    mime: m.mimeType,
    ext: m.extension ?? "",
    tamanho: m.size,
    largura: m.width,
    altura: m.height,
    duracao: m.durationSeconds ?? null,
    paginas: null,
    criado: m.createdAt,
    modificado: m.modifiedAt,
    anteriorId: m.previousMediaId ?? null,
  };
}

export function itemDeLivro(l: Book): ItemBusca {
  return {
    id: l.id,
    nome: l.name,
    tagIds: l.tagIds,
    mime: null,
    ext: "",
    tamanho: null,
    largura: null,
    altura: null,
    duracao: null,
    paginas: l.pageCount,
    criado: l.createdAt,
    modificado: l.modifiedAt,
    anteriorId: l.previousBookId ?? null,
  };
}

function temTag(item: ItemBusca, tagId: string, ctx: ContextoBusca) {
  const filhas = ctx.filhas.get(tagId);

  return item.tagIds.some((id) => id === tagId || filhas?.has(id));
}

function valorNum(i: ItemBusca, campo: CampoNum): number | null {
  switch (campo) {
    case "tamanho": return i.tamanho;
    case "largura": return i.largura;
    case "altura": return i.altura;
    case "lado": return i.largura && i.altura ? Math.max(i.largura, i.altura) : null;
    case "duracao": return i.duracao;
    case "paginas": return i.paginas;
    case "tags": return i.tagIds.length;
  }
}

function comparar(v: number, cmp: Cmp, alvo: number): boolean {
  switch (cmp) {
    case ">": return v > alvo;
    case "<": return v < alvo;
    case "=": return v === alvo;
    case ">=": return v >= alvo;
    case "<=": return v <= alvo;
  }
}

function intervalo(q: Quando): [number, number] {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const dia = (ymd: string) => new Date(`${ymd}T00:00:00`).getTime();

  switch (q.tipo) {
    case "hoje": return [hoje, Infinity];
    case "ontem": return [hoje - DIA, hoje - 1];
    case "dias": return [agora.getTime() - q.n * DIA, Infinity];
    case "dia": return [dia(q.ymd), dia(q.ymd) + DIA - 1];
    case "depois": return [dia(q.ymd) + DIA, Infinity];
    case "desde": return [dia(q.ymd), Infinity];
    case "antes": return [-Infinity, dia(q.ymd) - 1];
    case "ate": return [-Infinity, dia(q.ymd) + DIA - 1];
  }
}

function compararCampo(a: ItemBusca, b: ItemBusca, campo: CampoOrdem): number {
  switch (campo) {
    case "nome":
      return a.nome.localeCompare(b.nome, "pt-BR", { numeric: true, sensitivity: "base" });
    case "tamanho": return (a.tamanho ?? 0) - (b.tamanho ?? 0);
    case "data": return (a.criado?.getTime() ?? 0) - (b.criado?.getTime() ?? 0);
    case "modificado": return (a.modificado?.getTime() ?? 0) - (b.modificado?.getTime() ?? 0);
    case "paginas": return (a.paginas ?? 0) - (b.paginas ?? 0);
  }
}

// Número estável entre 0 e 1 para cada item: a amostra não muda a cada recálculo
function aleatorioDe(id: string, semente: number): number {
  let h = (semente ^ 0x9e3779b9) | 0;

  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b);
    h ^= h >>> 13;
  }

  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);

  return (h >>> 0) / 4294967296;
}

// Transforma o termo numa função; null = não vale neste modo
export function compilar(
  t: Termo,
  ctx: ContextoBusca
): ((i: ItemBusca) => boolean) | null {
  if (!aplicavel(t, ctx.modo)) return null;

  const nega = (f: (i: ItemBusca) => boolean) => (i: ItemBusca) =>
    t.negar ? !f(i) : f(i);

  switch (t.op) {
    case "tipo": {
      const prefixo = t.valor === "video" ? "video/" : "image/";

      return nega((i) => (i.mime ?? "").startsWith(prefixo));
    }
    case "ext": {
      const ext = t.valor;

      return nega((i) => i.ext === ext);
    }
    case "orientacao": {
      const o = t.valor;

      return nega((i) => {
        if (!i.largura || !i.altura) return false;
        if (o === "horizontal") return i.largura > i.altura;
        if (o === "vertical") return i.altura > i.largura;

        return i.largura === i.altura;
      });
    }
    case "num": {
      const { campo, cmp, valor } = t;

      return nega((i) => {
        const v = valorNum(i, campo);

        return v !== null && comparar(v, cmp, valor);
      });
    }
    case "data": {
      const [de, ate] = intervalo(t.quando);
      const campo = t.campo;

      return nega((i) => {
        const d = campo === "criado" ? i.criado : i.modificado;

        if (!d) return false;

        const ms = d.getTime();

        return ms >= de && ms <= ate;
      });
    }
    case "sem":
      return t.valor === "tags"
        ? nega((i) => i.tagIds.length === 0)
        : nega((i) => !i.anteriorId && !ctx.continuacoes.has(i.id));
    case "tem":
      return t.valor === "anterior"
        ? nega((i) => Boolean(i.anteriorId))
        : nega((i) => ctx.continuacoes.has(i.id));
    case "fila":
      return nega((i) => ctx.fila.has(i.id));
    case "ou": {
      const ids = t.tagIds.filter((id) => ctx.tags.has(id));

      if (ids.length === 0) return null;

      return nega((i) => ids.some((id) => temTag(i, id, ctx)));
    }
    case "nome": {
      const alvo = normalizar(t.texto);

      return nega((i) => normalizar(i.nome).includes(alvo));
    }
    case "prefixo": {
      const alvo = normalizar(t.texto);
      const ids = [...ctx.tags.values()]
        .filter((tag) => normalizar(tag.name).startsWith(alvo))
        .map((tag) => tag.id);

      return nega((i) => ids.some((id) => temTag(i, id, ctx)));
    }
    default:
      return null;
  }
}

export function aplicarTermos<T>(
  itens: T[],
  paraItem: (x: T) => ItemBusca,
  termos: Termo[],
  ctx: ContextoBusca
): T[] {
  if (termos.length === 0) return itens;

  const predicados: ((i: ItemBusca) => boolean)[] = [];

  for (const t of termos) {
    const f = compilar(t, ctx);

    if (f) predicados.push(f);
  }

  let pares = itens.map((x) => ({ x, item: paraItem(x) }));

  if (predicados.length > 0) {
    pares = pares.filter((p) => predicados.every((f) => f(p.item)));
  }

  for (const t of termos) {
    if (t.op === "aleatorio" && aplicavel(t, ctx.modo)) {
      const semente = t.semente;

      pares = [...pares]
        .sort(
          (a, b) =>
            aleatorioDe(a.item.id, semente) - aleatorioDe(b.item.id, semente)
        )
        .slice(0, t.n);
    }
  }

  for (const t of termos) {
    if (t.op === "ordem" && aplicavel(t, ctx.modo)) {
      const sinal = t.desc ? -1 : 1;
      const campo = t.campo;

      pares = [...pares].sort(
        (a, b) => sinal * compararCampo(a.item, b.item, campo)
      );
    }
  }

  return pares.map((p) => p.x);
}