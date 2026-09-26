import type { Media } from "./types/media";

interface MediaInfoProps {
  media: Media | null;
}
function formatarTamanho(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatarData(data: Date) {
  return data.toLocaleString("pt-BR");
}

function MediaInfo({ media }: MediaInfoProps) {
  if (!media) {
    return (
      <aside className="w-1/4 shrink-0 bg-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
        <h2 className="text-lg font-semibold">
          Informações de mídia
        </h2>
        <p className="mt-4 text-gray-400">
          Nenhuma mídia selecionada.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-1/4 min-h-0 shrink-0 bg-base overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
      <img
        src={media.src}
        alt={media.name}
        className=" w-full object-cover"
      />

      <div className="mt-1 p-2">
        <h1 className="break-words text-[20px] font-alexandria font-[700]">
          {media.name}
        </h1>
        <p className="mt-2 text-sm text-gray-400 font-alexandria font-[500]">
          Tamanho: {formatarTamanho(media.size)}
        </p>
        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          {media.width} x {media.height} px
        </p>
         <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          Extensão: {media.name.split(".").pop()?.toUpperCase() ?? "Sem extensão"}
        </p>
        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          Criado em: {formatarData(media.createdAt)}
        </p>
        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          Modificado em: {formatarData(media.modifiedAt)}
        </p>
      </div>
    </aside>
  );
}

export default MediaInfo;