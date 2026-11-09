
import type { Book } from "../components/types/book";

export type OrdenacaoLivro =
  | "padrao"
  | "nome"
  | "paginas"
  | "criacao"
  | "modificacao";

export interface FiltrosLivros {
  paginasMin: number | null;
  paginasMax: number | null;
  campoData: "criacao" | "modificacao";
  dataDe: string | null;
  dataAte: string | null;
  ordenarPor: OrdenacaoLivro;
  ordem: "asc" | "desc";
  semTags: boolean;
  tagsExcluidas: string[];
}

export const FILTROS_LIVROS_PADRAO: FiltrosLivros = {
  paginasMin: null,
  paginasMax: null,
  campoData: "criacao",
  dataDe: null,
  dataAte: null,
  ordenarPor: "padrao",
  ordem: "asc",
  semTags: false,
  tagsExcluidas: [],
};

export function contarFiltrosLivrosAtivos(
  filtros: FiltrosLivros
): number {
  let total = 0;
  if (filtros.semTags) total++;
  if (filtros.tagsExcluidas.length > 0) total++;
  if (
    filtros.paginasMin !== null ||
    filtros.paginasMax !== null
  ) {
    total++;
  }

  if (filtros.dataDe || filtros.dataAte) {
    total++;
  }

  return total;
}

export function filtrarLivros(
  livros: Book[],
  filtros: FiltrosLivros
): Book[] {
  const dataDe = filtros.dataDe
    ? new Date(`${filtros.dataDe}T00:00:00`)
    : null;

  const dataAte = filtros.dataAte
    ? new Date(`${filtros.dataAte}T23:59:59.999`)
    : null;

  const resultado = livros.filter((livro) => {
    if (filtros.semTags && livro.tagIds.length > 0) {
      return false;
    }

    if (
      livro.tagIds.some((id) => filtros.tagsExcluidas.includes(id))
    ) {
      return false;
    }
    
    if (
      filtros.paginasMin !== null &&
      livro.pageCount < filtros.paginasMin
    ) {
      return false;
    }

    if (
      filtros.paginasMax !== null &&
      livro.pageCount > filtros.paginasMax
    ) {
      return false;
    }

    if (dataDe || dataAte) {
      const data =
        filtros.campoData === "criacao"
          ? livro.createdAt
          : livro.modifiedAt;

      if (!data) return false;
      if (dataDe && data < dataDe) return false;
      if (dataAte && data > dataAte) return false;
    }

    return true;
  });

  if (filtros.ordenarPor === "padrao") {
    return resultado;
  }

 const sinal = filtros.ordem === "asc" ? 1 : -1;

const resultadoOrdenado = [...resultado];

resultadoOrdenado.sort((a, b) => {
  let comparacao = 0;

  switch (filtros.ordenarPor) {
    case "nome":
      comparacao = a.name.localeCompare(b.name, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      });
      break;

    case "paginas":
      comparacao = a.pageCount - b.pageCount;
      break;

    case "criacao":
      comparacao = a.createdAt.getTime() - b.createdAt.getTime();
      break;

    case "modificacao":
      comparacao = a.modifiedAt.getTime() - b.modifiedAt.getTime();
      break;
  }

  return comparacao * sinal;
});

return resultadoOrdenado;
}
