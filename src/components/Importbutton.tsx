import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FaRegPlusSquare } from "react-icons/fa";
import type { Media } from "./types/media";
import { stat, size } from "@tauri-apps/plugin-fs";

type ImportButtonProps = {
  onImport: (medias: Media[]) => void;
};

function obterResolucao(src: string): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();

    imagem.onload = () => {
      resolve({
        width: imagem.naturalWidth,
        height: imagem.naturalHeight,
      });
    };

    imagem.onerror = reject;
    imagem.src = src;
  });
}

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
        },
        {
          name: "Animados",
          extensions: [
            "mp4", 
            "webm", 
            "mov", 
            "avi", 
            "gif"
          ]
        },
        {
          name: "Todos os arquivos",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "avif",
            "mp4", 
            "webm", 
            "mov", 
            "avi"
          ]  
        }
      ]
    });

    if (!arquivos) {
      return;
    }

    const novasMidias: Media[] = await Promise.all(
      arquivos.map(async (arquivo) => {

        const nome = arquivo.split(/[\\\/]/).pop() ?? "Imagem";
        const tamanho = await size(arquivo);
        const extensao = nome.split(".").pop();
        const informacoes = await stat(arquivo);
        const src = convertFileSrc(arquivo);
        const resolucao = await obterResolucao(src);
        return {
          id: crypto.randomUUID(),
          name: nome,
          src: convertFileSrc(arquivo),
          size: tamanho,
          extension: extensao,
          createdAt: informacoes.birthtime ? new Date(informacoes.birthtime) : new Date(),
          modifiedAt: informacoes.mtime ? new Date(informacoes.mtime) : new Date(),
          width: resolucao.width,
          height: resolucao.height,
          tags: []
        };
      })
    );

    onImport(novasMidias);
  }

  return (
    <button
      onClick={ImportUwU}
      className="px-3 py-2 bg-botao rounded-lg
      text-white transition-colors focus:outline-3 hover:bg-botao/80
      focus:outline-offset-2 focus:outline-botao flex items-center
      gap-1 font-Alexandria font-[500]"
    >
      <FaRegPlusSquare className="text-lg" />
      IMPORTAR
    </button>
  );
}

export default ImportButton;