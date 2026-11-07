import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";

import { supabase } from "./supabase";
import { LIBRARY_ID } from "./library";

const WORKER_URL = "https://mailtag-api.oririkkj.workers.dev/";

export async function obterArquivoCacheado(chave: string): Promise<string> {
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
  const pastaArquivo = await join(pastaCache, "cache", ...partes.slice(0, -1));

  await mkdir(pastaArquivo, { recursive: true });

  const arquivo = new Uint8Array(await resposta.arrayBuffer());

  await writeFile(caminho, arquivo);

  return convertFileSrc(caminho);
}