import { open } from "@tauri-apps/plugin-dialog";
import { FaRegPlusSquare } from "react-icons/fa";

function ImportButton() {
    
    async function ImportUwU() {
        const arquivo = await open({
            multiple: false,
            filters: [
                { name: "Mídias", extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif"] }
            ]
        });
        console.log(arquivo);
  }
  return (
    <button onClick={ImportUwU} className="px-3 py-2 bg-botao rounded-lg text-white transition-colors
    focus:outline-3 hover:bg-botao/80 focus:outline-offset-2 focus:outline-botao flex items-center gap-1
    font-Alexandria font-[500]">
      <FaRegPlusSquare className="text-lg" /> IMPORTAR
    </button>
  )
}

export default ImportButton;