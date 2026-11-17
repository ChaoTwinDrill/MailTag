import type { ReactNode } from "react";

// Peças compartilhadas pelos painéis de filtro de mídias e de livros

export const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-botao-claro [color-scheme:dark]";

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 font-Alexandria text-sm font-[700] uppercase text-gray-300">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function Segmentado<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (valor: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md bg-fundo">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          className={`flex-1 px-2 py-1.5 text-sm transition ${
            valor === opcao.valor
              ? "bg-botao-claro font-semibold text-fundo"
              : "hover:bg-botao"
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}
