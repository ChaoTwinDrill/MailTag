import { useCallback, useEffect, useState } from "react";
import type { Book } from "./types/book";
import type { Media } from "./types/media";
import MediaViewer, { type VizinhoSequencia } from "./MediaViewer";
import { supabase } from "../lib/supabase";
import { LIBRARY_ID } from "../lib/library";
import { obterArquivoCacheado } from "../lib/cache";

type Props = {
  livro: Book;
  onClose: () => void;
  onFimDoLivro?: () => void;
  onLivroAnterior?: () => void;
  comecarNoFim?: boolean;
  sequenciaAnterior?: VizinhoSequencia | null;
  sequenciaProxima?: VizinhoSequencia | null;
  onIrParaSequencia?: (id: string) => void;
};


export default function BookReader({
  livro,
  onClose,
  sequenciaAnterior,
  sequenciaProxima,
  onIrParaSequencia,
  onFimDoLivro,
  onLivroAnterior,
  comecarNoFim,
}: Props) {
  const [paginas, setPaginas] = useState<Media[]>([]);
  const [srcs, setSrcs] = useState<Record<string, string>>({});
  const [indice, setIndice] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Lista de páginas, já no formato Media
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const { data, error } = await supabase
        .from("medias")
        .select("*")
        .eq("library_id", LIBRARY_ID)
        .eq("book_id", livro.id)
        .eq("book_role", "page")
        .is("deleted_at", null)
        .order("page_position", { ascending: true });

      if (cancelado) return;

      if (error) {
        console.error("Erro ao carregar páginas:", error);
        setErro(error.message);
      } else {
       const lista = (data ?? []).map((m): Media => ({
        id: m.id,
        libraryId: m.library_id,
        name: m.name,
        src: "",
        r2Key: m.r2_key,
        mimeType: m.mime_type,
        size: Number(m.size_bytes),
        createdAt: m.file_created_at ? new Date(m.file_created_at) : null,
        modifiedAt: m.file_modified_at ? new Date(m.file_modified_at) : null,
        width: m.width,
        height: m.height,
        extension: m.name.split(".").pop()?.toLowerCase(),
        thumbnailR2Key: m.thumbnail_r2_key,
        thumbnailSrc: "",
        tags: [],
      }));

      setPaginas(lista);

      // Voltando de outro livro: abre na última página
      if (comecarNoFim && lista.length > 0) setIndice(lista.length - 1);
      }

      setCarregando(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [livro.id]);

  // Baixa o original da página atual e já adianta a próxima
  useEffect(() => {
    let cancelado = false;

    for (const pagina of [paginas[indice], paginas[indice + 1]]) {
      if (!pagina || srcs[pagina.id]) continue;

      obterArquivoCacheado(pagina.r2Key)
        .then((src) => {
          if (!cancelado) setSrcs((atual) => ({ ...atual, [pagina.id]: src }));
        })
        .catch((e) => console.error("Erro ao carregar página:", e));
    }

    return () => {
      cancelado = true;
    };
  }, [paginas, indice]); // eslint-disable-line react-hooks/exhaustive-deps

 const navegar = useCallback(
  (delta: number) => {
    // Passou da última página: próximo livro
    if (delta > 0 && indice >= paginas.length - 1) {
      onFimDoLivro?.();
      return;
    }

    // Antes da primeira página: livro anterior
    if (delta < 0 && indice <= 0) {
      onLivroAnterior?.();
      return;
    }

    setIndice((i) => Math.min(Math.max(i + delta, 0), paginas.length - 1));
  },
  [indice, paginas.length, onFimDoLivro, onLivroAnterior]
);

  const atual = paginas[indice];

  if (atual) {
    return (
      <MediaViewer
        media={{ ...atual, src: srcs[atual.id] ?? "" }}
        posicao={indice}
        total={paginas.length}
        onNavegar={navegar}
        onClose={onClose}
        permitirAvancarNoFim 
        permitirRecuarNoInicio={!!onLivroAnterior}
        titulo={livro.name}
        sequenciaAnterior={sequenciaAnterior}
        sequenciaProxima={sequenciaProxima}
        onIrParaSequencia={onIrParaSequencia}
      />
    );
  }

  // Carregando, erro ou livro sem páginas
  return (
  <div
    data-painel-filtros
    className="fixed inset-0 z-[150] flex animate-fade-in items-center justify-center bg-fundo/90 text-white backdrop-blur-md"
    onClick={onClose}
  >
    <div className="flex flex-col items-center gap-3 text-center">
      {carregando ? (
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <>
          <p className="font-Alexandria font-[700]">
            {erro ? "Não foi possível abrir o livro" : "Este livro não tem páginas"}
          </p>
          {erro && <p className="max-w-80 text-sm text-gray-300">{erro}</p>}
          <p className="text-xs text-gray-400">Clique para fechar</p>
        </>
      )}
    </div>
  </div>
);
}