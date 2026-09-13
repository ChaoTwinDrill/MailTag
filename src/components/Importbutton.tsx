import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FaRegPlusSquare } from "react-icons/fa";
import type { Media } from "./types/media";

type ImportButtonProps = {
  onImport: (medias: Media[]) => void;
};

function ImportButton({ onImport }: ImportButtonProps) {
  async function ImportUwU() {
    const arquivos = await open({
      multiple: true,
      directory: false,

      filters: [
        {
          name: "Mídias",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "avif"
          ]
        }
      ]
    });

    if (!arquivos) {
      return;
    }

    const novasMidias: Media[] = arquivos.map((arquivo) => {
      const nome =
        arquivo.split(/[\\/]/).pop() ?? "Imagem";

      return {
        id: crypto.randomUUID(),
        name: nome,
        src: convertFileSrc(arquivo),
      };
    });

    onImport(novasMidias);
  }

  return (
    <button
     onClick={ImportUwU}
      className="px-3 py-2 bg-botao rounded-lg
      text-white transition-colors focus:outline-3 hover:bg-botao/80 focus:outline-offset-2
      focus:outline-botao flex items-center gap-1 font-Alexandria font-[500]"
    >
      <FaRegPlusSquare className="text-lg" />
      IMPORTAR
    </button>
  );
}

export default ImportButton;