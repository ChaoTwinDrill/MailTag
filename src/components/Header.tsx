
import { useState } from "react";
import type { Media } from "./types/media";

import ImportButton from "./Importbutton";
import { FaSearch, FaFilter, FaUserCircle } from "react-icons/fa";
import { supabase } from "../lib/supabase";

type HeaderProps = {
  onImport: (medias: Media[]) => void;
  buscaTag: string;
  onBuscaTag: (busca: string) => void;
  userEmail: string | null;
  onLogin: () => void;
};

function Header({
  onImport,
  buscaTag,
  onBuscaTag,
  userEmail,
  onLogin,
}: HeaderProps) {
  const [menuAberto, setMenuAberto] = useState(false);

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
        className="flex items-center gap-2 bg-botao rounded-lg px-4 py-2 w-3/4"
      >
        <label htmlFor="busca">
          <FaSearch className="text-white" />
        </label>

        <input
          type="text"
          id="busca"
          placeholder="Digite o que procura..."
          className="focus:outline-none w-full text-white"
          value={buscaTag}
          onChange={(e) => onBuscaTag(e.target.value)}
        />
      </form>

      <ImportButton onImport={onImport} />

      <button>
        <FaFilter className="text-white w-15 h-7" />
      </button>

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
                  onClick={() => {
                    setMenuAberto(false);
                    // aqui tem q fazer abrir configurações da conta
                  }}
                >
                  Minha conta
                </button>

                <button
                  className="w-full rounded-md p-2 text-left hover:bg-botao"
                  onClick={() => {
                    setMenuAberto(false);
                    // nesse abrir as configurações de sincronização (se tiver ne)
                  }}
                >
                  Sincronização
                </button>

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
