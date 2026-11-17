import { Fragment } from "react";

type Item = { rotulo: string; valor: string };

// Rótulo à esquerda, valor à direita; itens nulos são ignorados
export default function InfoLista({ itens }: { itens: (Item | null)[] }) {
  const visiveis = itens.filter((i): i is Item => i !== null);

  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 pb-6 font-Alexandria text-sm font-[500]">
      {visiveis.map((item) => (
        <Fragment key={item.rotulo}>
          <dt className="text-gray-300">{item.rotulo}</dt>
          <dd className="break-words text-right tabular-nums text-white">
            {item.valor}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
