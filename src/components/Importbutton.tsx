import { open } from "@tauri-apps/plugin-dialog";

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
    <button onClick={ImportUwU} >
      Importar Mídia
    </button>
  )
}

export default ImportButton;