import ImportButton from "./Importbutton";
import { FaSearch } from "react-icons/fa";
import { FaFilter } from "react-icons/fa";

function Header() {
  return (
    <header className="h-20 bg-base border-b-20 border-border flex items-center px-4 gap-5   justify-normal">
      <form role="search" className="flex items-center gap-2 bg-botao rounded-lg px-4 py-2 w-3/4">
        <label htmlFor="busca"><FaSearch className="text-white" /></label>
        <input type="text" id="busca" placeholder="Digite o que procura..." 
        className="focus:outline-none w-full text-white"/>
      </form>
      <ImportButton />
      <button><FaFilter className="text-white w-15 h-7" /></button>
      <button className="rounded-lg bg-card px-4 py-2"></button>
    </header>
  );
}

export default Header;