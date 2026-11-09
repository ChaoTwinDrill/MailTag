import { useEffect, useState } from "react";
import type { Book } from "./types/book";
import type { tags } from "./types/tag";

interface BookTagbuttonProps {
  livro: Book;
  allTags: tags[];
  onAddTag: (livroId: string, nomeTag: string) => void;
}

function BookTagbutton({ livro, allTags, onAddTag }: BookTagbuttonProps) {
  const [criarTagUwU, setCriarTagUwU] = useState(false);
  const [tagNoime, setTagNoime] = useState("");

  useEffect(() => {
    setCriarTagUwU(false);
    setTagNoime("");
  }, [livro.id]);

  const sugestoes = allTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagNoime.trim().toLowerCase()) &&
      tagNoime.trim() !== "" &&
      !livro.tagIds.includes(tag.id)
  );

  function selecionarTag(tag: tags) {
    onAddTag(livro.id, tag.name);
    setTagNoime("");
    setCriarTagUwU(false);
  }

  function confirmarTag() {
    const nome = tagNoime.trim();

    if (!nome) return;

    const existente = allTags.find(
      (tag) => tag.name.toLowerCase() === nome.toLowerCase()
    );

    if (existente) {
      selecionarTag(existente);
      return;
    }

    onAddTag(livro.id, nome);
    setTagNoime("");
    setCriarTagUwU(false);
  }

  useEffect(() => {
    function lidarComTecla(e: KeyboardEvent) {
      if (e.key !== "Enter" || criarTagUwU) return;

      if (document.querySelector("[data-painel-filtros]")) return;

      const elemento = e.target as HTMLElement;

      if (
        elemento.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(elemento.tagName)
      ) {
        return;
      }

      setTagNoime("");
      setCriarTagUwU(true);
    }

    window.addEventListener("keydown", lidarComTecla);

    return () => window.removeEventListener("keydown", lidarComTecla);
  }, [criarTagUwU]);

  return (
  <>
    {criarTagUwU && sugestoes.length > 0 && (
      <div className="fixed bottom-8 left-3/4 z-40 max-h-40 w-1/4 overflow-y-auto bg-gradient-to-t from-fundo/60 to-fundo/10 p-2">
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((tag) => (
            <button
              key={tag.id}
              title={tag.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionarTag(tag)}
              className="min-w-10 h-10 shrink-0 rounded-lg border border-border px-2 flex items-center justify-center hover:brightness-125 transition"
              style={{
                backgroundColor: tag.color ?? "#8B8899",
                color: tag.textColor ?? "#ffffff",
              }}
            >
              <span className="text-xs font-bold whitespace-nowrap">
                {tag.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    )}

    {criarTagUwU ? (
      <div className="fixed bottom-0 left-3/4 z-50 w-1/4">
        <input
          className="w-full bg-botao py-1 pl-2 font-Alexandria font-[500] text-white focus:outline-none"
          autoFocus
          autoComplete="off"
          placeholder="Digite uma tag..."
          value={tagNoime}
          onChange={(e) => setTagNoime(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmarTag();
            if (e.key === "Escape") {
              setCriarTagUwU(false);
              setTagNoime("");
            }
          }}
        />
      </div>
    ) : (
      <button
        onClick={() => {
          setTagNoime("");
          setCriarTagUwU(true);
        }}
        className="fixed bottom-0 left-3/4 z-50 flex w-1/4 items-center justify-center bg-botao py-1 font-Alexandria font-[500] text-white"
      >
        Adicionar Tag
      </button>
    )}
  </>
);
}

export default BookTagbutton;
