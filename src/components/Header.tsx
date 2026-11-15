import { useState, type ReactNode } from "react";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";

import ImportButton from "./Importbutton";
import {
  FaSearch,
  FaFilter,
  FaTags,
  FaUserCircle,
  FaTimes,
  FaImages,
  FaBook,
  FaRegPlusSquare,
  FaDice,
} from "react-icons/fa";
import type { ModoApp } from "./types/book";
import { supabase } from "../lib/supabase";
import {
  aplicavel,
  dividirOu,
  interpretar,
  rotuloTermo,
  sugerirOperadores,
  tiraAspas,
  type NovoTermo,
  type Termo,
} from "../lib/busca";

// Todos os controles do cabeçalho têm a mesma altura
const botaoBase =
  "flex h-12 shrink-0 items-center justify-center rounded-lg bg-botao text-white transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-botao-claro";

const botaoIcone = `${botaoBase} w-12 aria-pressed:bg-botao-claro aria-pressed:text-fundo`;
const botaoTexto = `${botaoBase} gap-2 px-4 font-Alexandria font-[500]`;

type HeaderProps = {
  onImport: (medias: Media[]) => void;
  buscaTagIds: string[];
  onBuscaTagIds: (ids: string[]) => void;
  excluirTagIds: string[];
  onExcluirTagIds: (ids: string[]) => void;
  termos: Termo[];
  onTermos: (termos: Termo[]) => void;
  avatarUrl: string | null;
  allTags: tags[];
  userEmail: string | null;
  onLogin: () => void;
  updateAvailable: boolean;
  updating: boolean;
  onUpdate: () => void;
  filtrosAbertos: boolean;
  totalFiltrosAtivos: number;
  onToggleFiltros: () => void;
  gerenciadorAberto: boolean;
  onToggleGerenciador: () => void;
  modo: ModoApp;
  onCriarLivro: () => void;
  onChangeModo: (modo: ModoApp) => void;
  onOpenSettings: () => void;
  onAleatorio: (abrir: boolean) => void;
  colecoes?: ReactNode;
};

