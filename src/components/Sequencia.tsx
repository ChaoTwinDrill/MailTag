import { useEffect, useMemo, useRef, useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { estaNaCadeia } from "../lib/sequencia";
import { obterArquivoCacheado } from "../lib/cache";
import CapaLivro from "./CapaLivro";

type ItemBase = { id: string; name: string };

type Props<T extends ItemBase> = {
  rotuloItem: string; // "mídia" ou "livro"
  atualId: string;
  itens: T[]; // todos os itens, sem filtro
  getAnteriorId: (item: T) => string | null;
  getMiniaturaKey: (item: T) => string | null;
  proporcao: string; // classe do Tailwind, ex.: "aspect-square"
  variante?: "midia" | "livro";
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
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    setSrc("");
    setPronta(false);

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
      className={`relative w-full overflow-hidden rounded bg-card ${proporcao}`}
    >
      {src && (
        <img
          src={src}
          alt=""
          decoding="async"
          onLoad={() => setPronta(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            pronta ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {chave && !pronta && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]"
        />
      )}
    </div>
  );
}

function Thumb({
  chave,
  nome,
  proporcao,
  variante,
}: {
  chave: string | null;
  nome: string;
  proporcao: string;
  variante: "midia" | "livro";
}) {
  if (variante === "livro") {
    return <CapaLivro chave={chave} titulo={nome} className={proporcao} />;
  }

  return <Miniatura chave={chave} proporcao={proporcao} />;
}

// Uma relação (anterior ou continuação), com opção de desfazer
function Linha({
  rotulo,
  nome,
  thumb,
  onAbrir,
  onRemover,
}: {
  rotulo: string;
  nome: string;
  thumb: React.ReactNode;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-base/60 p-1.5">
      <button
        type="button"
        title={`Abrir ${nome}`}
        onClick={onAbrir}
        className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:brightness-125"
      >
        <span className="w-9 shrink-0">{thumb}</span>

        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {rotulo}
          </span>
          <span className="block truncate text-xs font-semibold">{nome}</span>
        </span>
      </button>

      <button
        type="button"
        title="Desfazer vínculo"
        onClick={onRemover}
        className="shrink-0 rounded-full p-1.5 text-gray-300 transition hover:bg-black/40 hover:text-white"
      >
        <FaTimes className="h-3 w-3" />
      </button>
    </div>
  );
}

const classeMais =
  "inline-flex items-center gap-1.5 rounded bg-botao px-2 py-1 text-xs transition hover:brightness-125";

export default function Sequencia<T extends ItemBase>({
  rotuloItem,
  atualId,
  itens,
  getAnteriorId,
  getMiniaturaKey,
  proporcao,
  variante = "midia",
  onDefinirAnterior,
  onAbrir,
}: Props<T>) {
  const [modo, setModo] = useState<"anterior" | "continuacao" | null>(null);
  const [texto, setTexto] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);
  const atualRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setModo(null);
    setTexto("");
  }, [atualId]);

  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  const filhosPorPai = useMemo(() => {
    const mapa = new Map<string, T[]>();

    for (const item of itens) {
      const pai = getAnteriorId(item);

      if (!pai) continue;

      const lista = mapa.get(pai);

      if (lista) lista.push(item);
      else mapa.set(pai, [item]);
    }

    return mapa;
  }, [itens, getAnteriorId]);

  const atual = porId.get(atualId) ?? null;
  const idDoAnterior = atual ? getAnteriorId(atual) : null;
  const anterior = idDoAnterior ? porId.get(idDoAnterior) ?? null : null;
  const continuacoes = filhosPorPai.get(atualId) ?? [];

  // Cadeia inteira: tudo que vem antes e, seguindo a primeira continuação, depois
  const nos = useMemo(() => {
    if (!atual) return [];

    const vistos = new Set<string>([atualId]);
    const antes: T[] = [];
    let cursor: T = atual;

    for (;;) {
      const paiId = getAnteriorId(cursor);

      if (!paiId || vistos.has(paiId)) break;

      const pai = porId.get(paiId);

      if (!pai) break;

      vistos.add(paiId);
      antes.unshift(pai);
      cursor = pai;
    }

    const depois: T[] = [];
    let id = atualId;

    for (;;) {
      const proximo = (filhosPorPai.get(id) ?? []).find((f) => !vistos.has(f.id));

      if (!proximo) break;

      vistos.add(proximo.id);
      depois.push(proximo);
      id = proximo.id;
    }

    return [...antes, atual, ...depois];
  }, [atual, atualId, porId, filhosPorPai, getAnteriorId]);

  const posicao = nos.findIndex((n) => n.id === atualId);

  // Centraliza o item atual na faixa
  useEffect(() => {
    const faixa = stripRef.current;
    const el = atualRef.current;

    if (faixa && el) {
      faixa.scrollLeft = el.offsetLeft - faixa.clientWidth / 2 + el.offsetWidth / 2;
    }
  }, [atualId, nos.length]);

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

  const semVinculos = !anterior && continuacoes.length === 0;

  return (
    <div className="m-2 mt-5">
      <div className="relative min-w-0 rounded-b-lg rounded-t-lg border-b-15 border-t-25 border-card bg-fundo p-2">
        <span className="absolute -top-[25px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-card px-2 font-semibold text-white">
          Sequência
        </span>

        {nos.length > 1 && (
          <div className="mb-3">
            <p className="mb-1 text-xs text-gray-300">
              Parte {posicao + 1} de {nos.length}
            </p>

            <div
              ref={stripRef}
              className="relative flex gap-2 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {nos.map((no, i) => {
                const ehAtual = no.id === atualId;

                return (
                  <button
                    key={no.id}
                    ref={ehAtual ? atualRef : undefined}
                    type="button"
                    title={no.name}
                    aria-current={ehAtual ? "true" : undefined}
                    onClick={() => !ehAtual && onAbrir(no.id)}
                    className={`relative w-14 shrink-0 rounded text-left transition ${
                      ehAtual
                        ? "ring-2 ring-botao-claro ring-offset-2 ring-offset-fundo"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Thumb
                      chave={getMiniaturaKey(no)}
                      nome={no.name}
                      proporcao={proporcao}
                      variante={variante}
                    />

                    <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] font-bold leading-4 text-white">
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {anterior ? (
            <Linha
              rotulo="Antes"
              nome={anterior.name}
              thumb={
                <Thumb
                  chave={getMiniaturaKey(anterior)}
                  nome={anterior.name}
                  proporcao={proporcao}
                  variante={variante}
                />
              }
              onAbrir={() => onAbrir(anterior.id)}
              onRemover={() => onDefinirAnterior(atualId, null)}
            />
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setModo("anterior")}
                className={classeMais}
              >
                <FaPlus className="h-2.5 w-2.5" />
                Definir anterior
              </button>
            </div>
          )}

          {continuacoes.map((c) => (
            <Linha
              key={c.id}
              rotulo="Continuação"
              nome={c.name}
              thumb={
                <Thumb
                  chave={getMiniaturaKey(c)}
                  nome={c.name}
                  proporcao={proporcao}
                  variante={variante}
                />
              }
              onAbrir={() => onAbrir(c.id)}
              onRemover={() => onDefinirAnterior(c.id, null)}
            />
          ))}

          <div>
            <button
              type="button"
              onClick={() => setModo("continuacao")}
              className={classeMais}
            >
              <FaPlus className="h-2.5 w-2.5" />
              Adicionar continuação
            </button>
          </div>
        </div>

        {semVinculos && !modo && (
          <p className="mt-3 text-xs text-gray-400">
            Ligue este {rotuloItem} a outros para montar uma ordem (volumes,
            partes, versões).
          </p>
        )}

        {modo && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold text-gray-300">
              {modo === "anterior"
                ? `Qual ${rotuloItem} vem antes?`
                : `Qual ${rotuloItem} continua este?`}
            </p>

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
              className="w-full rounded-md bg-base p-2 text-sm text-white outline-none focus:ring-2 focus:ring-botao-claro"
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
                      className="min-w-0 rounded text-left transition hover:brightness-125"
                    >
                      <Thumb
                        chave={getMiniaturaKey(item)}
                        nome={item.name}
                        proporcao={proporcao}
                        variante={variante}
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