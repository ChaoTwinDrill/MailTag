import type { Media } from "./types/media";

import ImportButton from "./Importbutton";
import { FaSearch, FaFilter } from "react-icons/fa";

type HeaderProps = {
  onImport: (medias: Media[]) => void;
};

function Header({ onImport }: HeaderProps) {
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
        />
      </form>

      <ImportButton onImport={onImport} />

      <button>
        <FaFilter className="text-white w-15 h-7" />
      </button>

    </header>
  );
}

export default Header;