function Header({
  onImport,
  buscaTagIds,
  onBuscaTagIds,
  excluirTagIds,
  onExcluirTagIds,
  termos,
  onTermos,
  allTags,
  userEmail,
  onLogin,
  avatarUrl,
  updating,
  onUpdate,
  updateAvailable,
  onOpenSettings,
  filtrosAbertos,
  totalFiltrosAtivos,
  onToggleFiltros,
  gerenciadorAberto,
  onToggleGerenciador,
  modo,
  onCriarLivro,
  onChangeModo,
  onAleatorio,
  colecoes,
}: HeaderProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [textoBusca, setTextoBusca] = useState("");

  const tagPorId = new Map(allTags.map((t) => [t.id, t]));

  const textoLimpo = textoBusca.trim();
  const excluindo = textoLimpo.startsWith("-");
  const semMenos = (excluindo ? textoLimpo.slice(1) : textoLimpo).trim();

  const interpretacao = interpretar(textoBusca, allTags, modo);
  const sugestoesOperador = sugerirOperadores(textoBusca, modo);

  // Em "a|b" as sugestões de tag valem para o último pedaço
  const partesOu = dividirOu(semMenos);
  const emGrupo = partesOu.length > 1;
  const operadorAtivo = !emGrupo && /[:<>=]/.test(semMenos);
  const segmento = tiraAspas(partesOu[partesOu.length - 1]).trim().toLowerCase();

  const sugestoes =
    operadorAtivo || !segmento
      ? []
      : allTags
          .filter((tag) => {
            if (
              !emGrupo &&
              (buscaTagIds.includes(tag.id) || excluirTagIds.includes(tag.id))
            ) {
              return false;
            }

            const correspondeAoNome = tag.name.toLowerCase().includes(segmento);

            const categoriaCorrespondente = allTags.some(
              (categoria) =>
                categoria.id === tag.parentTagId &&
                categoria.name.toLowerCase().includes(segmento)
            );

            return correspondeAoNome || categoriaCorrespondente;
          })
          .slice(0, 40);

  let dica: { texto: string; erro: boolean } | null = null;

  if (interpretacao.tipo === "termo") {
    dica = {
      texto: `Enter ou espaço: ${rotuloTermo(interpretacao.termo, tagPorId)}`,
      erro: false,
    };
  } else if (interpretacao.tipo === "erro") {
    dica = { texto: interpretacao.mensagem, erro: true };
  } else if (
    interpretacao.tipo === "texto" &&
    sugestoes.length === 0 &&
    sugestoesOperador.length === 0
  ) {
    dica = { texto: `Enter: buscar "${interpretacao.texto}" no nome`, erro: false };
  }

  const mostrarDropdown =
    dica !== null || sugestoesOperador.length > 0 || sugestoes.length > 0;

  function selecionarTag(tag: tags, negar: boolean) {
    if (negar) {
      onBuscaTagIds(buscaTagIds.filter((id) => id !== tag.id));

      if (!excluirTagIds.includes(tag.id)) {
        onExcluirTagIds([...excluirTagIds, tag.id]);
      }
    } else {
      onExcluirTagIds(excluirTagIds.filter((id) => id !== tag.id));

      if (!buscaTagIds.includes(tag.id)) {
        onBuscaTagIds([...buscaTagIds, tag.id]);
      }
    }

    setTextoBusca("");
  }

  function adicionarTermo(novo: NovoTermo) {
    // Ordem e amostra só podem existir uma vez
    const base =
      novo.op === "ordem" || novo.op === "aleatorio"
        ? termos.filter((t) => t.op !== novo.op)
        : termos;

    onTermos([...base, { ...novo, id: crypto.randomUUID() } as Termo]);
    setTextoBusca("");
  }

  function removerTag(tagId: string) {
    onBuscaTagIds(buscaTagIds.filter((id) => id !== tagId));
  }

  function removerExclusao(tagId: string) {
    onExcluirTagIds(excluirTagIds.filter((id) => id !== tagId));
  }

  // Devolve true se confirmou algo
  function confirmar(origem: "enter" | "espaco"): boolean {
    const r = interpretacao;

    if (r.tipo === "tag") {
      if (origem === "espaco") {
        // Com "Mind" e "Mind Break", o espaço faz parte do nome
        const base = `${r.tag.name.toLowerCase()} `;

        const temMaisLonga = allTags.some(
          (t) => t.id !== r.tag.id && t.name.toLowerCase().startsWith(base)
        );

        if (temMaisLonga) return false;
      }

      selecionarTag(r.tag, r.negar);

      return true;
    }

    if (r.tipo === "termo") {
      adicionarTermo(r.termo);

      return true;
    }

    if (origem === "enter" && r.tipo === "texto") {
      if (sugestoes.length === 1 && !textoBusca.includes('"')) {
        selecionarTag(sugestoes[0], r.negar);
      } else {
        adicionarTermo({ op: "nome", texto: r.texto, negar: r.negar });
      }

      return true;
    }

    return false;
  }

  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
    }

    setMenuAberto(false);
  }

  return (
    <header className="flex h-20 items-center gap-4 border-b-20 border-border bg-base px-4">
      <form
        role="search"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          confirmar("enter");
        }}
        className="relative flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg bg-botao px-4 py-1.5 focus-within:ring-2 focus-within:ring-botao-claro/40"
      >
        <FaSearch className="shrink-0 text-white/70" />

        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          {buscaTagIds.map((id) => {
            const tag = tagPorId.get(id);

            if (!tag) return null;

            return (
              <span
                key={tag.id}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: tag.color ?? "#555555",
                  color: tag.textColor ?? "#ffffff",
                  border: tag.hasBorder
                    ? `2px solid ${tag.borderColor ?? "#ffffff"}`
                    : "none",
                }}
              >
                {tag.name}

                <button
                  type="button"
                  onClick={() => removerTag(tag.id)}
                  className="hover:opacity-60"
                  title="Remover tag da pesquisa"
                >
                  <FaTimes />
                </button>
              </span>
            );
          })}

          {excluirTagIds.map((id) => {
            const tag = tagPorId.get(id);

            if (!tag) return null;

            return (
              <span
                key={`x${tag.id}`}
                className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold outline outline-2 outline-red-400"
                style={{
                  backgroundColor: tag.color ?? "#555555",
                  color: tag.textColor ?? "#ffffff",
                }}
              >
                <span className="text-red-300">−</span>
                <span className="line-through decoration-red-400">{tag.name}</span>

                <button
                  type="button"
                  onClick={() => removerExclusao(tag.id)}
                  className="hover:opacity-60"
                  title="Parar de excluir"
                >
                  <FaTimes />
                </button>
              </span>
            );
          })}

          {termos.map((t) => {
            const vale = aplicavel(t, modo);

            return (
              <span
                key={t.id}
                title={vale ? undefined : "Não se aplica a este modo"}
                className={`flex shrink-0 items-center gap-1 rounded bg-fundo px-2 py-1 text-xs font-semibold text-white outline outline-2 ${
                  t.negar ? "outline-red-400" : "outline-botao-claro"
                } ${vale ? "" : "opacity-40"}`}
              >
                {rotuloTermo(t, tagPorId)}

                <button
                  type="button"
                  onClick={() => onTermos(termos.filter((x) => x.id !== t.id))}
                  className="hover:opacity-60"
                  title="Remover da pesquisa"
                >
                  <FaTimes />
                </button>
              </span>
            );
          })}

          <input
            type="text"
            id="busca"
            autoComplete="off"
            placeholder={
              buscaTagIds.length + excluirTagIds.length + termos.length > 0
                ? "Adicionar outro filtro..."
                : "Digite o que procura... (-tag exclui, tipo:video, tamanho>5mb)"
            }
            className={`focus:outline-none bg-transparent flex-1 min-w-24 ${
              excluindo ? "text-red-300" : "text-white"
            }`}
            value={textoBusca}
            onChange={(e) => setTextoBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && textoBusca === "") {
                if (termos.length > 0) {
                  onTermos(termos.slice(0, -1));
                } else if (excluirTagIds.length > 0) {
                  removerExclusao(excluirTagIds[excluirTagIds.length - 1]);
                } else if (buscaTagIds.length > 0) {
                  removerTag(buscaTagIds[buscaTagIds.length - 1]);
                }
              }

              if (e.key === " " && textoBusca.trim() !== "") {
                if (confirmar("espaco")) e.preventDefault();
              }

              if (e.key === "Escape") {
                setTextoBusca("");
              }
            }}
          />
        </div>

        {mostrarDropdown && (
          <div className="absolute top-[calc(100%-8px)] left-0 right-0 z-50 bg-gradient-to-b from-botao via-botao/40 to-botao/0 p-3 pt-5 rounded-b-lg">
            {dica && (
              <p
                className={`mb-2 text-xs font-semibold ${
                  dica.erro ? "text-red-300" : "text-botao-claro"
                }`}
              >
                {dica.texto}
              </p>
            )}

            {sugestoesOperador.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {sugestoesOperador.map((s) => (
                  <button
                    key={s.inserir}
                    type="button"
                    title={s.descricao}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setTextoBusca(s.inserir)}
                    className="flex items-center gap-2 rounded border border-botao-claro/60 bg-fundo/80 px-2 py-1 text-xs hover:brightness-125"
                  >
                    <span className="font-bold text-botao-claro">{s.rotulo}</span>
                    <span className="text-gray-300">{s.descricao}</span>
                  </button>
                ))}
              </div>
            )}

            {sugestoes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sugestoes.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    title={tag.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (emGrupo) {
                        const base = textoBusca.slice(0, textoBusca.lastIndexOf("|") + 1);

                        setTextoBusca(
                          base + (/\s/.test(tag.name) ? `"${tag.name}"` : tag.name)
                        );
                      } else {
                        selecionarTag(tag, excluindo);
                      }
                    }}
                    className="min-w-10 h-10 px-2 shrink-0 rounded flex items-center justify-center border hover:brightness-125 transition"
                    style={{
                      backgroundColor: tag.color ?? "#555555",
                      color: tag.textColor ?? "#ffffff",
                      border: tag.hasBorder
                        ? `2px solid ${tag.borderColor ?? "#ffffff"}`
                        : "none",
                    }}
                  >
                    <span className="text-xs font-bold whitespace-nowrap">
                      {excluindo && !emGrupo && "− "}
                      {tag.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      <div className="flex shrink-0 items-center gap-2">
        {modo === "livros" && (
          <button type="button" onClick={onCriarLivro} className={botaoTexto}>
            <FaRegPlusSquare className="text-lg" />
            CRIAR LIVRO
          </button>
        )}

        {modo === "imagens" && <ImportButton onImport={onImport} />}

        <button
          type="button"
          onClick={onToggleFiltros}
          title="Filtros"
          aria-label="Filtros"
          aria-pressed={filtrosAbertos}
          className={`${botaoIcone} relative`}
        >
          <FaFilter className="h-5 w-5" />

          {totalFiltrosAtivos > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-botao-claro px-1 text-xs font-bold text-fundo ring-2 ring-base">
              {totalFiltrosAtivos}
            </span>
          )}
        </button>

        {colecoes}

        <button
          type="button"
          onClick={onToggleGerenciador}
          title="Gerenciar tags"
          aria-label="Gerenciar tags"
          aria-pressed={gerenciadorAberto}
          className={botaoIcone}
        >
          <FaTags className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={(e) => onAleatorio(e.shiftKey)}
          title="Aleatória (Shift: abrir)"
          aria-label="Aleatória"
          className={botaoIcone}
        >
          <FaDice className="h-6 w-6" />
        </button>
      </div>

      <div className="h-8 w-px shrink-0 bg-white/10" />

      <div className="flex h-12 shrink-0 overflow-hidden rounded-lg bg-botao">
        {(
          [
            ["imagens", FaImages, "Imagens"],
            ["livros", FaBook, "Livros"],
          ] as const
        ).map(([valor, Icone, rotulo]) => (
          <button
            key={valor}
            type="button"
            title={rotulo}
            aria-label={rotulo}
            aria-pressed={modo === valor}
            onClick={() => onChangeModo(valor)}
            className={`flex h-full w-12 items-center justify-center transition ${
              modo === valor
                ? "bg-botao-claro text-fundo"
                : "text-white hover:bg-white/10"
            }`}
          >
            <Icone className="h-5 w-5" />
          </button>
        ))}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuAberto(!menuAberto)}
          title="Minha conta"
          aria-label="Minha conta"
          aria-expanded={menuAberto}
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-botao text-white transition hover:brightness-125"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <FaUserCircle className="h-7 w-7" />
          )}
        </button>

        {menuAberto && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-fundo p-1 text-white shadow-xl">
            {userEmail ? (
              <>
                <button
                  className="w-full rounded-md p-2 text-left hover:bg-botao"
                  onClick={() => {
                    setMenuAberto(false);
                    onOpenSettings();
                  }}
                >
                  Configurações
                </button>

                {updateAvailable && (
                  <button
                    className="w-full rounded-md p-2 text-left hover:bg-botao"
                    onClick={onUpdate}
                    disabled={updating}
                  >
                    {updating ? "Atualizando..." : "Atualização disponível"}
                  </button>
                )}

                <button
                  className="w-full rounded-md p-2 text-left text-red-400 hover:bg-botao"
                  onClick={sair}
                >
                  Sair da conta
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMenuAberto(false);
                  onLogin();
                }}
                className="w-full rounded-md p-2 text-left hover:bg-botao"
              >
                Entrar
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;