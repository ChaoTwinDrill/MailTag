import { useState } from "react";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";

import ImportButton from "./Importbutton";
import { FaSearch, FaFilter, FaTags, FaUserCircle, FaTimes, FaImages, FaBook, FaRegPlusSquare  } from "react-icons/fa";
import type { ModoApp } from "./types/book";
import { supabase } from "../lib/supabase";

type HeaderProps = {
  onImport: (medias: Media[]) => void;
  buscaTagIds: string[];
  onBuscaTagIds: (ids: string[]) => void;
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
};

function Header({
  onImport,
  buscaTagIds,
  onBuscaTagIds,
  allTags,
  userEmail,
  onLogin,
  updating,
  onUpdate,
  updateAvailable,
  filtrosAbertos,
  totalFiltrosAtivos,
  onToggleFiltros,
  gerenciadorAberto,
  onToggleGerenciador,
  modo,
  onCriarLivro,
  onChangeModo,
}: HeaderProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [textoBusca, setTextoBusca] = useState("");

    const sugestoes = allTags.filter((tag) => {
    const busca = textoBusca.trim().toLowerCase();

    if (!busca || buscaTagIds.includes(tag.id)) return false;

    const correspondeAoNome = tag.name.toLowerCase().includes(busca);

    const categoriaCorrespondente = allTags.some(
      (categoria) =>
        categoria.id === tag.parentTagId &&
        categoria.name.toLowerCase().includes(busca)
    );

  return correspondeAoNome || categoriaCorrespondente;
});

  function selecionarTag(tag: tags) {
    if (buscaTagIds.includes(tag.id)) return;

    onBuscaTagIds([...buscaTagIds, tag.id]);
    setTextoBusca("");
  }

  function removerTag(tagId: string) {
    onBuscaTagIds(buscaTagIds.filter((id) => id !== tagId));
  }

  function confirmarBusca() {
    const nome = textoBusca.trim();

    if (!nome) return;

    const tag = allTags.find(
      (t) => t.name.toLowerCase() === nome.toLowerCase()
    );

    if (tag) selecionarTag(tag);
  }

  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao sair:", error);
    }

    setMenuAberto(false);
  }

  return (
    <header className="h-20 bg-base border-b-20 border-border flex items-center px-4 gap-5">
      <form
        role="search"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          confirmarBusca();
        }}
        className="relative flex items-center gap-2 bg-botao rounded-lg px-4 py-2 w-3/4 min-w-0"
      >
        <FaSearch className="text-white shrink-0" />

        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          {buscaTagIds.map((id) => {
            const tag = allTags.find((t) => t.id === id);

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

          <input
            type="text"
            id="busca"
            autoComplete="off"
            placeholder={
              buscaTagIds.length > 0
                ? "Adicionar outra tag..."
                : "Digite o que procura..."
            }
            className="focus:outline-none bg-transparent text-white flex-1 min-w-24"
            value={textoBusca}
            onChange={(e) => setTextoBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && textoBusca === "" && buscaTagIds.length > 0) {
                removerTag(buscaTagIds[buscaTagIds.length - 1]);
              }

              if (e.key === " " && textoBusca.trim() !== "") {
                e.preventDefault();
                confirmarBusca();
              }

              if (e.key === "Escape") {
                setTextoBusca("");
              }
            }}
          />
        </div>

        {sugestoes.length > 0 && (
          <div className="absolute top-[calc(100%-8px)] left-0 right-0 z-50 bg-gradient-to-b from-botao via-botao/40 to-botao/0 p-3 pt-5 rounded-b-lg">
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  title={tag.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarTag(tag)}
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
                    {tag.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
      {modo === "livros" && (
        <button
          type="button"
          onClick={onCriarLivro}
          className="px-3 py-2 bg-botao rounded-lg
            text-white transition-colors focus:outline-3 hover:bg-botao/80
            focus:outline-offset-2 focus:outline-botao flex items-center
            gap-1 font-Alexandria font-[500] shrink-0"
          >
      <FaRegPlusSquare className="text-lg" />
          CRIAR LIVRO
        </button>
      )}
      {modo === "imagens" && (
        <>
            <ImportButton onImport={onImport} />
            <button
              type="button"
              onClick={onToggleFiltros}
              title="Filtros"
              aria-pressed={filtrosAbertos}
              className="relative hover:opacity-70"
            >
              <FaFilter
                className={`w-15 h-7 ${
                  filtrosAbertos ? "text-botao-claro" : "text-white"
                }`}
              />

              {totalFiltrosAtivos > 0 && (
                <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-botao-claro px-1 text-xs font-bold text-fundo">
                  {totalFiltrosAtivos}
                </span>
              )}
            </button>
                </>
      )}
      
        <button
              type="button"
              onClick={onToggleGerenciador}
              title="Gerenciar tags"
              aria-pressed={gerenciadorAberto}
              className="hover:opacity-70"
            >
              <FaTags
                className={`h-7 w-7 ${
            gerenciadorAberto ? "text-botao-claro" : "text-white"
            }`}
          />
        </button>
        <div className="flex shrink-0 overflow-hidden rounded-lg bg-botao">
            {(
              [
                ["imagens", FaImages],
                ["livros", FaBook],
              ] as const
            ).map(([valor, Icone]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={modo === valor}
                onClick={() => onChangeModo(valor)}
                className={`flex items-center gap-2 px-3 py-3 font-Alexandria font-[500] transition ${
                  modo === valor
                    ? "bg-botao-claro text-fundo"
                    : "text-white hover:bg-botao/80"
                }`}
              > 
                <Icone/>        
              </button>
            ))}
          </div>



      <div className="relative ml-auto">
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="flex items-center justify-center text-white hover:opacity-70"
          title="Minha conta"
        >
          <FaUserCircle className="w-8 h-8" />
        </button>

        {menuAberto && (
          <div className="absolute right-0 z-50 top-12 w-56 rounded-lg bg-fundo p-1 text-white">
            {userEmail ? (
              <>
                <button
                  className="w-full rounded-md p-2 text-left hover:bg-botao"
                  onClick={() => setMenuAberto(false)}
                >
                  Minha conta
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