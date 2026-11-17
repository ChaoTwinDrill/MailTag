import type { IconType } from "react-icons";

type PainelVazioProps = {
  icone: IconType;
  titulo: string;
  texto: string;
};

// Estado vazio dos painéis laterais (nada selecionado)
export default function PainelVazio({ icone: Icone, titulo, texto }: PainelVazioProps) {
  return (
    <aside className="flex w-1/4 shrink-0 flex-col items-center justify-center gap-3 bg-base p-6 text-center text-white">
      <Icone className="h-10 w-10 text-white/25" />

      <h2 className="font-Alexandria text-base font-[700]">{titulo}</h2>

      <p className="max-w-56 text-sm text-gray-400">{texto}</p>
    </aside>
  );
}
