import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  copyFile,
  exists,
  mkdir,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";

import { supabase } from "./supabase";
import { LIBRARY_ID } from "./library";

const WORKER_URL = "https://mailtag-api.oririkkj.workers.dev/";

// Downloads em andamento, para não baixar o mesmo arquivo duas vezes
// e evitar que alguém leia um arquivo ainda sendo gravado.
const downloadsEmAndamento = new Map<string, Promise<string>>();

async function resolverCaminho(chave: string) {
  // Impede caminhos fora da pasta da galeria
  if (!chave.startsWith(`${LIBRARY_ID}/`)) {
    throw new Error("Chave de arquivo inválida.");
  }

  const partes = chave.split("/");

  if (partes.some((parte) => !parte || parte === "." || parte === "..")) {
    throw new Error("Caminho de arquivo inválido.");
  }

  // Local do cache no computador
  const pastaCache = await appDataDir();
  const caminho = await join(pastaCache, "cache", ...partes);
  const pastaArquivo = await join(pastaCache, "cache", ...partes.slice(0, -1));

  return { caminho, pastaArquivo };
}

// Grava um arquivo que o app já tem em memória (ex.: miniatura recém-criada
// na importação) no cache, evitando baixá-lo do R2 depois.
export async function salvarArquivoNoCache(
  chave: string,
  conteudo: Uint8Array
): Promise<string> {
  const { caminho, pastaArquivo } = await resolverCaminho(chave);

  await mkdir(pastaArquivo, { recursive: true });
  await writeFile(caminho, conteudo);

  return convertFileSrc(caminho);
}

// Copia um arquivo do disco para o cache sem carregá-lo na memória
// (ex.: o original de uma mídia recém-importada).
export async function copiarArquivoParaCache(
  chave: string,
  origem: string
): Promise<string> {
  const { caminho, pastaArquivo } = await resolverCaminho(chave);

  await mkdir(pastaArquivo, { recursive: true });
  await copyFile(origem, caminho);

  return convertFileSrc(caminho);
}

async function baixarParaCache(chave: string): Promise<string> {
  const { caminho, pastaArquivo } = await resolverCaminho(chave);

  // Se já existe, reutiliza sem baixar novamente
  if (await exists(caminho)) {
    return convertFileSrc(caminho);
  }

  // Obter sessão do usuário
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error("Usuário não autenticado.");
  }

  // Baixar arquivo do R2 através do Worker
  const resposta = await fetch(
    `${WORKER_URL}?key=${encodeURIComponent(chave)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "X-Library-Id": LIBRARY_ID,
      },
    }
  );

  if (!resposta.ok) {
    throw new Error(`Erro ao baixar arquivo: ${resposta.status}`);
  }

  // Criar pasta e salvar arquivo localmente
  await mkdir(pastaArquivo, { recursive: true });

  try {
    if (resposta.body) {
      // Grava em fluxo, sem carregar o arquivo inteiro na memória
      await writeFile(caminho, resposta.body);
    } else {
      await writeFile(caminho, new Uint8Array(await resposta.arrayBuffer()));
    }
  } catch (erro) {
    // Não deixa um arquivo incompleto no cache
    await remove(caminho).catch(() => {});
    throw erro;
  }

  return convertFileSrc(caminho);
}

export function obterArquivoCacheado(chave: string): Promise<string> {
  const emAndamento = downloadsEmAndamento.get(chave);

  if (emAndamento) return emAndamento;

  const promessa = baixarParaCache(chave).finally(() => {
    downloadsEmAndamento.delete(chave);
  });

  downloadsEmAndamento.set(chave, promessa);

  return promessa;
}

// Remove arquivos do cache local (ex.: quando uma mídia é excluída).
export async function removerDoCache(
  chaves: (string | null | undefined)[]
): Promise<void> {
  for (const chave of chaves) {
    if (!chave) continue;

    try {
      const { caminho } = await resolverCaminho(chave);

      if (await exists(caminho)) {
        await remove(caminho);
      }
    } catch (erro) {
      console.error("Erro ao remover arquivo do cache:", chave, erro);
    }
  }
}
