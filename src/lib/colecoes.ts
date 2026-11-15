import type { ModoApp } from "../components/types/book";
import type { Filtros, ModoTags } from "./filtros";
import type { FiltrosLivros } from "./bookFilters";
import type { Termo } from "./busca";

export interface Colecao {
  id: string;
  nome: string;
  modo: ModoApp;
  buscaTagIds: string[];
  buscaExcluirIds: string[];
  termos: Termo[];
  modoTags: ModoTags;
  filtros?: Filtros; // usados no modo imagens
  filtrosLivros?: FiltrosLivros; // usados no modo livros
}

const chave = (userId: string) => `colecoes:${userId}`;

const lista = (valor: unknown): string[] =>
  Array.isArray(valor)
    ? valor.filter((v): v is string => typeof v === "string")
    : [];

const termoValido = (t: unknown): t is Termo =>
  Boolean(t) &&
  typeof t === "object" &&
  typeof (t as { id?: unknown }).id === "string" &&
  typeof (t as { op?: unknown }).op === "string";

export function lerColecoes(userId: string): Colecao[] {
  try {
    const bruto = localStorage.getItem(chave(userId));

    if (!bruto) return [];

    const dados = JSON.parse(bruto);

    if (!Array.isArray(dados)) return [];

    return dados
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.nome === "string" &&
          (c.modo === "imagens" || c.modo === "livros")
      )
      .map(
        (c): Colecao => ({
          id: c.id,
          nome: c.nome,
          modo: c.modo,
          buscaTagIds: lista(c.buscaTagIds),
          buscaExcluirIds: lista(c.buscaExcluirIds),
          termos: Array.isArray(c.termos) ? c.termos.filter(termoValido) : [],
          modoTags: c.modoTags === "qualquer" ? "qualquer" : "todas",
          filtros: c.filtros,
          filtrosLivros: c.filtrosLivros,
        })
      );
  } catch {
    return [];
  }
}

export function salvarColecoes(userId: string, colecoes: Colecao[]) {
  try {
    localStorage.setItem(chave(userId), JSON.stringify(colecoes));
  } catch {
    // sem armazenamento: valem só até fechar o app
  }
}