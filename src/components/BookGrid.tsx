import { useEffect, useRef, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";
import type { filaLivros } from "../lib/fIlaLivros";
import BookInfo from "./BookInfo";
import BookReader from "./BookReader";
import BookQueue from "./BookQueue";
import TagSearch from "./TagSearch";
import CapaLivro from "./CapaLivro";
import { FaBook, FaCheck, FaTimes } from "react-icons/fa";
import type { PedidoAleatorio } from "../lib/aleatorio";
type BookGridProps = {
  livros: Book[];
  todosLivros: Book[];
  fila: filaLivros;
  onSearchTag?: (tagId: string, excluir: boolean) => void;
  allTags: tags[];
  onAddTag: (livroId: string, nomeTag: string) => void;
  onAddTagToMany: (livroIds: string[], nomeTag: string) => void;
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
  onCreateCategory: (nome: string, categoriaId?: string | null) => Promise<tags | null>;
  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
  onDeleteBooks: (livros: Book[]) => void;
  onSetPrevious: (livroId: string, anteriorId: string | null) => void;
  pedidoAleatorio: PedidoAleatorio | null;
  onCopyTags: (livroId: string) => void;
  onPasteTags: (livroIds: string[]) => void;
  copiedTagCount: number;
};

function BookCard({
  livro,
  selecionado,
  onSelect,
  onOpen,
  onContextMenu,
}: {
  livro: Book;
  selecionado: boolean;
  onSelect: (livro: Book, e: React.MouseEvent) => void;
  onOpen: (livro: Book) => void;
  onContextMenu: (livro: Book, e: React.MouseEvent) => void;
}) {
  return (
    <div className="min-w-0">
      <div
        data-book-card
        data-book-id={livro.id}
        onClick={(e) => onSelect(livro, e)}
        onDoubleClick={() => onOpen(livro)}
        onContextMenu={(e) => onContextMenu(livro, e)}
        className={`relative aspect-[3/4] cursor-pointer rounded-l-sm rounded-r-lg transition duration-150 ${
          selecionado
            ? "outline outline-4 outline-offset-2 outline-botao-claro"
            : "hover:brightness-110"
        }`}
      >
        <CapaLivro
          chave={livro.coverThumbnailR2Key}
          titulo={livro.name}
          className="h-full w-full"
        >
          {selecionado && (
            <span className="absolute left-3 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-botao-claro text-fundo shadow">
              <FaCheck className="h-3 w-3" />
            </span>
          )}

          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
            {livro.pageCount} {livro.pageCount === 1 ? "página" : "páginas"}
          </span>
        </CapaLivro>
      </div>

      <p
        title={livro.name}
        className="mt-2 truncate font-Alexandria font-[500] text-white"
      >
        {livro.name}
      </p>
    </div>
  );
}

function BookGrid({
  livros,
  todosLivros,
  fila,
  allTags,
  onSearchTag,
  onDeleteBooks,
  onAddTag,
  onAddTagToMany,
  onRemoveTag,
  onCustomizeTag,
  onCreateCategory,
  onChangeAutoTags,
  onSetPrevious,
  onCopyTags,
  onPasteTags,
  copiedTagCount,
  pedidoAleatorio,
  
}: BookGridProps) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [leitorId, setLeitorId] = useState<string | null>(null);
  const [lendoDaFila, setLendoDaFila] = useState(false);
  const [filaAberta, setFilaAberta] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [modal, setModal] = useState<"adicionar" | "remover" | null>(null);
  const ancoraRef = useRef<string | null>(null);
  const [leitorNoFim, setLeitorNoFim] = useState(false);
  const selecionado = todosLivros.find((l) => l.id === selecionadoId) ?? null;
  const ultimoPedido = useRef(pedidoAleatorio?.n ?? 0);
  const alvos = livros.filter((l) => selecionadas.has(l.id));

  const leitor = leitorId
  ? todosLivros.find((l) => l.id === leitorId) ?? null
  : null;
  const anteriorSeq = leitor?.previousBookId
  ? todosLivros.find((l) => l.id === leitor.previousBookId) ?? null
  : null;

  const proximaSeq = leitor
    ? todosLivros.find((l) => l.previousBookId === leitor.id) ?? null
    : null;

  function irParaSequencia(id: string) {
    setLeitorNoFim(false);
    setLeitorId(id);
    seguirSelecao(id);
  }
  useEffect(() => {
    if (!pedidoAleatorio || pedidoAleatorio.n === ultimoPedido.current) return;

    ultimoPedido.current = pedidoAleatorio.n;

    const alvo = livros.find((l) => l.id === pedidoAleatorio.id);

    if (!alvo) return;

    setMenu(null);
    setSelecionadas(new Set([alvo.id]));
    setSelecionadoId(alvo.id);
    ancoraRef.current = alvo.id;

    if (pedidoAleatorio.abrir) abrirLeitor(alvo.id, false);

    document
      .querySelector(`[data-book-id="${alvo.id}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [pedidoAleatorio]);

  useEffect(() => {
    if (leitorId && !leitor) setLeitorId(null);
  }, [leitorId, leitor]);

  useEffect(() => {
    if (fila.itens.length === 0) setFilaAberta(false);
  }, [fila.itens.length]);

  useEffect(() => {
    setSelecionadas((atuais) => {
      const idsValidos = new Set(livros.map((l) => l.id));
      const novas = new Set([...atuais].filter((id) => idsValidos.has(id)));
      return novas.size === atuais.size ? atuais : novas;
    });
  }, [livros]);

  function abrirRelacionado(id: string) {
    setMenu(null);
    setSelecionadas(new Set([id]));
    setSelecionadoId(id);
    ancoraRef.current = id;
  }

  function limparSelecao() {
    setSelecionadas(new Set());
    setSelecionadoId(null);
    ancoraRef.current = null;
    setMenu(null);
  }

  function clicarLivro(livro: Book, e: React.MouseEvent) {
    setMenu(null);

    const ctrl = e.ctrlKey || e.metaKey;

    if (e.shiftKey) {
      const ancora = ancoraRef.current ?? selecionadoId ?? livro.id;
      const a = livros.findIndex((l) => l.id === ancora);
      const b = livros.findIndex((l) => l.id === livro.id);
      const [ini, fim] = a < 0 ? [b, b] : [Math.min(a, b), Math.max(a, b)];
      const faixa = livros.slice(ini, fim + 1).map((l) => l.id);

      setSelecionadas((atuais) =>
        new Set(ctrl ? [...atuais, ...faixa] : faixa)
      );
      setSelecionadoId(livro.id);
      ancoraRef.current = ancora;
      return;
    }

    if (ctrl) {
      const novas = new Set(selecionadas);

      if (novas.size === 0 && selecionadoId) {
        novas.add(selecionadoId);
      }

      if (novas.has(livro.id)) {
        novas.delete(livro.id);
        setSelecionadas(novas);

        if (livro.id === selecionadoId) {
          setSelecionadoId([...novas].pop() ?? null);
        }
      } else {
        novas.add(livro.id);
        setSelecionadas(novas);
        setSelecionadoId(livro.id);
      }

      ancoraRef.current = livro.id;
      return;
    }

    setSelecionadas(new Set([livro.id]));
    setSelecionadoId(livro.id);
    ancoraRef.current = livro.id;
  }

  // A seleção só acompanha o leitor se o livro estiver visível na grade
  function seguirSelecao(id: string) {
    if (livros.some((l) => l.id === id)) setSelecionadoId(id);
  }

  function abrirLeitor(id: string, daFila: boolean) {
    setLeitorNoFim(false);
    setLeitorId(id);
    setLendoDaFila(daFila);
    seguirSelecao(id);
  }

  function abrir(livro: Book) {
    setSelecionadoId(livro.id);
    setSelecionadas(new Set([livro.id]));
    abrirLeitor(livro.id, false);
  }

  function abrirMenu(livro: Book, e: React.MouseEvent) {
    e.preventDefault();

    if (!selecionadas.has(livro.id)) {
      setSelecionadas(new Set([livro.id]));
      setSelecionadoId(livro.id);
      ancoraRef.current = livro.id;
    }

    setMenu({ x: e.clientX, y: e.clientY });
  }

  // Ordem dos cliques: o Set guarda na ordem em que os livros entraram
  function tocarAgora() {
    const alvo = fila.tocarAgora([...selecionadas]);

    setMenu(null);

    if (alvo) abrirLeitor(alvo, true);
  } 

  function excluirSelecionados() {
    const alvo = livros.filter((l) => selecionadas.has(l.id));

    setMenu(null);

    if (alvo.length > 0) onDeleteBooks(alvo);
  }

  function tocarDaFila(id: string) {
    fila.tocar(id);
    abrirLeitor(id, true);
  }

  function fimDoLivro() {
    setLeitorNoFim(false);
    if (lendoDaFila) {
      const proximoId = fila.proximo();

      if (proximoId) {
        setLeitorId(proximoId);
        seguirSelecao(proximoId);
      } else {
        setLeitorId(null);
      }

      return;
    }

    const posicao = livros.findIndex((l) => l.id === leitorId);
    const proximo = livros[posicao + 1];

    if (proximo) {
      setLeitorId(proximo.id);
      setSelecionadoId(proximo.id);
    } else {
      setLeitorId(null);
    }
  } 
function irParaLivro(delta: 1 | -1, noFim = false) {
  let id: string | null | undefined;

  if (lendoDaFila) {
    id = delta === 1 ? fila.proximo() : fila.anterior();
  } else {
    const posicao = livros.findIndex((l) => l.id === leitorId);

    if (posicao === -1) return;

    id = livros[posicao + delta]?.id;
  }

  if (!id) return;

  setLeitorNoFim(noFim);
  setLeitorId(id);
  seguirSelecao(id);
}

useEffect(() => {
  if (!leitorId) return;

  function aoTeclar(e: KeyboardEvent) {
    if (e.key !== "PageDown" && e.key !== "PageUp") return;

    e.preventDefault();
    e.stopPropagation();
    irParaLivro(e.key === "PageDown" ? 1 : -1);
  }

  window.addEventListener("keydown", aoTeclar, true);

  return () => window.removeEventListener("keydown", aoTeclar, true);
});

  useEffect(() => {
    function fecharMenu() {
      setMenu(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      const elemento = e.target as HTMLElement;
      const emCampo =
        elemento.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName);

      if (e.key === "Escape") {
        if (modal) {
          setModal(null);
          return;
        }
        if (menu) {
          setMenu(null);
          return;
        }
        if (emCampo || leitorId) return;
        if (filaAberta) {
          setFilaAberta(false);
          return;
        }
        if (document.querySelector("[data-painel-filtros]")) return;

        limparSelecao();
      }
      if (e.key === "Delete") {
        if (emCampo || leitorId || modal) return;
        if (document.querySelector("[data-painel-filtros]")) return;

        const alvo = livros.filter((l) => selecionadas.has(l.id));

        if (alvo.length === 0) return;

        e.preventDefault();
        setMenu(null);
        onDeleteBooks(alvo);
      }
    }

    window.addEventListener("click", fecharMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", fecharMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, menu, leitorId, filaAberta, livros, selecionadas, onDeleteBooks]);

  const quantidade = selecionadas.size;
  const sufixo = quantidade > 1 ? ` (${quantidade})` : "";

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-fundo p-5 pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onDoubleClick={(e) => {
          const alvo = e.target as HTMLElement;
          if (alvo.closest("[data-book-card], [data-painel-filtros]")) return;
          limparSelecao();
        }}
      >
        {livros.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <FaBook className="h-10 w-10 text-white/25" />
            <p className="font-Alexandria font-[700] text-white">Nenhum livro por aqui</p>
            <p className="max-w-64 text-sm text-gray-400">
              Crie um livro no botão "Criar livro" ou ajuste a busca e os filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {livros.map((livro) => (
              <BookCard
                key={livro.id}
                livro={livro}
                selecionado={selecionadas.has(livro.id)}
                onSelect={clicarLivro}
                onOpen={abrir}
                onContextMenu={abrirMenu}
              />
            ))}
          </div>
        )}
      </div>

      <BookInfo
        livro={selecionado}
        allTags={allTags}
        onOpen={() => selecionado && abrirLeitor(selecionado.id, false)}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onCustomizeTag={onCustomizeTag}
        onSearchTag={onSearchTag}
        onChangeAutoTags={onChangeAutoTags}
        onCreateCategory={onCreateCategory}
        todosLivros={todosLivros}
        onSetPrevious={onSetPrevious}
        onOpenRelated={abrirRelacionado}
      />

      {leitor && (
        <BookReader
          key={leitor.id}
          livro={leitor}
          onClose={() => setLeitorId(null)}
          onFimDoLivro={fimDoLivro}
          onLivroAnterior={() => irParaLivro(-1, false)}
          comecarNoFim={leitorNoFim}
          sequenciaAnterior={anteriorSeq && { id: anteriorSeq.id, nome: anteriorSeq.name }}
          sequenciaProxima={proximaSeq && { id: proximaSeq.id, nome: proximaSeq.name }}
          onIrParaSequencia={irParaSequencia}
        />
      )}

      <BookQueue
        itens={fila.itens}
        atualId={fila.atualId}
        aberto={filaAberta}
        onToggle={() => setFilaAberta((a) => !a)}
        onFecharPainel={() => setFilaAberta(false)}
        onTocar={tocarDaFila}
        onRemover={fila.remover}
        onMover={fila.moverItem}
        onEmbaralhar={fila.embaralhar}
        onEncerrar={() => {
          fila.encerrar();
          setFilaAberta(false);
          setLendoDaFila(false);
        }}
      />

      {menu && (
        <div
          className="fixed z-50 min-w-48 rounded-md bg-base p-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={tocarAgora}
          >
            Tocar agora{sufixo}
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={() => {
              fila.adicionarAposAtual([...selecionadas]);
              setMenu(null);
            }}
          >
            Tocar a seguir{sufixo}
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={() => {
              fila.adicionarAoFim([...selecionadas]);
              setMenu(null);
            }}
          >
            Adicionar ao fim da fila{sufixo}
          </button>

          <div className="my-1 border-t border-border" />

          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={() => {
              setMenu(null);
              setModal("adicionar");
            }}
          >
            Adicionar tag em {quantidade} {quantidade === 1 ? "livro" : "livros"}
          </button>
          <button
            className="w-full rounded px-3 py-2 text-left text-red-400 hover:bg-botao"
            onClick={excluirSelecionados}
          >
            Excluir {quantidade === 1 ? "livro" : `${quantidade} livros`}
          </button>
          {quantidade === 1 && (alvos[0]?.tagIds.length ?? 0) > 0 && (
          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={() => {
              setMenu(null);
              onCopyTags(alvos[0].id);
            }}
          >
            Copiar tags
          </button>
        )}

        {copiedTagCount > 0 && (
          <button
            className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
            onClick={() => {
              setMenu(null);
              onPasteTags(alvos.map((l) => l.id));
            }}
          >
            Colar {copiedTagCount} {copiedTagCount === 1 ? "tag" : "tags"}
            {quantidade > 1 ? ` em ${quantidade}` : ""}
          </button>
        )}
       </div>
      )}

      {modal && (
        <div
          data-painel-filtros
          className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md animate-pop rounded-xl bg-base p-5 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-Alexandria">
                {modal === "adicionar" ? "Adicionar tag" : "Remover tag"}
                {" em "}
                {quantidade} {quantidade === 1 ? "livro" : "livros"}
              </h2>
              <button onClick={() => setModal(null)} className="hover:opacity-60">
                <FaTimes />
              </button>
            </div>

            {modal === "adicionar" && (
              <>
                <TagSearch
                  allTags={allTags}
                  autoFocus
                  alturaMax="max-h-40"
                  placeholder="Digite uma tag e tecle Enter..."
                  onPick={(tag) => {
                    onAddTagToMany([...selecionadas], tag.name);
                    setModal(null);
                  }}
                  onCreate={(nome) => {
                    onAddTagToMany([...selecionadas], nome);
                    setModal(null);
                  }}
                  onEscape={() => setModal(null)}
                />

                <p className="mt-3 text-xs text-gray-300">
                  Se a tag não existir, ela será criada.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookGrid;