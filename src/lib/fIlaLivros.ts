import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "../components/types/book";

type Estado = { ids: string[]; atualId: string | null };

const VAZIO: Estado = { ids: [], atualId: null };

const chave = (userId: string) => `filaLivros:${userId}`;

function ler(userId: string | null): Estado {
  if (!userId) return VAZIO;

  try {
    const bruto = localStorage.getItem(chave(userId));

    if (!bruto) return VAZIO;

    const dados = JSON.parse(bruto);

    const ids: string[] = Array.isArray(dados?.ids)
      ? dados.ids.filter((id: unknown): id is string => typeof id === "string")
      : [];

    return {
      ids: [...new Set(ids)],
      atualId: typeof dados?.atualId === "string" ? dados.atualId : null,
    };
  } catch {
    return VAZIO;
  }
}

function salvar(userId: string, estado: Estado) {
  try {
    localStorage.setItem(chave(userId), JSON.stringify(estado));
  } catch {
    // sem armazenamento: a fila vale só até fechar o app
  }
}

// Ids que ainda existem (livros excluídos somem da fila)
function validos(ids: string[], porId: Map<string, Book>) {
  return ids.filter((id) => porId.has(id));
}

// Remove repetidos, ids inexistentes e o livro que já está tocando
function normalizar(novos: string[], atualId: string | null, porId: Map<string, Book>) {
  return [...new Set(novos)].filter((id) => porId.has(id) && id !== atualId);
}

function inserirApos(ids: string[], atualId: string | null, novos: string[]) {
  const conjunto = new Set(novos);
  const base = ids.filter((id) => !conjunto.has(id));
  const posicao = atualId ? base.indexOf(atualId) : -1;

  return [...base.slice(0, posicao + 1), ...novos, ...base.slice(posicao + 1)];
}

export function useFilaLivros(userId: string | null, livros: Book[]) {
  const [dono, setDono] = useState(userId);
  const [estado, setEstado] = useState<Estado>(() => ler(userId));

  // Trocou de usuário: carrega a fila dele
  if (dono !== userId) {
    setDono(userId);
    setEstado(ler(userId));
  }

  useEffect(() => {
    if (userId) salvar(userId, estado);
  }, [userId, estado]);

  const porId = useMemo(
    () => new Map(livros.map((l) => [l.id, l])),
    [livros]
  );

  const porIdRef = useRef(porId);
  const estadoRef = useRef(estado);

  useEffect(() => {
    porIdRef.current = porId;
    estadoRef.current = estado;
  });

  const itens = useMemo(
    () =>
      estado.ids
        .map((id) => porId.get(id))
        .filter((l): l is Book => Boolean(l)),
    [estado.ids, porId]
  );

  const atualId =
    estado.atualId && porId.has(estado.atualId) ? estado.atualId : null;

  const adicionarAoFim = useCallback((novos: string[]) => {
    setEstado((prev) => {
      const lista = normalizar(novos, prev.atualId, porIdRef.current);

      if (lista.length === 0) return prev;

      const conjunto = new Set(lista);
      const base = validos(prev.ids, porIdRef.current).filter(
        (id) => !conjunto.has(id)
      );

      return { ...prev, ids: [...base, ...lista] };
    });
  }, []);

  const adicionarAposAtual = useCallback((novos: string[]) => {
    setEstado((prev) => {
      const lista = normalizar(novos, prev.atualId, porIdRef.current);

      if (lista.length === 0) return prev;

      return {
        ...prev,
        ids: inserirApos(
          validos(prev.ids, porIdRef.current),
          prev.atualId,
          lista
        ),
      };
    });
  }, []);

  // Coloca os livros logo depois do atual e começa pelo primeiro deles
  const tocarAgora = useCallback((novos: string[]): string | null => {
    const alvo = novos.find((id) => porIdRef.current.has(id));

    if (!alvo) return null;

    setEstado((prev) => {
      const lista = normalizar(novos, prev.atualId, porIdRef.current);

      return {
        ids: inserirApos(
          validos(prev.ids, porIdRef.current),
          prev.atualId,
          lista
        ),
        atualId: alvo,
      };
    });

    return alvo;
  }, []);

  // Marca um livro da fila como o atual, sem mexer na ordem
  const tocar = useCallback((id: string) => {
    setEstado((prev) => (prev.ids.includes(id) ? { ...prev, atualId: id } : prev));
  }, []);

  const andar = useCallback((delta: 1 | -1): string | null => {
    const e = estadoRef.current;
    const lista = validos(e.ids, porIdRef.current);
    const posicao = e.atualId ? lista.indexOf(e.atualId) : -1;
    const id = lista[posicao + delta];

    if (!id) return null;

    setEstado((prev) => ({ ...prev, atualId: id }));

    return id;
  }, []);

  const proximo = useCallback(() => andar(1), [andar]);
  const anterior = useCallback(() => andar(-1), [andar]);

  const remover = useCallback((id: string) => {
    setEstado((prev) => {
      const lista = validos(prev.ids, porIdRef.current);
      const posicao = lista.indexOf(id);

      if (posicao === -1) return prev;

      const nova = lista.filter((i) => i !== id);

      // Se removeu o atual, volta para o anterior: o próximo continua o certo
      const atual = prev.atualId === id ? nova[posicao - 1] ?? null : prev.atualId;

      return { ids: nova, atualId: atual };
    });
  }, []);

  const moverItem = useCallback((de: number, para: number) => {
    setEstado((prev) => {
      const lista = validos(prev.ids, porIdRef.current);

      if (
        de === para ||
        de < 0 ||
        para < 0 ||
        de >= lista.length ||
        para >= lista.length
      ) {
        return prev;
      }

      const copia = [...lista];
      const [item] = copia.splice(de, 1);
      copia.splice(para, 0, item);

      return { ...prev, ids: copia };
    });
  }, []);

  // Embaralha só o que vem depois do livro atual
  const embaralhar = useCallback(() => {
    setEstado((prev) => {
      const lista = validos(prev.ids, porIdRef.current);
      const inicio = (prev.atualId ? lista.indexOf(prev.atualId) : -1) + 1;
      const resto = lista.slice(inicio);

      for (let i = resto.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resto[i], resto[j]] = [resto[j], resto[i]];
      }

      return { ...prev, ids: [...lista.slice(0, inicio), ...resto] };
    });
  }, []);

  const encerrar = useCallback(() => setEstado(VAZIO), []);

  return {
    itens,
    atualId,
    adicionarAoFim,
    adicionarAposAtual,
    tocarAgora,
    tocar,
    proximo,
    anterior,
    remover,
    moverItem,
    embaralhar,
    encerrar,
  };
}

export type filaLivros = ReturnType<typeof useFilaLivros>;