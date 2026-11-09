import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FaUserCircle } from "react-icons/fa";
import { prepararAvatar } from "../lib/avatar";

type SettingsProps = {
  onClose: () => void;
  avatarUrl: string | null;
  onChangeAvatar: (dataUrl: string | null) => void;
};

function Settings({ onClose, 
onChangeAvatar,
avatarUrl
}: SettingsProps) {


 const inputRef = useRef<HTMLInputElement>(null);
 const [mensagemErro, setMensagemErro] = useState("");   
 
 async function aoEscolher(e: ChangeEvent<HTMLInputElement>) {
  const arquivo = e.target.files?.[0];
   e.target.value = "";

  if (!arquivo) return;

  try {
    setMensagemErro("");
    onChangeAvatar(await prepararAvatar(arquivo));
  } catch (erro) {
    setMensagemErro(
      erro instanceof Error ? erro.message : "Não foi possível usar essa imagem."
    );
  }
}
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== "Escape") return;

      e.stopPropagation();
      onClose();
    }

    window.addEventListener("keydown", aoTeclar, true);

    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [onClose]);

  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="min-h-[400px] w-[600px] max-w-[90vw] rounded-xl bg-base p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Configurações</h2>

          <button
            onClick={onClose}
            title="Fechar"
            className="text-white hover:opacity-60"
          >
            ✕
          </button>
        </div>

        <section>
  <h3 className="mb-3 text-sm font-bold uppercase text-white/60">Conta</h3>

  <div className="flex items-center gap-4">
    {avatarUrl ? (
      <img
        src={avatarUrl}
        alt="Seu avatar"
        className="h-24 w-24 rounded-xl object-cover"
        />
    ) : (
      <FaUserCircle className="h-24 w-24 text-white/60" />
    )}

    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-botao px-4 py-2 hover:brightness-110"
      >
        Escolher imagem
      </button>

      {avatarUrl && (
            <button
            type="button"
            onClick={() => onChangeAvatar(null)}
            className="rounded-md bg-botao px-4 py-2 text-red-400 hover:brightness-110"
            >
            Remover
            </button>
                    )}
                    </div>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={aoEscolher}
                />

                {mensagemErro && (
                    <p className="mt-2 text-sm text-red-400">{mensagemErro}</p>
                )}
                </section>
      </div>
    </div>
  );
}

export default Settings;