import type { Media } from "../components/types/media";

export type TipoMidia = "todos" | "imagem" | "video";
export type Orientacao = "todas" | "horizontal" | "vertical" | "quadrada";
export type ModoTags = "todas" | "qualquer";
export type CampoData = "criacao" | "modificacao";
export type Ordenacao =
  | "padrao"
  | "nome"
  | "tamanho"
  | "criacao"
  | "modificacao";

export interface Filtros {
  tipo: TipoMidia;
  extensoes: string[];
  orientacao: Orientacao;
  semTags: boolean;
  modoTags: ModoTags;
  tamanhoMinMB: number | null;
  tamanhoMaxMB: number | null;
  campoData: CampoData;
  dataDe: string | null; // AAAA-MM-DD
  dataAte: string | null; // AAAA-MM-DD
  ordenarPor: Ordenacao;
  ordem: "asc" | "desc";
  tagsExcluidas: string[];
}

export const FILTROS_PADRAO: Filtros = {
  tipo: "todos",
  extensoes: [],
  orientacao: "todas",
  semTags: false,
  modoTags: "todas",
  tamanhoMinMB: null,
  tamanhoMaxMB: null,
  campoData: "criacao",
  dataDe: null,
  dataAte: null,
  ordenarPor: "padrao",
  ordem: "asc",
  tagsExcluidas: [],
};

const MB = 1024 * 1024;


// Quantos filtros estão ativos (ordenação e modo das tags não contam)
export function contarFiltrosAtivos(f: Filtros): number {
  let total = 0;

  if (f.tipo !== "todos") total++;
  if (f.extensoes.length > 0) total++;
  if (f.orientacao !== "todas") total++;
  if (f.semTags) total++;
  if (f.tamanhoMinMB !== null || f.tamanhoMaxMB !== null) total++;
  if (f.dataDe || f.dataAte) total++;
  if (f.tagsExcluidas.length > 0) total++;

  return total;
}

const comparadores: Record<
  Exclude<Ordenacao, "padrao">,
  (a: Media, b: Media) => number
> = {
  nome: (a, b) =>
    a.name.localeCompare(b.name, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }),
  tamanho: (a, b) => a.size - b.size,
  criacao: (a, b) =>
    (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  modificacao: (a, b) =>
    (a.modifiedAt?.getTime() ?? 0) - (b.modifiedAt?.getTime() ?? 0),
};

export function filtrarMedias(medias: Media[], f: Filtros): Media[] {
  const minBytes = f.tamanhoMinMB !== null ? f.tamanhoMinMB * MB : null;
  const maxBytes = f.tamanhoMaxMB !== null ? f.tamanhoMaxMB * MB : null;

  const de = f.dataDe ? new Date(`${f.dataDe}T00:00:00`) : null;
  const ate = f.dataAte ? new Date(`${f.dataAte}T23:59:59.999`) : null;

  const resultado = medias.filter((media) => {
    if (f.tipo === "imagem" && !media.mimeType?.startsWith("image/")) {
      return false;
    }

    if (f.tipo === "video" && !media.mimeType?.startsWith("video/")) {
      return false;
    }

    if (
      f.extensoes.length > 0 &&
      !f.extensoes.includes(media.extension ?? "")
    ) {
      return false;
    }

    if (f.semTags && media.tags.length > 0) return false;

    if (minBytes !== null && media.size < minBytes) return false;
    if (maxBytes !== null && media.size > maxBytes) return false;

    if (f.orientacao !== "todas") {
      if (!media.width || !media.height) return false;

      if (f.orientacao === "horizontal" && media.width <= media.height) {
        return false;
      }

      if (f.orientacao === "vertical" && media.height <= media.width) {
        return false;
      }

      if (f.orientacao === "quadrada" && media.width !== media.height) {
        return false;
      }
    }

    if (de || ate) {
      const data =
        f.campoData === "criacao" ? media.createdAt : media.modifiedAt;

      if (!data) return false;
      if (de && data < de) return false;
      if (ate && data > ate) return false;
    }

    return true;
  });

  if (f.ordenarPor === "padrao") return resultado;

  const comparar = comparadores[f.ordenarPor];
  const sinal = f.ordem === "asc" ? 1 : -1;

  return [...resultado].sort((a, b) => sinal * comparar(a, b));
}
