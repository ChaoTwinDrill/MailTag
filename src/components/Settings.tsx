import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FaUserCircle } from "react-icons/fa";
import { prepararAvatar } from "../lib/avatar";
import { urlDeEmbed } from "../lib/modoDiscreto";

type SettingsProps = {
  onClose: () => void;
  avatarUrl: string | null;
  onChangeAvatar: (dataUrl: string | null) => void;
  discretoLink: string;
  onChangeDiscretoLink: (link: string) => void;
};

function Settings({ onClose, 
onChangeAvatar,
avatarUrl,
discretoLink,
onChangeDiscretoLink,

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
              <section className="mt-8">
                <h3 className="mb-3 text-sm font-bold uppercase text-white/60">
                  Modo discreto
                </h3>

                <p className="mb-2 text-sm text-white/70">
                  Aperte F12 para cobrir a tela e tocar este vídeo. F12 de novo volta ao app.
                </p>

                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Link do YouTube"
                  value={discretoLink}
                  onChange={(e) => onChangeDiscretoLink(e.target.value)}
                  className="w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />

                {discretoLink.trim() &&
                  (urlDeEmbed(discretoLink) ? (
                    <p className="mt-1 text-xs text-green-400">Link válido.</p>
                  ) : (
                    <p className="mt-1 text-xs text-red-400">
                      Não parece um link do YouTube.
                    </p>
                  ))}
              </section>
      </div>
    </div>
  );
}

export default Settings;