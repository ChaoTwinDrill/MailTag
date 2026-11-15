import { useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile, stat, size } from "@tauri-apps/plugin-fs";
import { FaRegPlusSquare } from "react-icons/fa";
import type { Media } from "./types/media";
import {adicionarTarefas, definirDestinoImportacao, type TarefaImportacao,} from "../lib/importacao";
import { LIBRARY_ID } from "../lib/library";
import { supabase } from "../lib/supabase";
import { copiarArquivoParaCache, salvarArquivoNoCache } from "../lib/cache";

type ImportButtonProps = {
  onImport: (medias: Media[]) => void;
};
export type DadosLivro = {
  book_id: string;
  book_role: "page" | "cover";
  page_position: number | null;
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

let sequencia = 0;

async function tokenAtual(): Promise<string | null> {
     const { data, error } = await supabase.auth.getSession();
     return error || !data.session ? null : data.session.access_token;
   }

    async function calcularHash(blob: Blob): Promise<string> {
      const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());

      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    // Hashes que estão sendo enviados agora: pega repetidos dentro do mesmo lote
    const hashesEmAndamento = new Set<string>();

    // Retorna a mídia igual, se existir. Se não existir, deixa o hash reservado.
    async function reservarHash(
      hash: string
    ): Promise<{ id: string; nome: string } | null> {
      if (hashesEmAndamento.has(hash)) {
        return { id: "", nome: "outro arquivo desta importação" };
      }

      hashesEmAndamento.add(hash);

      const { data, error } = await supabase
        .from("medias")
        .select("id, name")
        .eq("library_id", LIBRARY_ID)
        .eq("content_hash", hash)
        .is("book_id", null)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (error) {
        // Na dúvida, importa
        console.warn("Não foi possível verificar duplicadas:", error);
        return null;
      }

      if (data) {
        hashesEmAndamento.delete(hash);
        return { id: data.id, nome: data.name };
      }

      return null;
    }

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

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () =>
      reject(new Error("Não foi possível converter a miniatura."));
    leitor.readAsDataURL(blob);
  });
}

async function removerArquivosDoR2(
  token: string,
  key: string,
  thumbnailKey: string
) {
  try {
    const resposta = await fetch(WORKER_URL, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Library-Id": LIBRARY_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, thumbnailKey }),
    });

    if (!resposta.ok) {
      console.error("Falha ao limpar arquivos órfãos do R2:", key, thumbnailKey);
    }
  } catch (erro) {
    console.error("Erro ao limpar arquivos órfãos do R2:", erro);
  }
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

async function gerarMiniaturaVideo(src: string): Promise<{
  blob: Blob;
  width: number;
  height: number;
  duracao: number | null;
}> {
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

    // A resolução vem do mesmo elemento usado para a miniatura
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      throw new Error("Não foi possível ler a resolução do vídeo.");
    }
    const duracao = Number.isFinite(video.duration) ? video.duration : null;
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

    const dimensoes = calcularDimensoes(width, height);

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

    const blob = await canvasParaWebp(canvas);

    return { blob, width, height, duracao };
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}


const LIMITE_UPLOAD_BYTES = 95 * 1024 * 1024;

export type ResultadoImportacao =
  | { midia: Media }
  | {
      nome: string;
      erro: string;
      duplicadaDe?: { id: string; nome: string };
    };

async function lerArquivoComoBlob(
  caminho: string,
  src: string,
  mimeType: string
): Promise<Blob> {
  try {
    const resposta = await fetch(src);

    if (!resposta.ok) {
      throw new Error(`Status ${resposta.status}`);
    }

    const blob = await resposta.blob();

    return blob.slice(0, blob.size, mimeType);
  } catch (erro) {
    console.warn("Leitura via asset falhou, usando readFile:", erro);

    const conteudo = await readFile(caminho);

    return criarBlob(conteudo, mimeType);
  }
}

