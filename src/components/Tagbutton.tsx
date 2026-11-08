import { useEffect, useState } from "react";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";

interface TagbuttonProps {
  media: Media;
  allTags: tags[];
  onAddTag: (mediaId: string, nomeTag: string) => void;
}

function Tagbutton({ media, allTags, onAddTag }: TagbuttonProps) {
  const [criarTagUwU, setCriarTagUwU] = useState(false);
  const [tagNoime, setTagNoime] = useState("");

  useEffect(() => {
    setCriarTagUwU(false);
    setTagNoime("");
  }, [media.id]);

  const sugestoes = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagNoime.trim().toLowerCase()) &&
    tagNoime.trim() !== "" &&
    !media.tags.some((t) => t.id === tag.id)
  );

  function selecionarTag(tag: tags) {
    onAddTag(media.id, tag.name);
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

    onAddTag(media.id, nome);
    setTagNoime("");
    setCriarTagUwU(false);
  }

  useEffect(() => {
    function lidarComTecla(e: KeyboardEvent) {
      if (e.key !== "Enter" || criarTagUwU) return;

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
    <div>
      {criarTagUwU ? (
        <div className="fixed bottom-0 w-1/4">
         {sugestoes.length > 0 && (
          <div className="bg-gradient-to-t from-fundo/60 to-fundo/10 p-2 max-h-40 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((tag) => (
                <button
                  key={tag.id}
                  title={tag.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarTag(tag)}
                  className="min-w-10 h-10 px-2 shrink-0 rounded-lg flex items-center justify-center
                            border border-border hover:brightness-125 transition"
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

          <input
            className="bg-botao text-white py-1 w-full font-Alexandria font-[500] pl-2 focus:outline-none"
            autoFocus
            placeholder="Digite uma tag..."
            value={tagNoime}
            onChange={(e) => setTagNoime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmarTag();
              }

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
          className="bg-botao text-white py-1 fixed bottom-0 w-1/4 font-Alexandria font-[500] flex items-center justify-center"
        >
          Adicionar Tag
        </button>
      )}
    </div>
  );
}

export default Tagbutton;