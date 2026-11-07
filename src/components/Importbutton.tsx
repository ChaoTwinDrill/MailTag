
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile, stat, size } from "@tauri-apps/plugin-fs";
import { FaRegPlusSquare } from "react-icons/fa";
import type { Media } from "./types/media";

import { LIBRARY_ID } from "../lib/library";
import { supabase } from "../lib/supabase";

type ImportButtonProps = {
  onImport: (medias: Media[]) => void;
};

const WORKER_URL = "https://mailtag-api.oririkkj.workers.dev";

const tiposMime: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

function criarBlob(conteudo: Uint8Array, mimeType: string) {
  const buffer = conteudo.buffer.slice(
    conteudo.byteOffset,
    conteudo.byteOffset + conteudo.byteLength
  ) as ArrayBuffer;

  return new Blob([buffer], { type: mimeType });
}

function canvasParaWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível gerar a miniatura."));
      },
      "image/webp",
      0.85
    );
  });
}

function calcularDimensoes(width: number, height: number) {
  const escala = Math.min(1, 400 / width, 400 / height);

  return {
    width: Math.round(width * escala),
    height: Math.round(height * escala),
  };
}

async function gerarMiniaturaImagem(original: Blob): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  const imagem = await createImageBitmap(original);

  try {
    const width = imagem.width;
    const height = imagem.height;

    const dimensoes = calcularDimensoes(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = dimensoes.width;
    canvas.height = dimensoes.height;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("Não foi possível criar o canvas.");
    }

    contexto.drawImage(
      imagem,
      0,
      0,
      dimensoes.width,
      dimensoes.height
    );

    const blob = await canvasParaWebp(canvas);

    return { blob, width, height };
  } finally {
    imagem.close();
  }
}

async function gerarMiniaturaVideo(src: string): Promise<Blob> {
  const video = document.createElement("video");

  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = src;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(
        new Error("Não foi possível ler o vídeo.")
      );
    });

    const tempo = Number.isFinite(video.duration)
      ? Math.min(0.5, video.duration / 2)
      : 0;

    if (tempo > 0) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(
          new Error("Não foi possível selecionar um quadro do vídeo.")
        );
        video.currentTime = tempo;
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(
          new Error("Não foi possível carregar o vídeo.")
        );
      });
    }

    const dimensoes = calcularDimensoes(
      video.videoWidth,
      video.videoHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = dimensoes.width;
    canvas.height = dimensoes.height;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("Não foi possível criar o canvas.");
    }

    contexto.drawImage(
      video,
      0,
      0,
      dimensoes.width,
      dimensoes.height
    );

    return await canvasParaWebp(canvas);
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

function ImportButton({ onImport }: ImportButtonProps) {
  async function ImportUwU() {
    const arquivos = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Imagens",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif"],
        },
        {
          name: "Vídeos",
          extensions: ["mp4", "webm", "mov", "mkv"],
        },
        {
          name: "Todos os arquivos",
          extensions: [
            "png", "jpg", "jpeg", "gif", "webp", "avif",
            "mp4", "webm", "mov", "mkv",
          ],
        },
      ],
    });

    if (!arquivos) return;

    const { data: sessaoData, error: erroSessao } =
      await supabase.auth.getSession();

      

    if (erroSessao || !sessaoData.session) {
      alert("Você precisa estar logado para importar mídias.");
      return;
    }