export async function executarComLimite<T, R>(
  itens: T[],
  limite: number,
  tarefa: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;

  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await tarefa(itens[indice], indice);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limite, itens.length) },
      trabalhador
    )
  );

  return resultados;
}

export async function importarArquivo(
  arquivo: string,
  rotulo: string,
  token: string,
  livro?: DadosLivro,
  opcoes?: { ignorarDuplicata?: boolean }
): Promise<ResultadoImportacao> {
  const etapa = (descricao: string) => `${rotulo} · ${descricao}`;

  const nome = arquivo.split(/[\\/]/).pop() ?? "Imagem";
  let hashReservado: string | null = null;

  console.time(etapa("Importação total"));

  try {
    const extensao = nome.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = tiposMime[extensao];

    if (!mimeType) {
      throw new Error(`Formato não suportado: ${extensao}`);
    }

    const [tamanho, informacoes] = await Promise.all([
      size(arquivo),
      stat(arquivo),
    ]);

    if (tamanho > LIMITE_UPLOAD_BYTES) {
      throw new Error(
        `Arquivo maior que o limite de upload (${Math.round(
          LIMITE_UPLOAD_BYTES / 1024 / 1024
        )} MB).`
      );
    }

    const src = convertFileSrc(arquivo);

    console.time(etapa("Leitura do arquivo"));
    const originalBlob = await lerArquivoComoBlob(arquivo, src, mimeType);
    console.timeEnd(etapa("Leitura do arquivo"));

    // Identificador do conteúdo, para achar duplicadas
    const hash = await calcularHash(originalBlob);

    // Páginas de livros não entram na checagem
    if (!livro && !opcoes?.ignorarDuplicata) {
      const duplicada = await reservarHash(hash);

      if (duplicada) {
        return {
          nome,
          erro: `Já existe na galeria: ${duplicada.nome}`,
          duplicadaDe: duplicada,
        };
      }

      hashReservado = hash;
    }

    let width: number | null = null;
    let height: number | null = null;
    let duracao: number | null = null;
    let miniaturaBlob: Blob;

    console.time(etapa("Criação da miniatura"));

    if (mimeType.startsWith("image/")) {
      const miniatura = await gerarMiniaturaImagem(originalBlob);

      width = miniatura.width;
      height = miniatura.height;
      miniaturaBlob = miniatura.blob;
    } else {
      // O vídeo precisa vir de um blob (mesma origem), senão o canvas
      // fica "contaminado" e não pode ser exportado
      const urlBlob = URL.createObjectURL(originalBlob);

      try {
        const miniatura = await gerarMiniaturaVideo(urlBlob);

        width = miniatura.width;
        height = miniatura.height;
        duracao = miniatura.duracao;
        miniaturaBlob = miniatura.blob;
      } finally {
        URL.revokeObjectURL(urlBlob);
      }
    }

    console.timeEnd(etapa("Criação da miniatura"));

    const dados = new FormData();

    dados.append("original", new File([originalBlob], nome, { type: mimeType }));
    dados.append(
      "thumbnail",
      new File([miniaturaBlob], "thumbnail.webp", { type: "image/webp" })
    );
    dados.append("fileName", nome);

    console.time(etapa("Upload R2"));

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

    console.timeEnd(etapa("Upload R2"));

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

    console.time(etapa("Banco Supabase"));

    const { error: erroBanco } = await supabase.from("medias").insert({
      id,
      library_id: LIBRARY_ID,
      name: nome,
      r2_key: resultado.key,
      thumbnail_r2_key: resultado.thumbnailKey,
      mime_type: mimeType,
      size_bytes: tamanho,
      width,
      height,
      content_hash: hash,
      duration_seconds: duracao,
      file_created_at: criadaEm.toISOString(),
      file_modified_at: modificadaEm.toISOString(),
      ...(livro ?? {}),
    });

    console.timeEnd(etapa("Banco Supabase"));

    if (erroBanco) {
      console.error("Erro ao salvar mídia:", erroBanco);

      await removerArquivosDoR2(token, resultado.key, resultado.thumbnailKey);

      throw new Error("Arquivos enviados, mas não foram registrados no banco.");
    }

    let thumbnailSrc: string;

    try {
      thumbnailSrc = await salvarArquivoNoCache(
        resultado.thumbnailKey,
        new Uint8Array(await miniaturaBlob.arrayBuffer())
      );
    } catch (erroCache) {
      console.error("Não foi possível salvar a miniatura no cache:", erroCache);
      thumbnailSrc = await blobParaDataUrl(miniaturaBlob);
    }

    let srcFinal = src;

    try {
      srcFinal = await copiarArquivoParaCache(resultado.key, arquivo);
    } catch (erroCache) {
      console.error("Não foi possível copiar o original para o cache:", erroCache);
    }

    const midia: Media = {
      id,
      libraryId: LIBRARY_ID,
      name: nome,
      src: srcFinal,
      thumbnailSrc,
      r2Key: resultado.key,
      thumbnailR2Key: resultado.thumbnailKey,
      mimeType,
      size: tamanho,
      extension: extensao,
      createdAt: criadaEm,
      modifiedAt: modificadaEm,
      width,
      height,
      durationSeconds: duracao,
      tags: [],
    };

    return { midia };
  } catch (erro) {
    console.error(`Erro ao importar ${arquivo}:`, erro);

    return {
      nome,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  } finally {
    if (hashReservado) hashesEmAndamento.delete(hashReservado);

    console.timeEnd(etapa("Importação total"));
  }
}

async function importarArquivoColado(
  arquivo: File,
  token: string,
  ignorarDuplicata = false
): Promise<ResultadoImportacao> {
  let nome = arquivo.name || "colada";
  let hashReservado: string | null = null;

  try {
    const mimeType = arquivo.type;
    const extensao = Object.keys(tiposMime).find(
      (ext) => tiposMime[ext] === mimeType
    );

    if (!extensao) {
      throw new Error(`Formato não suportado: ${mimeType || "desconhecido"}`);
    }

    // Capturas de tela costumam vir como "image.png"
    const generico = !arquivo.name || /^image\.\w+$/i.test(arquivo.name);

    if (generico) {
      const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
      nome = `colada-${carimbo}-${crypto.randomUUID().slice(0, 6)}.${extensao}`;
    }

    const tamanho = arquivo.size;

    if (tamanho > LIMITE_UPLOAD_BYTES) {
      throw new Error(
        `Arquivo maior que o limite de upload (${Math.round(
          LIMITE_UPLOAD_BYTES / 1024 / 1024
        )} MB).`
      );
    }

    const hash = await calcularHash(arquivo);

    if (!ignorarDuplicata) {
      const duplicada = await reservarHash(hash);

      if (duplicada) {
        return {
          nome,
          erro: `Já existe na galeria: ${duplicada.nome}`,
          duplicadaDe: duplicada,
        };
      }

      hashReservado = hash;
    }

    let miniatura: {
      blob: Blob;
      width: number;
      height: number;
      duracao: number | null;
    };

    if (mimeType.startsWith("image/")) {
      miniatura = { ...(await gerarMiniaturaImagem(arquivo)), duracao: null };
    } else {
      const url = URL.createObjectURL(arquivo);

      try {
        miniatura = await gerarMiniaturaVideo(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    const dados = new FormData();
    dados.append("original", new File([arquivo], nome, { type: mimeType }));
    dados.append(
      "thumbnail",
      new File([miniatura.blob], "thumbnail.webp", { type: "image/webp" })
    );
    dados.append("fileName", nome);

    const resposta = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Library-Id": LIBRARY_ID,
      },
      body: dados,
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.error || "Falha no upload.");
    }

    const id = crypto.randomUUID();
    const agora = new Date();

    const { error: erroBanco } = await supabase.from("medias").insert({
      id,
      library_id: LIBRARY_ID,
      name: nome,
      r2_key: resultado.key,
      thumbnail_r2_key: resultado.thumbnailKey,
      mime_type: mimeType,
      size_bytes: tamanho,
      width: miniatura.width,
      height: miniatura.height,
      content_hash: hash,
      duration_seconds: miniatura.duracao,
      file_created_at: agora.toISOString(),
      file_modified_at: agora.toISOString(),
    });

    if (erroBanco) {
      console.error("Erro ao salvar mídia:", erroBanco);
      await removerArquivosDoR2(token, resultado.key, resultado.thumbnailKey);
      throw new Error("Arquivos enviados, mas não foram registrados no banco.");
    }

    let thumbnailSrc: string;

    try {
      thumbnailSrc = await salvarArquivoNoCache(
        resultado.thumbnailKey,
        new Uint8Array(await miniatura.blob.arrayBuffer())
      );
    } catch (erroCache) {
      console.error("Não foi possível salvar a miniatura no cache:", erroCache);
      thumbnailSrc = await blobParaDataUrl(miniatura.blob);
    }

    // Se falhar, src fica vazio e o original é baixado ao selecionar
    let src = "";

    try {
      src = await salvarArquivoNoCache(
        resultado.key,
        new Uint8Array(await arquivo.arrayBuffer())
      );
    } catch (erroCache) {
      console.error("Não foi possível salvar o original no cache:", erroCache);
    }

    const midia: Media = {
      id,
      libraryId: LIBRARY_ID,
      name: nome,
      src,
      thumbnailSrc,
      r2Key: resultado.key,
      thumbnailR2Key: resultado.thumbnailKey,
      mimeType,
      size: tamanho,
      extension: extensao,
      createdAt: agora,
      modifiedAt: agora,
      width: miniatura.width,
      height: miniatura.height,
      durationSeconds: miniatura.duracao,
      tags: [],
    };

    return { midia };
  } catch (erro) {
    console.error(`Erro ao importar ${nome}:`, erro);

    return {
      nome,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  } finally {
    if (hashReservado) hashesEmAndamento.delete(hashReservado);
  }
}

function ImportButton({ onImport }: ImportButtonProps) {
  // Para onde vão as mídias que terminam de ser importadas
  useEffect(() => {
    definirDestinoImportacao(onImport);
  }, [onImport]);

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

    if (!(await tokenAtual())) {
      alert("Você precisa estar logado para importar mídias.");
      return;
    }

    adicionarTarefas(
      arquivos.map((arquivo): TarefaImportacao => {
        const nome = arquivo.split(/[\\/]/).pop() ?? arquivo;

        return {
          nome,
          executar: async (ignorarDuplicata: boolean) => {
            // Sessão renovada a cada arquivo: filas longas não expiram
            const token = await tokenAtual();

            if (!token) {
              return { nome, erro: "Você precisa estar logado para importar mídias." };
            }

            return importarArquivo(
              arquivo,
              `[${++sequencia}] ${nome}`,
              token,
              undefined,
              { ignorarDuplicata }
            );
          },
        };
      })
    );
  }

  useEffect(() => {
    async function aoColar(e: ClipboardEvent) {
      // Não interfere ao colar texto em campos (tags, busca, etc.)
      const alvo = e.target as HTMLElement;

      if (
        alvo.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)
      ) {
        return;
      }

      const arquivos = Array.from(e.clipboardData?.files ?? []).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );

      if (arquivos.length === 0) return;

      e.preventDefault();

      if (!(await tokenAtual())) {
        alert("Você precisa estar logado para importar mídias.");
        return;
      }

      adicionarTarefas(
        arquivos.map((arquivo): TarefaImportacao => {
          const nome = arquivo.name || "Imagem colada";

          return {
            nome,
            executar: async (ignorarDuplicata: boolean) => {
              const token = await tokenAtual();

              if (!token) {
                return { nome, erro: "Você precisa estar logado para importar mídias." };
              }

              return importarArquivoColado(arquivo, token, ignorarDuplicata);
            },
          };
        })
      );
    }

    window.addEventListener("paste", aoColar);

    return () => window.removeEventListener("paste", aoColar);
  }, []);

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