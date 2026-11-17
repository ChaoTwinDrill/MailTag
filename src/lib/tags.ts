import type { CSSProperties } from "react";
import type { tags } from "../components/types/tag";

export const COR_FUNDO_PADRAO = "#555555";
export const COR_TEXTO_PADRAO = "#ffffff";

// Único lugar que decide como uma tag é pintada
export function estiloTag(tag: tags): CSSProperties {
  return {
    backgroundColor: tag.color ?? COR_FUNDO_PADRAO,
    color: tag.textColor ?? COR_TEXTO_PADRAO,
    border: tag.hasBorder
      ? `2px solid ${tag.borderColor ?? "#ffffff"}`
      : "none",
  };
}

const norm = (texto: string) => texto.trim().toLowerCase();

// O nome tem prioridade; se não bater, vale um sinônimo exato
export function acharTagPorNome(todas: tags[], nome: string): tags | null {
  const alvo = norm(nome);

  return (
    todas.find((t) => t.name.toLowerCase() === alvo) ??
    todas.find((t) => (t.aliases ?? []).some((a) => a.toLowerCase() === alvo)) ??
    null
  );
}

// A tag (ou um sinônimo dela) já usa este nome?
export function tagQueUsaNome(
  todas: tags[],
  nome: string,
  ignorarId?: string
): tags | null {
  const alvo = norm(nome);

  return (
    todas.find(
      (t) =>
        t.id !== ignorarId &&
        (t.name.toLowerCase() === alvo ||
          (t.aliases ?? []).some((a) => a.toLowerCase() === alvo))
    ) ?? null
  );
}

// O texto aparece no nome ou em algum sinônimo?
export function tagCorresponde(tag: tags, texto: string): boolean {
  const busca = norm(texto);

  return (
    tag.name.toLowerCase().includes(busca) ||
    (tag.aliases ?? []).some((a) => a.toLowerCase().includes(busca))
  );
}

// Tags cujo nome ou sinônimo contém o texto; as de nome vêm primeiro
export function sugerirTags(
  todas: tags[],
  texto: string,
  excluirIds: string[] = [],
  limite = 20
): tags[] {
  const busca = norm(texto);

  if (!busca) return [];

  const fora = new Set(excluirIds);
  const porNome: tags[] = [];
  const porSinonimo: tags[] = [];

  for (const tag of todas) {
    if (fora.has(tag.id)) continue;

    if (tag.name.toLowerCase().includes(busca)) porNome.push(tag);
    else if ((tag.aliases ?? []).some((a) => a.toLowerCase().includes(busca))) {
      porSinonimo.push(tag);
    }
  }

  return [...porNome, ...porSinonimo].slice(0, limite);
}

export type GrupoDeTags = { chave: string; categoria: tags | null; tags: tags[] };

// Agrupa tags pela categoria (tag pai). Sem categoria vão por último.
export function agruparPorCategoria(lista: tags[], todas: tags[]): GrupoDeTags[] {
  const porId = new Map(todas.map((t) => [t.id, t]));
  const grupos = new Map<string, GrupoDeTags>();

  for (const tag of lista) {
    const categoria = tag.parentTagId ? porId.get(tag.parentTagId) ?? null : null;
    const chave = categoria?.id ?? "sem-categoria";
    const grupo = grupos.get(chave);

    if (grupo) grupo.tags.push(tag);
    else grupos.set(chave, { chave, categoria, tags: [tag] });
  }

  return [...grupos.values()].sort((a, b) => {
    if (!a.categoria) return 1;
    if (!b.categoria) return -1;

    const pa = a.categoria.priority ?? Infinity;
    const pb = b.categoria.priority ?? Infinity;

    if (pa !== pb) return pa < pb ? -1 : 1;

    return a.categoria.name.localeCompare(b.categoria.name, "pt-BR");
  });
}