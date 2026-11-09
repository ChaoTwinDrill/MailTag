import { useCallback, useEffect, useState } from "react";
import type { Book } from "./types/book";
import type { Media } from "./types/media";
import MediaViewer from "./MediaViewer";
import { supabase } from "../lib/supabase";
import { LIBRARY_ID } from "../lib/library";
import { obterArquivoCacheado } from "../lib/cache";

type Props = { livro: Book; onClose: () => void; onFimDoLivro?: () => void };


export default function BookReader({ livro, onClose, onFimDoLivro }: Props) {
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
        setPaginas(
          (data ?? []).map((m): Media => ({
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
          }))
        );
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
    // Passou da última página: vai para o próximo livro
    if (delta > 0 && indice >= paginas.length - 1) {
      onFimDoLivro?.();
      return;
    }

    setIndice((i) => Math.min(Math.max(i + delta, 0), paginas.length - 1));
  },
  [indice, paginas.length, onFimDoLivro]
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
      />
    );
  }

  // Carregando, erro ou livro sem páginas
  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[150] flex items-center justify-center bg-fundo/90 text-white"
      onClick={onClose}
    >
      <p>
        {carregando
          ? "Carregando..."
          : erro
            ? `Erro: ${erro}`
            : "Este livro não tem páginas."}
      </p>
    </div>
  );
}