import { useEffect, useRef, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";
import type { filaLivros } from "../lib/fIlaLivros";
import { obterArquivoCacheado } from "../lib/cache";
import BookInfo from "./BookInfo";
import BookReader from "./BookReader";
import BookQueue from "./BookQueue";
import { FaTimes } from "react-icons/fa";

type BookGridProps = {
  livros: Book[];
  todosLivros: Book[];
  fila: filaLivros;
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
        data-book-card
        onClick={(e) => onSelect(livro, e)}
        onDoubleClick={() => onOpen(livro)}
        onContextMenu={(e) => onContextMenu(livro, e)}
        className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg bg-card ${
          selecionado ? "outline outline-4 outline-purple-200 brightness-75" : ""
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
  todosLivros,
  fila,
  allTags,
  onAddTag,
  onAddTagToMany,
  onRemoveTag,
  onCustomizeTag,
  onCreateCategory,
  onChangeAutoTags,
}: BookGridProps) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [leitorId, setLeitorId] = useState<string | null>(null);
  const [lendoDaFila, setLendoDaFila] = useState(false);
  const [filaAberta, setFilaAberta] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [modal, setModal] = useState<"adicionar" | "remover" | null>(null);
  const ancoraRef = useRef<string | null>(null);

  const selecionado = livros.find((l) => l.id === selecionadoId) ?? null;

  // O livro do leitor vem da lista completa, para não sumir com os filtros
  const leitor = leitorId
    ? todosLivros.find((l) => l.id === leitorId) ?? null
    : null;

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

  function tocarDaFila(id: string) {
    fila.tocar(id);
    abrirLeitor(id, true);
  }

  function fimDoLivro() {
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
    }

    window.addEventListener("click", fecharMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", fecharMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, menu, leitorId, filaAberta]);

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
          <p className="py-10 text-center text-gray-400">Nenhum livro por aqui.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
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
        onChangeAutoTags={onChangeAutoTags}
        onCreateCategory={onCreateCategory}
      />

      {leitor && (
        <BookReader
          key={leitor.id}
          livro={leitor}
          onClose={() => setLeitorId(null)}
          onFimDoLivro={fimDoLivro}
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
        </div>
      )}

      {modal && (
        <div
          data-painel-filtros
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-base p-5 text-white"
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
              <AddBookTag
                allTags={allTags}
                onConfirm={(nome) => {
                  onAddTagToMany([...selecionadas], nome);
                  setModal(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddBookTag({
  allTags,
  onConfirm,
}: {
  allTags: tags[];
  onConfirm: (nome: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const busca = texto.trim().toLowerCase();

  const sugestoes = busca
    ? allTags.filter((t) => t.name.toLowerCase().includes(busca)).slice(0, 20)
    : [];

  function confirmar(nome = texto) {
    if (nome.trim()) onConfirm(nome.trim());
  }

  return (
    <>
      <input
        autoFocus
        autoComplete="off"
        placeholder="Digite uma tag e tecle Enter..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
          }
        }}
        className="w-full rounded-md bg-fundo p-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-400"
      />

      {sugestoes.length > 0 && (
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {sugestoes.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => confirmar(tag.name)}
              className="rounded px-2 py-1 text-xs font-bold hover:brightness-125"
              style={{
                backgroundColor: tag.color ?? "#555",
                color: tag.textColor ?? "#fff",
                border: tag.hasBorder
                  ? `2px solid ${tag.borderColor ?? "#fff"}`
                  : "none",
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-300">
        Se a tag não existir, ela será criada.
      </p>
    </>
  );
}

export default BookGrid;