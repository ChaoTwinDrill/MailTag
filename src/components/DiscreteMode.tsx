export default function DiscreteMode({ url }: { url: string | null }) {
  return (
    <div className="fixed inset-0 z-[9999] cursor-none bg-black">
      {url && (
        <iframe
          src={url}
          title="Vídeo"
          allow="autoplay; encrypted-media; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          // Sem cliques no vídeo: o teclado fica sempre com a janela
          className="pointer-events-none h-full w-full border-0"
        />
      )}
    </div>
  );
}