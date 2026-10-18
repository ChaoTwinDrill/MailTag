import { useEffect, useState } from "react";
import type { Media } from "./types/media";

interface TagbuttonProps {
  media: Media;
  onAddTag: (mediaId: string, nomeTag: string) => void;
}

function Tagbutton({ media, onAddTag }: TagbuttonProps) {
  const [criarTagUwU, setCriarTagUwU] = useState(false);
  const [tagNoime, setTagNoime] = useState("");

  useEffect(() => {
    setCriarTagUwU(false);
    setTagNoime("");
  }, [media.id]);

  function confirmarTag() {
    const nome = tagNoime.trim();

    if (!nome) return;

    onAddTag(media.id, nome);

    setTagNoime("");
    setCriarTagUwU(false);
  }
        useEffect(() => {
        function lidarComTecla(e: KeyboardEvent) {
            if (e.key === "Enter" && !criarTagUwU) {
            setTagNoime("");
            setCriarTagUwU(true);
            }
        }
        window.addEventListener("keydown", lidarComTecla);
        return () => {
            window.removeEventListener("keydown", lidarComTecla);
        };
        }, [criarTagUwU]);
        
  return (
    <div>
      {criarTagUwU ? (
        <input
          className="bg-botao text-white py-1 fixed bottom-0 w-1/4 font-Alexandria font-[500] pl-2 focus:outline-none"
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