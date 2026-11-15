export type PedidoAleatorio = { id: string; abrir: boolean; n: number };

export function sortear<T extends { id: string }>(
  lista: T[],
  evitarId?: string | null
): T | null {
  if (lista.length === 0) return null;

  const opcoes =
    lista.length > 1 && evitarId ? lista.filter((i) => i.id !== evitarId) : lista;

  return opcoes[Math.floor(Math.random() * opcoes.length)];
}