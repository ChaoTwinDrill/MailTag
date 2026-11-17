import { useEffect, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";
import { obterArquivoCacheado } from "../lib/cache";
import AdicionarTagBar from "./AdicionarTagBar";
import TagEditor from "./TagEditor";
import TagGroups from "./TagGroups";
import Sequencia from "./Sequencia";
import CapaLivro from "./CapaLivro";
import PainelVazio from "./PainelVazio";
import InfoLista from "./InfoLista";
import { FaBook } from "react-icons/fa";
import { useNomeDoPerfil } from "../lib/perfis";
type Props = {
  livro: Book | null;
  allTags: tags[];
  onOpen: () => void;
  onSearchTag?: (tagId: string, excluir: boolean) => void;
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
  todosLivros: Book[];
  onSetPrevious: (livroId: string, anteriorId: string | null) => void;
  onOpenRelated: (livroId: string) => void;
  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
};

const anteriorDoLivro = (l: Book) => l.previousBookId ?? null;
const miniaturaDoLivro = (l: Book) => l.coverThumbnailR2Key;

function BookInfo({
  livro,
  allTags,
  onOpen,
  onAddTag,
  onSearchTag,
  onRemoveTag,
  onCustomizeTag,
  onCreateCategory,
  onChangeAutoTags,
  todosLivros,
  onOpenRelated,
  onSetPrevious,
}: Props) {
  const [capa, setCapa] = useState("");
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
  const adicionadoPor = useNomeDoPerfil(livro?.createdBy);
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

  if (!livro) {
    return (
      <PainelVazio
        icone={FaBook}
        titulo="Nenhum livro selecionado"
        texto="Clique em um livro para ver os detalhes e editar as tags."
      />
    );
  }

  // O livro guarda só os ids; aqui viram objetos de tag
  const tagsDoLivro = livro.tagIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is tags => !!t);

  return (
    <aside className="relative w-1/4 min-h-0 shrink-0 overflow-y-auto bg-base text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="cursor-zoom-in p-4 pb-2" onDoubleClick={onOpen}>
        <CapaLivro
          chave={livro.coverThumbnailR2Key ?? livro.coverR2Key}
          src={capa}
          titulo={livro.name}
          className="aspect-[3/4] w-full"
        />
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

        <TagGroups
          tags={tagsDoLivro}
          allTags={allTags}
          onClick={(tag, e) => onSearchTag?.(tag.id, e.ctrlKey || e.metaKey)}
          onContextMenu={(tag, e) =>
            setMenu({ tag, x: e.clientX, y: e.clientY })
          }
          onRemove={(tag) => onRemoveTag(livro.id, tag.id)}
        />

        <Sequencia
          rotuloItem="livro"
          variante="livro"
          atualId={livro.id}
          itens={todosLivros}
          getAnteriorId={anteriorDoLivro}
          getMiniaturaKey={miniaturaDoLivro}
          proporcao="aspect-[3/4]"
          onDefinirAnterior={onSetPrevious}
          onAbrir={onOpenRelated}
        />

        <InfoLista
          itens={[
            {
              rotulo: "Páginas",
              valor: String(livro.pageCount),
            },
            { rotulo: "Criado em", valor: livro.createdAt.toLocaleString("pt-BR") },
            { rotulo: "Modificado em", valor: livro.modifiedAt.toLocaleString("pt-BR") },
            {
              rotulo: "Adicionado por",
              valor: livro.createdBy ? adicionadoPor ?? "Usuário" : "—",
            },
          ]}
        />

        <AdicionarTagBar
          resetKey={livro.id}
          tagIdsAtuais={livro.tagIds}
          allTags={allTags}
          onAddTag={(nome) => onAddTag(livro.id, nome)}
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
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setTagEditando(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col animate-pop rounded-xl border border-border bg-base text-white shadow-xl"
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