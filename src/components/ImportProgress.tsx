import { useEffect, useState, useSyncExternalStore } from "react";
import { FaTimes } from "react-icons/fa";
import {
  assinar,
  obterEstado,
  cancelarRestantes,
  importarDuplicadasMesmoAssim,
  limparImportacao,
} from "../lib/importacao";

export default function ImportProgress() {
  const e = useSyncExternalStore(assinar, obterEstado);
  const [detalhes, setDetalhes] = useState(false);

  const terminou = e.total > 0 && e.concluidas >= e.total;
  const tudoCerto =
    terminou && e.falhas.length === 0 && e.duplicadas.length === 0;
  const restantes = e.total - e.concluidas - e.emAndamento.length;

  // Se deu tudo certo, o cartão some sozinho
  useEffect(() => {
    if (!tudoCerto) return;

    const timer = window.setTimeout(limparImportacao, 4000);

    return () => window.clearTimeout(timer);
  }, [tudoCerto]);

  if (e.total === 0) return null;

  const percentual = Math.min(100, Math.round((e.concluidas / e.total) * 100));

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-80 -translate-x-1/2 rounded-xl bg-base p-3 text-white shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-Alexandria text-sm font-[700]">
          {terminou
            ? "Importação concluída"
            : `Importando · ${e.concluidas} de ${e.total}`}
        </span>

        {terminou && (
          <button
            type="button"
            title="Fechar"
            onClick={limparImportacao}
            className="hover:opacity-60"
          >
            <FaTimes />
          </button>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded bg-fundo">
        <div
          className="h-full bg-botao-claro transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>

      {!terminou && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-300">
          <span className="min-w-0 truncate">
            {e.emAndamento[0]}
            {e.emAndamento.length > 1 && ` +${e.emAndamento.length - 1}`}
          </span>

          {restantes > 0 && (
            <button
              type="button"
              onClick={cancelarRestantes}
              className="shrink-0 underline hover:opacity-60"
            >
              Cancelar restantes
            </button>
          )}
        </div>
      )}

      {terminou && (
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            {e.importadas} {e.importadas === 1 ? "importada" : "importadas"}
          </li>

          {e.duplicadas.length > 0 && (
            <li className="text-gray-300">
              {e.duplicadas.length}{" "}
              {e.duplicadas.length === 1
                ? "duplicada ignorada"
                : "duplicadas ignoradas"}
              <button
                type="button"
                onClick={importarDuplicadasMesmoAssim}
                className="ml-2 underline hover:opacity-60"
              >
                Importar mesmo assim
              </button>
            </li>
          )}

          {e.falhas.length > 0 && (
            <li className="text-red-400">
              {e.falhas.length} {e.falhas.length === 1 ? "falha" : "falhas"}
            </li>
          )}

          {(e.duplicadas.length > 0 || e.falhas.length > 0) && (
            <li>
              <button
                type="button"
                onClick={() => setDetalhes((d) => !d)}
                className="text-xs text-gray-300 underline hover:opacity-60"
              >
                {detalhes ? "Ocultar detalhes" : "Ver detalhes"}
              </button>
            </li>
          )}
        </ul>
      )}

      {terminou && detalhes && (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-gray-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {e.duplicadas.map((d, i) => (
            <li key={`d${i}`} className="break-words">
              {d.nome} · igual a "{d.igualA}"
            </li>
          ))}

          {e.falhas.map((f, i) => (
            <li key={`f${i}`} className="break-words text-red-400">
              {f.nome}: {f.erro}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}