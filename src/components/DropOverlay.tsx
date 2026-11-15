export default function DropOverlay({ texto }: { texto: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-fundo/70">
      <div className="rounded-2xl border-4 border-dashed border-botao-claro px-12 py-10 font-Alexandria text-xl font-[700] text-white">
        {texto}
      </div>
    </div>
  );
}