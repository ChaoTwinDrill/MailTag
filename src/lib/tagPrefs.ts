import { useSyncExternalStore } from "react";
import type { tags } from "../components/types/tag";

type Prefs = { favoritas: string[]; recentes: string[] };

const VAZIO: Prefs = { favoritas: [], recentes: [] };
const MAX_RECENTES = 12;

let usuario: string | null = null;
let estado: Prefs = VAZIO;

const ouvintes = new Set<() => void>();

const chave = (id: string) => `tagPrefs:${id}`;

function lista(valor: unknown): string[] {
  return Array.isArray(valor)
    ? [...new Set(valor.filter((x): x is string => typeof x === "string"))]
    : [];
}

function ler(id: string | null): Prefs {
  if (!id) return VAZIO;

  try {
    const bruto = localStorage.getItem(chave(id));

    if (!bruto) return VAZIO;

    const dados = JSON.parse(bruto);

    return {
      favoritas: lista(dados?.favoritas),
      recentes: lista(dados?.recentes).slice(0, MAX_RECENTES),
    };
  } catch {
    return VAZIO;
  }
}

function avisar() {
  ouvintes.forEach((f) => f());
}

function publicar(novo: Prefs) {
  estado = novo;

  if (usuario) {
    try {
      localStorage.setItem(chave(usuario), JSON.stringify(novo));
    } catch {
      // sem armazenamento: vale só até fechar o app
    }
  }

  avisar();
}

// Chame quando o usuário logar ou sair
export function definirUsuarioPrefs(id: string | null) {
  if (usuario === id) return;

  usuario = id;
  estado = ler(id);
  avisar();
}

export function alternarFavorita(tagId: string) {
  publicar({
    ...estado,
    favoritas: estado.favoritas.includes(tagId)
      ? estado.favoritas.filter((i) => i !== tagId)
      : [...estado.favoritas, tagId],
  });
}

// Recentes ficam pelo nome: funcionam mesmo para tags recém-criadas
export function registrarUsoDeTag(nome: string) {
  const n = nome.trim().toLowerCase();

  if (!n) return;

  publicar({
    ...estado,
    recentes: [n, ...estado.recentes.filter((x) => x !== n)].slice(0, MAX_RECENTES),
  });
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useTagPrefs(): Prefs {
  return useSyncExternalStore(assinar, () => estado);
}

export function resolverAtalhos(prefs: Prefs, todas: tags[], excluirIds: string[]) {
  const porId = new Map(todas.map((t) => [t.id, t]));
  const porNome = new Map(todas.map((t) => [t.name.toLowerCase(), t]));
  const fora = new Set(excluirIds);
  const favoritasIds = new Set(prefs.favoritas);

  const favoritas = prefs.favoritas
    .map((id) => porId.get(id))
    .filter((t): t is tags => !!t && !fora.has(t.id));

  const recentes = prefs.recentes
    .map((n) => porNome.get(n))
    .filter((t): t is tags => !!t && !fora.has(t.id) && !favoritasIds.has(t.id));

  return { favoritas, recentes };
}