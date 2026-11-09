const chave = (userId: string) => `avatar:${userId}`;

export function lerAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(chave(userId));
  } catch {
    return null;
  }
}

export function salvarAvatar(userId: string, dataUrl: string) {
  try {
    localStorage.setItem(chave(userId), dataUrl);
  } catch (erro) {
    console.error("Não foi possível salvar o avatar:", erro);
  }
}

export function removerAvatar(userId: string) {
  try {
    localStorage.removeItem(chave(userId));
  } catch {
    // sem armazenamento: nada a remover
  }
}

// Recorta o centro em quadrado e reduz para o tamanho do avatar
export async function prepararAvatar(
  arquivo: File,
  tamanho = 256
): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }

  const imagem = await createImageBitmap(arquivo);

  try {
    const lado = Math.min(imagem.width, imagem.height);
    const sx = (imagem.width - lado) / 2;
    const sy = (imagem.height - lado) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = tamanho;
    canvas.height = tamanho;

    const contexto = canvas.getContext("2d");

    if (!contexto) {
      throw new Error("Não foi possível processar a imagem.");
    }

    contexto.drawImage(imagem, sx, sy, lado, lado, 0, 0, tamanho, tamanho);

    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    imagem.close();
  }
}