const token = sessaoData.session.access_token;
const novasMidias: Media[] = [];
    
    for (const arquivo of arquivos) {
      console.time("Importação total");




      try {
        const nome = arquivo.split(/[\\/]/).pop() ?? "Imagem";
        const extensao = nome.split(".").pop()?.toLowerCase() ?? "";
        const mimeType = tiposMime[extensao];

        if (!mimeType) {
          throw new Error(`Formato não suportado: ${extensao}`);
        }

        const [tamanho, informacoes] = await Promise.all([
          size(arquivo),
          stat(arquivo),
        ]);
        const src = convertFileSrc(arquivo);


        console.time("Leitura do arquivo");
        const conteudo = await readFile(arquivo);
        console.timeEnd("Leitura do arquivo");



        const originalBlob = criarBlob(conteudo, mimeType);

        let width: number | null = null;
        let height: number | null = null;

        let miniaturaBlob: Blob;



        console.time("Criação da miniatura");
        // Coloque aqui a geração da miniatur



        if (mimeType.startsWith("image/")) {
          const miniatura = await gerarMiniaturaImagem(originalBlob);

          width = miniatura.width;
          height = miniatura.height;
          miniaturaBlob = miniatura.blob;
      } else {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.src = src;

          const resolucao = await new Promise<{
            width: number;
            height: number;
          }>((resolve, reject) => {
            video.onloadedmetadata = () => resolve({
              width: video.videoWidth,
              height: video.videoHeight,
            });
            video.onerror = () => reject(
              new Error("Não foi possível ler a resolução do vídeo.")
            );
          });

          width = resolucao.width;
          height = resolucao.height;

          video.removeAttribute("src");
          video.load();

          miniaturaBlob = await gerarMiniaturaVideo(src);


          console.timeEnd("Criação da miniatura");



        }

        // Preparar os dois arquivos
        const dados = new FormData();

        dados.append(
          "original",
          new File([originalBlob], nome, { type: mimeType })
        );

        dados.append(
          "thumbnail",
          new File([miniaturaBlob], "thumbnail.webp", {
            type: "image/webp",
          })
        );

        dados.append("fileName", nome);


        console.time("Upload R2");


        // Enviar original e miniatura ao Worker
        const resposta = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Library-Id": LIBRARY_ID,
          },
          body: dados,
        });
        
        const resultado = await resposta.json();
        console.log("Tempos do Worker:", resultado.tempos);

        console.timeEnd("Upload R2");

        if (!resposta.ok) {
          throw new Error(resultado.error || "Falha no upload.");
        }

        const id = crypto.randomUUID();

        const criadaEm = informacoes.birthtime
          ? new Date(informacoes.birthtime)
          : new Date();

        const modificadaEm = informacoes.mtime
          ? new Date(informacoes.mtime)
          : new Date();

        console.time("Banco Supabase");

        // Salvar os caminhos no Supabase
        const { error: erroBanco } = await supabase
          .from("medias")
          .insert({
            id,
            library_id: LIBRARY_ID,
            name: nome,
            r2_key: resultado.key,
            thumbnail_r2_key: resultado.thumbnailKey,
            mime_type: mimeType,
            size_bytes: tamanho,
            width,
            height,
            file_created_at: criadaEm.toISOString(),
            file_modified_at: modificadaEm.toISOString(),
          });

          console.timeEnd("Banco Supabase");

        if (erroBanco) {
          console.error("Erro ao salvar mídia:", erroBanco);
          throw new Error(
            "Arquivos enviados, mas não foram registrados no banco."
          );
        }

        novasMidias.push({
          id,
          libraryId: LIBRARY_ID,
          name: nome,
          src,
          thumbnailSrc: URL.createObjectURL(miniaturaBlob),
          r2Key: resultado.key,
          thumbnailR2Key: resultado.thumbnailKey,
          mimeType,
          size: tamanho,
          extension: extensao,
          createdAt: criadaEm,
          modifiedAt: modificadaEm,
          width,
          height,
          tags: [],
        });

        console.timeEnd("Importação total");

      } catch (erro) {
        console.error(`Erro ao importar ${arquivo}:`, erro);
      }
    }

    if (novasMidias.length > 0) {
      onImport(novasMidias);
    }

    if (novasMidias.length < arquivos.length) {
      alert(
        `${novasMidias.length} de ${arquivos.length} arquivos importados. Confira o console para ver os erros.`
      );
    }
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