import { useState } from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import Header from "./components/Header.tsx";
import Mediagrid from "./components/Mediagrid.tsx";
import type { Media } from "./components/types/media.ts";

const mediasIniciais: Media[] = [];

function App() {
  const [medias, setMedias] = useState<Media[]>(mediasIniciais);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

function adicionarTag(mediaId: string, nomeTag: string) {
  const novaTag = {
    id: crypto.randomUUID(),
    name: nomeTag,
  };

  setMedias((mediasAntigas) =>
    mediasAntigas.map((media) =>
      media.id === mediaId
        ? { ...media, tags: [...media.tags, novaTag] }
        : media
    )
  );

  setSelectedMedia((mediaAtual) => {
    if (!mediaAtual || mediaAtual.id !== mediaId) {
      return mediaAtual;
    }

    return {
      ...mediaAtual,
      tags: [...mediaAtual.tags, novaTag],
    };
  });
}

  function adicionarMedias(novasMedias: Media[]) {
      setMedias((mediasAntigas) => [
        ...mediasAntigas,
        ...novasMedias
      ]);
    }

    return (
      <main className="flex h-screen flex-col overflow-hidden">
        <Header onImport={adicionarMedias} />

        <Mediagrid 
          medias={medias} 
          selectedMedia={selectedMedia}
          onSelectMedia={setSelectedMedia}
          onAddTag={adicionarTag}
  />
      </main>
    );
  }

ReactDOM
  .createRoot(document.getElementById("root") as HTMLElement)
  .render(
    <App />
  );