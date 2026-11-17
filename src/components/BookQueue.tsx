import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FaGripVertical,
  FaListUl,
  FaPlay,
  FaRandom,
  FaTimes,
} from "react-icons/fa";
import type { Book } from "./types/book";
import CapaLivro from "./CapaLivro";

type BookQueueProps = {
  itens: Book[];
  atualId: string | null;
  aberto: boolean;
  onToggle: () => void;
  onFecharPainel: () => void;
  onTocar: (id: string) => void;
  onRemover: (id: string) => void;
  onMover: (de: number, para: number) => void;
  onEmbaralhar: () => void;
  onEncerrar: () => void;
};

function BookQueue({
  itens,
  atualId,
  aberto,
  onToggle,
  onFecharPainel,
  onTocar,
  onRemover,
  onMover,
  onEmbaralhar,
  onEncerrar,
}: BookQueueProps) {
  const listaRef = useRef<HTMLUListElement>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);

  // Ao abrir (ou trocar de livro), mostra o que está tocando
  useEffect(() => {
    if (!aberto) return;

    listaRef.current
      ?.querySelector("[data-fila-atual]")
      ?.scrollIntoView({ block: "nearest" });
  }, [aberto, atualId]);

  if (itens.length === 0) return null;

  const indiceAtual = atualId ? itens.findIndex((l) => l.id === atualId) : -1;
  const totalPaginas = itens.reduce((soma, l) => soma + l.pageCount, 0);

  function cabecalhoDe(i: number): string | null {
    if (indiceAtual === -1) return i === 0 ? "Na fila" : null;
    if (i === 0 && indiceAtual > 0) return "Já tocados";
    if (i === indiceAtual) return "Tocando agora";
    if (i === indiceAtual + 1) return "A seguir";

    return null;
  }

  // Reordenação com o ponteiro (o arrastar nativo do navegador
  // é bloqueado pelo Tauri no Windows)
  function iniciarArraste(e: ReactPointerEvent, indice: number) {
    e.preventDefault();

    let alvo = indice;

    setArrastando(indice);
    setSobre(indice);

    function aoMover(ev: PointerEvent) {
      const elementos =
        listaRef.current?.querySelectorAll<HTMLElement>("[data-fila-item]");

      elementos?.forEach((el, i) => {
        const caixa = el.getBoundingClientRect();

        if (ev.clientY >= caixa.top && ev.clientY <= caixa.bottom) alvo = i;
      });

      setSobre(alvo);
    }

    function aoSoltar() {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);

      setArrastando(null);
      setSobre(null);

      if (alvo !== indice) onMover(indice, alvo);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
  }

  function encerrar() {
    if (
      itens.length > 1 &&
      !window.confirm(`Encerrar a fila e remover os ${itens.length} livros dela?`)
    ) {
      return;
    }

    onEncerrar();
  }

  return (
    <>
      {aberto && (
        <div
          className="fixed bottom-20 left-4 z-[60] flex max-h-[70vh] w-80 origin-bottom-left animate-pop flex-col rounded-xl bg-base text-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 p-3 pb-2">
            <div>
              <h2 className="font-Alexandria font-[700]">Fila de reprodução</h2>
              <p className="text-xs text-gray-300">
                {itens.length} {itens.length === 1 ? "livro" : "livros"} ·{" "}
                {totalPaginas.toLocaleString("pt-BR")}{" "}
                {totalPaginas === 1 ? "página" : "páginas"}
              </p>
            </div>

            <button
              type="button"
              title="Fechar painel"
              onClick={onFecharPainel}
              className="hover:opacity-60"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex gap-2 px-3 pb-2">
            <button
              type="button"
              onClick={onEmbaralhar}
              title="Embaralha os livros depois do atual"
              className="flex items-center gap-2 rounded-md bg-botao px-3 py-1.5 text-sm transition hover:brightness-110"
            >
              <FaRandom />
              Embaralhar
            </button>

            <button
              type="button"
              onClick={encerrar}
              title="Esvazia e fecha a fila"
              className="rounded-md bg-botao px-3 py-1.5 text-sm text-red-400 transition hover:brightness-110"
            >
              Encerrar fila
            </button>
          </div>

          <ul
            ref={listaRef}
            className="flex-1 select-none space-y-1.5 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {itens.map((livro, i) => {
              const atual = livro.id === atualId;
              const jaTocado = indiceAtual !== -1 && i < indiceAtual;
              const alvoDoArraste =
                arrastando !== null && sobre === i && arrastando !== i;
              const cabecalho = cabecalhoDe(i);

              const marcador = alvoDoArraste
                ? (sobre ?? 0) > (arrastando ?? 0)
                  ? "shadow-[0_3px_0_0_var(--color-botao-claro)]"
                  : "shadow-[0_-3px_0_0_var(--color-botao-claro)]"
                : "";

              return (
                <Fragment key={livro.id}>
                  {cabecalho && (
                    <li className="px-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      {cabecalho}
                    </li>
                  )}

                  <li
                    data-fila-item
                    {...(atual ? { "data-fila-atual": "" } : {})}
                    className={`flex items-center gap-2 rounded-md p-1.5 transition ${
                      atual
                        ? "bg-botao-claro/15 outline outline-2 outline-botao-claro"
                        : "bg-fundo hover:bg-botao"
                    } ${jaTocado ? "opacity-60 hover:opacity-100" : ""} ${
                      arrastando === i ? "opacity-40" : ""
                    } ${marcador}`}
                  >
                    <span
                      title="Arrastar para reordenar"
                      onPointerDown={(e) => iniciarArraste(e, i)}
                      className="cursor-grab touch-none px-1 text-gray-300"
                    >
                      <FaGripVertical />
                    </span>

                    <button
                      type="button"
                      onClick={() => onTocar(livro.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <CapaLivro
                        chave={livro.coverThumbnailR2Key}
                        titulo={livro.name}
                        className="h-16 w-12 shrink-0"
                      />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {livro.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-300">
                          {atual && (
                            <FaPlay className="h-2.5 w-2.5 text-botao-claro" />
                          )}
                          {livro.pageCount}{" "}
                          {livro.pageCount === 1 ? "página" : "páginas"}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      title="Remover da fila"
                      onClick={() => onRemover(livro.id)}
                      className="px-1 text-gray-300 transition hover:text-white"
                    >
                      <FaTimes />
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        title="Fila de reprodução"
        aria-pressed={aberto}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`fixed bottom-4 left-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition hover:brightness-125 ${
          aberto ? "bg-botao-claro text-fundo" : "bg-botao"
        }`}
      >
        <FaListUl className="h-5 w-5" />

        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-botao-claro px-1 text-xs font-bold text-fundo ring-2 ring-fundo">
          {itens.length}
        </span>
      </button>
    </>
  );
}

export default BookQueue;