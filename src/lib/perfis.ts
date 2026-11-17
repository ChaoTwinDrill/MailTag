import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

let perfis = new Map<string, string>();

const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((f) => f());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
  };
}

export async function carregarPerfis() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name");

  if (error) {
    console.error("Erro ao carregar perfis:", error);
    return;
  }

  perfis = new Map(
    (data ?? []).map((p) => [p.id as string, p.display_name as string])
  );

  avisar();
}

export function limparPerfis() {
  perfis = new Map();
  avisar();
}

export function useNomeDoPerfil(id: string | null | undefined): string | null {
  const mapa = useSyncExternalStore(assinar, () => perfis);

  return id ? mapa.get(id) ?? null : null;
}

export async function salvarMeuNome(userId: string, nome: string) {
  const limpo = nome.trim();

  if (!limpo) throw new Error("O nome não pode ficar vazio.");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: limpo, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;

  perfis = new Map(perfis).set(userId, limpo);
  avisar();
}