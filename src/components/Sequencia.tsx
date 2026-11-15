import { useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { estaNaCadeia } from "../lib/sequencia";
import { obterArquivoCacheado } from "../lib/cache";

type ItemBase = { id: string; name: string };

type Props<T extends ItemBase> = {
  rotuloItem: string; // "mídia" ou "livro"
  atualId: string;
  itens: T[]; // todos os itens, sem filtro
  getAnteriorId: (item: T) => string | null;
  getMiniaturaKey: (item: T) => string | null;
  proporcao: string; // classe do Tailwind, ex.: "aspect-square"
  onDefinirAnterior: (itemId: string, anteriorId: string | null) => void;
  onAbrir: (id: string) => void;
};

const LIMITE_SUGESTOES = 30;

// Baixa a miniatura só quando ela aparece na tela
function Miniatura({
  chave,
  proporcao,
}: {
  chave: string | null;
  proporcao: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    setSrc("");

    if (!chave) return;

    let cancelado = false;

    const observer = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;

        observer.disconnect();

        obterArquivoCacheado(chave)
          .then((s) => {
            if (!cancelado) setSrc(s);
          })
          .catch(() => {});
      },
      { rootMargin: "100px" }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      cancelado = true;
      observer.disconnect();
    };
  }, [chave]);

  return (
    <div
      ref={ref}
      className={`w-full overflow-hidden rounded bg-card ${proporcao}`}
    >
      {src && (
        <img
          src={src}
          alt=""
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function Cartao({
  nome,
  chave,
  proporcao,
  onAbrir,
  onRemover,
}: {
  nome: string;
  chave: string | null;
  proporcao: string;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        title={`Abrir ${nome}`}
        onClick={onAbrir}
        className="block w-full text-left hover:brightness-110"
      >
        <Miniatura chave={chave} proporcao={proporcao} />
        <span className="mt-1 block truncate text-xs font-semibold">{nome}</span>
      </button>

      <button
        type="button"
        title="Desfazer vínculo"
        onClick={onRemover}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
      >
        <FaTimes className="h-3 w-3" />
      </button>
    </div>
  );
}

const classeMais = "rounded bg-botao px-2 py-1 text-xs hover:brightness-125";

export default function Sequencia<T extends ItemBase>({
  rotuloItem,
  atualId,
  itens,
  getAnteriorId,
  getMiniaturaKey,
  proporcao,
  onDefinirAnterior,
  onAbrir,
}: Props<T>) {
  const [modo, setModo] = useState<"anterior" | "continuacao" | null>(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    setModo(null);
    setTexto("");
  }, [atualId]);

  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  const atual = porId.get(atualId) ?? null;
  const idDoAnterior = atual ? getAnteriorId(atual) : null;
  const anterior = idDoAnterior ? porId.get(idDoAnterior) ?? null : null;

  const continuacoes = useMemo(
    () => itens.filter((i) => getAnteriorId(i) === atualId),
    [itens, atualId, getAnteriorId]
  );

  function anteriorDe(id: string) {
    const item = porId.get(id);
    return item ? getAnteriorId(item) : null;
  }

  // paiId passaria a ser o "antes" de filhoId
  function podeVincular(paiId: string, filhoId: string) {
    return paiId !== filhoId && !estaNaCadeia(paiId, filhoId, anteriorDe);
  }

  function fechar() {
    setModo(null);
    setTexto("");
  }

  const termo = texto.trim().toLowerCase();

  const todasSugestoes =
    modo && termo
      ? itens
          .filter((i) => {
            if (i.id === atualId) return false;
            if (!i.name.toLowerCase().includes(termo)) return false;

            if (modo === "anterior") {
              return i.id !== anterior?.id && podeVincular(i.id, atualId);
            }

            return getAnteriorId(i) !== atualId && podeVincular(atualId, i.id);
          })
          .sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR", {
              numeric: true,
              sensitivity: "base",
            })
          )
      : [];

  const sugestoes = todasSugestoes.slice(0, LIMITE_SUGESTOES);

  function escolher(item: T) {
    if (modo === "anterior") {
      onDefinirAnterior(atualId, item.id);
    } else {
      const jaContinua = getAnteriorId(item);

      if (jaContinua && jaContinua !== atualId) {
        const outro = porId.get(jaContinua);

        const confirmado = window.confirm(
          `"${item.name}" já continua "${outro?.name ?? "outro item"}". Trocar para "${atual?.name ?? "este item"}"?`
        );

        if (!confirmado) return;
      }

      onDefinirAnterior(item.id, atualId);
    }

    fechar();
  }

  return (
    <div className="m-2 mt-5">
      <div className="relative min-w-0 rounded-b-lg rounded-t-lg border-b-15 border-t-25 border-card bg-fundo p-2">
        <span className="absolute -top-[25px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-card px-2 font-semibold text-white">
          Sequência
        </span>

        <div className="mb-4">
          <p className="mb-2 text-sm text-gray-300">Antes</p>

          {anterior ? (
            <div className="grid grid-cols-2 gap-3">
              <Cartao
                nome={anterior.name}
                chave={getMiniaturaKey(anterior)}
                proporcao={proporcao}
                onAbrir={() => onAbrir(anterior.id)}
                onRemover={() => onDefinirAnterior(atualId, null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModo("anterior")}
              className={classeMais}
            >
              + Definir
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-300">Continuação</p>

          {continuacoes.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              {continuacoes.map((c) => (
                <Cartao
                  key={c.id}
                  nome={c.name}
                  chave={getMiniaturaKey(c)}
                  proporcao={proporcao}
                  onAbrir={() => onAbrir(c.id)}
                  onRemover={() => onDefinirAnterior(c.id, null)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setModo("continuacao")}
            className={classeMais}
          >
            + Adicionar
          </button>
        </div>

        {modo && (
          <div className="mt-4 border-t border-border pt-3">
            <input
              autoFocus
              autoComplete="off"
              placeholder={`Buscar ${rotuloItem} pelo nome...`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  fechar();
                }

                if (e.key === "Enter") {
                  e.preventDefault();

                  const exato = todasSugestoes.find(
                    (i) => i.name.toLowerCase() === termo
                  );
                  const escolhido =
                    exato ??
                    (todasSugestoes.length === 1 ? todasSugestoes[0] : null);

                  if (escolhido) escolher(escolhido);
                }
              }}
              className="w-full rounded-md bg-base p-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-400"
            />

            {termo && todasSugestoes.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Nada encontrado com esse nome.
              </p>
            )}

            {sugestoes.length > 0 && (
              <>
                <div className="mt-3 grid max-h-80 grid-cols-3 gap-x-2 gap-y-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {sugestoes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.name}
                      onClick={() => escolher(item)}
                      className="min-w-0 rounded text-left hover:brightness-125"
                    >
                      <Miniatura
                        chave={getMiniaturaKey(item)}
                        proporcao={proporcao}
                      />
                      <span className="mt-1 block truncate text-[11px]">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>

                {todasSugestoes.length > LIMITE_SUGESTOES && (
                  <p className="mt-2 text-xs text-gray-400">
                    Mostrando {LIMITE_SUGESTOES} de {todasSugestoes.length}.
                    Digite mais para refinar.
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={fechar}
              className="mt-3 text-xs text-gray-300 hover:underline"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}