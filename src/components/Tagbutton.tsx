import { useEffect, useState } from "react";
import { Media } from "./types/media";

interface MediaTagsProps {
  media: Media;
}

function Tagbutton({ media }: MediaTagsProps) {
    const [criarTagUwU, setCriarTagUwU] = useState(false);
    const [tagNoime, setTagNoime] = useState("");
    
    useEffect(() => {
    setCriarTagUwU(false);
    setTagNoime("");
    }, [media.id]);

    return (
        <div>
            {criarTagUwU ? (
                <input className="bg-botao text-white py-1 flex position: fixed bottom-0 w-1/4 font-Alexandria font-[500]
            items-center gap-1 justify-center overflow-hidden focus:outline-none pl-2"
                    autoFocus
                    value={tagNoime}
                    onChange={(e) => setTagNoime(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        setCriarTagUwU(false);
                        setTagNoime("");
                        // criar tag
                    }
                    }}
                />
                ) : (
            <button onClick={() => setCriarTagUwU(true)}
            className="bg-botao text-white py-1 flex position: fixed bottom-0 w-1/4 font-Alexandria font-[500]
            items-center gap-1 justify-center overflow-hidden">
                Adicionar Tag
            </button>
                )}
        </div>
    );
}

export default Tagbutton;