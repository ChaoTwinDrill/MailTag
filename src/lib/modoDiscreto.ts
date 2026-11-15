const chave = (userId: string) => `modoDiscretoLink:${userId}`;

export function lerLinkDiscreto(userId: string): string {
  try {
    return localStorage.getItem(chave(userId)) ?? "";
  } catch {
    return "";
  }
}

export function salvarLinkDiscreto(userId: string, link: string) {
  try {
    if (link.trim()) localStorage.setItem(chave(userId), link.trim());
    else localStorage.removeItem(chave(userId));
  } catch {
    // sem armazenamento: vale só até fechar o app
  }
}


export function urlDeEmbed(link: string): string | null {
  let url: URL;

  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const lista = url.searchParams.get("list");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] || null;
  } else if (host === "youtube.com") {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null;
  } else {
    return null;
  }

  const params = new URLSearchParams({
    autoplay: "1",
    controls: "0",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });

  if (id) {
    if (lista) {
      params.set("list", lista);
    } else {
      // Repete o vídeo, para não terminar mostrando sugestões
      params.set("loop", "1");
      params.set("playlist", id);
    }

    return `https://www.youtube.com/embed/${id}?${params}`;
  }

  if (lista) {
    params.set("list", lista);
    params.set("loop", "1");

    return `https://www.youtube.com/embed/videoseries?${params}`;
  }

  return null;
}