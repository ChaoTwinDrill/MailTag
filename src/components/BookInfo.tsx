import { useEffect, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";
import { obterArquivoCacheado } from "../lib/cache";
import BookTagbutton from "./BookTagButton";
import TagEditor from "./TagEditor";

type Props = {
  livro: Book | null;
  allTags: tags[];
  onOpen: () => void;
  onAddTag: (livroId: string, nomeTag: string) => void;
  onCreateCategory: (nome: string) => Promise<tags | null>;
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
onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
};

function BookInfo({
  livro,
  allTags,
  onOpen,
  onAddTag,
  onRemoveTag,
  onCustomizeTag,
  onCreateCategory,
  onChangeAutoTags
}: Props) {
  const [capa, setCapa] = useState("");
  const chave = livro?.coverThumbnailR2Key;
  const grupos = new Map<string, { categoria: tags | null; tags: tags[] }>();
  const [tagEditando, setTagEditando] = useState<tags | null>(null);
   const [menu, setMenu] = useState<{
      tag: tags;
      x: number;
      y: number;
    } | null>(null);

    useEffect(() => {
    function fecharMenu() {
      setMenu(null);
    }

    function lidarComTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setTagEditando(null);
      }
    }

    window.addEventListener("click", fecharMenu);
    window.addEventListener("keydown", lidarComTecla);

    return () => {
      window.removeEventListener("click", fecharMenu);
      window.removeEventListener("keydown", lidarComTecla);
    };
  }, []);

    useEffect(() => {
        setCapa("");

        if (!livro) return;

        let cancelado = false;

        if (livro.coverThumbnailR2Key) {
            obterArquivoCacheado(livro.coverThumbnailR2Key)
            .then((src) => {
                if (!cancelado) setCapa((atual) => atual || src);
            })
            .catch(() => {});
        }

        if (livro.coverR2Key) {
            obterArquivoCacheado(livro.coverR2Key)
            .then((src) => {
                if (!cancelado) setCapa(src);
            })
            .catch((erro) => console.error("Erro ao carregar capa original:", erro));
        }
        
        return () => {
            cancelado = true;
        };
        }, [livro?.id, livro?.coverThumbnailR2Key, livro?.coverR2Key]);


  useEffect(() => {
    setCapa("");

   
    if (!chave) return;

    let cancelado = false;

    obterArquivoCacheado(chave)
      .then((src) => {
        if (!cancelado) setCapa(src);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [livro?.id, livro?.coverThumbnailR2Key]);

  if (!livro) {
    return (
      <aside className="w-1/4 shrink-0 bg-base text-white">
        <h2 className="text-lg font-semibold">Informações do livro</h2>
        <p className="mt-4 text-gray-400">Nenhum livro selecionado.</p>
      </aside>
    );
  }

  // Agrupa as tags do livro por categoria (mesma lógica do MediaInfo)
 

  for (const id of livro.tagIds) {
    const tag = allTags.find((t) => t.id === id);
    if (!tag) continue;

    const categoria = allTags.find((t) => t.id === tag.parentTagId) ?? null;
    const chave = categoria?.id ?? "sem-categoria";

    const grupo = grupos.get(chave);
    if (grupo) grupo.tags.push(tag);
    else grupos.set(chave, { categoria, tags: [tag] });
  }

  


 

    
  const gruposOrdenados = [...grupos.entries()].sort(([, a], [, b]) => {
    if (!a.categoria) return 1;
    if (!b.categoria) return -1;

    const pa = a.categoria.priority ?? Infinity;
    const pb = b.categoria.priority ?? Infinity;

    if (pa !== pb) return pa - pb;

    return a.categoria.name.localeCompare(b.categoria.name, "pt-BR");
  });

  return (
    <aside className="relative w-1/4 min-h-0 shrink-0 overflow-y-auto bg-base text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        className="aspect-[3/4] w-full cursor-zoom-in bg-card"
        onDoubleClick={onOpen}
      >
        {capa && (
          <img src={capa} alt={livro.name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mt-1 p-2">
        <h1 className="break-words font-Alexandria text-[20px] font-[700]">
          {livro.name}
        </h1>

        <button
          type="button"
          onClick={onOpen}
          className="mt-3 w-full rounded-md bg-botao-claro px-4 py-2 font-Alexandria font-[500] text-fundo hover:brightness-110"
        >
          Ler livro
        </button>

        {gruposOrdenados.length > 0 && (
          <div className="m-2 flex flex-col gap-3">
            {gruposOrdenados.map(([id, grupo]) => (
              <div
                key={id}
                className="relative mt-3 min-w-0 rounded-b-lg rounded-t-lg border-b-15 border-t-25 border-card bg-fundo p-2"
              >
                {grupo.categoria && (
                  <span className="absolute -top-[25px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-card px-2 font-semibold text-white">
                    {grupo.categoria.name}
                  </span>
                )}

                <div className="flex flex-wrap gap-2">
                  {grupo.tags.map((tag) => (
                    <span
                      key={tag.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({
                          tag,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          onRemoveTag(livro.id, tag.id);
                        }
                      }}
                      className="cursor-pointer rounded px-2 py-1 font-semibold"
                      style={{
                        backgroundColor: tag.color ?? undefined,
                        color: tag.textColor ?? "#ffffff",
                        border: tag.hasBorder
                          ? `2px solid ${tag.borderColor ?? "#ffffff"}`
                          : "none",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

                  <p className="mt-2 font-Alexandria text-sm font-[500] text-gray-400">
                    {livro.pageCount} {livro.pageCount === 1 ? "página" : "páginas"}
                  </p>
                  <p className="mt-1 font-Alexandria text-sm font-[500] text-gray-400">
                    Criado em: {livro.createdAt.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-1 pb-6 font-Alexandria text-sm font-[500] text-gray-400">
                    Modificado em: {livro.modifiedAt.toLocaleString("pt-BR")}
                  </p>
                  <BookTagbutton
                    livro={livro}
                    allTags={allTags}
                    onAddTag={onAddTag}
                  />  
                </div>
                  {menu && (
            <div
              className="fixed z-[100] min-w-44 rounded-md border border-base bg-fundo p-1 shadow-lg"
              style={{ left: menu.x, top: menu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full rounded px-3 py-2 text-left hover:bg-botao"
                onClick={() => {
                  setTagEditando(menu.tag);
                  setMenu(null);
                }}
              >
                Personalizar
              </button>
            </div>
          )}

          {tagEditando && (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
              onClick={() => setTagEditando(null)}
            >
              <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-base text-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 pb-2">
                  <h2 className="font-Alexandria text-lg font-[700]">
                    Editar "{tagEditando.name}"
                  </h2>
                  <button onClick={() => setTagEditando(null)}>Fechar</button>
                </div>

                <TagEditor
                  key={tagEditando.id}
                  tag={tagEditando}
                  allTags={allTags}
                  onSave={onCustomizeTag}
                  onChangeAutoTags={onChangeAutoTags}
                  onBack={() => setTagEditando(null)}
                  onCreateCategory={onCreateCategory}
                />
              </div>
            </div>
          )}
    </aside>
  );
}

export default BookInfo;