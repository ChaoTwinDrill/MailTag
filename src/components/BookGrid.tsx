import { useEffect, useRef, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";
import { obterArquivoCacheado } from "../lib/cache";
import BookInfo from "./BookInfo";
import BookReader from "./BookReader";

type BookGridProps = {
  livros: Book[];
  allTags: tags[];
  onAddTag: (livroId: string, nomeTag: string) => void;
  onRemoveTag: (livroId: string, tagId: string) => void;
  onCustomizeTag: (
    tagId: string,
    nome: string,
    cor: string | null,
    corTexto: string | null,
    temBorda: boolean,
    corBorda: string | null,
    parentTagId: string | null,
    prioridade: number | null
  ) => void;
  onDeleteTag: (tagId: string) => void;
  onCreateCategory: (nome: string, categoriaId?: string | null) => Promise<tags | null>;
  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
  
};

function BookCard({
  livro,
  selecionado,
  onSelect,
  onOpen,
}: {
  livro: Book;
  selecionado: boolean;
  onSelect: (livro: Book) => void;
  onOpen: (livro: Book) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [capa, setCapa] = useState("");

  useEffect(() => {
    setCapa("");

    const chave = livro.coverThumbnailR2Key;

    if (!chave) return;

    let cancelado = false;

    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observer.disconnect();

          obterArquivoCacheado(chave)
            .then((src) => {
              if (!cancelado) setCapa(src);
            })
            .catch((erro) => console.error("Erro ao carregar capa:", erro));
        }
      },
      { rootMargin: "300px" }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      cancelado = true;
      observer.disconnect();
    };
  }, [livro.coverThumbnailR2Key]);

  return (
    <div className="min-w-0">
      <div
        ref={ref}
        onClick={() => onSelect(livro)}
        onDoubleClick={() => onOpen(livro)}
        className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg bg-card ${
          selecionado ? "outline outline-4 outline-purple-200 brightness-69" : ""
        }`}
      >
        {capa && (
          <img
            src={capa}
            alt={livro.name}
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}

        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
          {livro.pageCount} {livro.pageCount === 1 ? "página" : "páginas"}
        </span>
      </div>

      <p className="mt-2 truncate font-Alexandria font-[500] text-white">
        {livro.name}
      </p>
    </div>
  );
}

function BookGrid({
  livros,
  allTags,
  onAddTag,
  onRemoveTag,
  onCustomizeTag,
  onDeleteTag,
  onCreateCategory,
  onChangeAutoTags,
}: BookGridProps) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  // Sempre pega a versão mais recente do livro (o realtime recarrega a lista)
  const selecionado = livros.find((l) => l.id === selecionadoId) ?? null;
  const posicao = selecionado ? livros.indexOf(selecionado) : -1;

  // Se o livro sumir da lista (filtro, exclusão), fecha o leitor
  useEffect(() => {
    if (!selecionado) setLendo(false);
  }, [selecionado]);

  function abrir(livro: Book) {
    setSelecionadoId(livro.id);
    setLendo(true);
  }

  function proximoLivro() {
    const proximo = livros[posicao + 1];

    if (proximo) setSelecionadoId(proximo.id);
    else setLendo(false); // era o último da lista
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fundo p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {livros.length === 0 ? (
          <p className="py-10 text-center text-gray-400">Nenhum livro por aqui.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {livros.map((livro) => (
              <BookCard
                key={livro.id}
                livro={livro}
                selecionado={livro.id === selecionadoId}
                onSelect={(l) => setSelecionadoId(l.id)}
                onOpen={abrir}
              />
            ))}
          </div>
        )}
      </div>

      <BookInfo
        livro={selecionado}
        allTags={allTags}
        onOpen={() => selecionado && setLendo(true)}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onCustomizeTag={onCustomizeTag}
        onChangeAutoTags={onChangeAutoTags}
        onCreateCategory={onCreateCategory}     
      />

      {lendo && selecionado && (
        <BookReader
          key={selecionado.id}
          livro={selecionado}
          onClose={() => setLendo(false)}
          onFimDoLivro={proximoLivro}
        />
      )}
    </div>
  );
}

export default BookGrid;