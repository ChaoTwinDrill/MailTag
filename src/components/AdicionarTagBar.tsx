import { useEffect, useState } from "react";
import type { tags } from "./types/tag";
import TagChip from "./TagChip";
import TagAtalhos from "./TagAtalhos";
import { acharTagPorNome, sugerirTags } from "../lib/tags";
import { registrarUsoDeTag } from "../lib/tagPrefs";

type AdicionarTagBarProps = {
  // Muda quando o item selecionado muda (fecha o campo e limpa o texto)
  resetKey: string;
  // Tags que o item já tem (não aparecem nas sugestões)
  tagIdsAtuais: string[];
  allTags: tags[];
  onAddTag: (nomeTag: string) => void;
};

export default function AdicionarTagBar({
  resetKey,
  tagIdsAtuais,
  allTags,
  onAddTag,
}: AdicionarTagBarProps) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    setAberto(false);
    setTexto("");
  }, [resetKey]);

  const sugestoes = aberto ? sugerirTags(allTags, texto, tagIdsAtuais, 40) : [];

  function abrir() {
    setTexto("");
    setAberto(true);
  }

  function fechar() {
    setTexto("");
    setAberto(false);
  }

  function adicionar(nome: string) {
    // Se for um sinônimo, adiciona (e lembra) o nome da tag de verdade
    const nomeFinal = acharTagPorNome(allTags, nome)?.name ?? nome;

    onAddTag(nomeFinal);
    registrarUsoDeTag(nomeFinal);
    fechar();
  }

  function confirmar() {
    const nome = texto.trim();

    if (!nome) return;

    adicionar(nome);
  }

  // Enter, fora de qualquer campo, abre a barra
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== "Enter" || aberto) return;

      // Não abre por baixo de um painel ou modal
      if (document.querySelector("[data-painel-filtros]")) return;

      const alvo = e.target as HTMLElement;

      if (
        alvo.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(alvo.tagName)
      ) {
        return;
      }

      abrir();
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  if (!aberto) {
    return (
      <button
        type="button"
        data-adicionar-tag
        onClick={abrir}
        className="fixed bottom-0 left-3/4 z-50 flex w-1/4 items-center justify-center bg-botao py-1 font-Alexandria font-[500] text-white"
      >
        Adicionar Tag
      </button>
    );
  }

  return (
    <>
      {texto.trim() === "" ? (
        // Sem texto: favoritas e recentes (some sozinho se não houver nenhuma)
        <div
          data-adicionar-tag
          className="fixed bottom-8 left-3/4 z-40 max-h-56 w-1/4 overflow-y-auto bg-gradient-to-t from-fundo/90 to-fundo/30 p-2 backdrop-blur-sm empty:hidden"
        >
          <TagAtalhos
            allTags={allTags}
            excluirIds={tagIdsAtuais}
            onPick={(tag) => adicionar(tag.name)}
          />
        </div>
      ) : (
        sugestoes.length > 0 && (
          <div
            data-adicionar-tag
            className="fixed bottom-8 left-3/4 z-40 max-h-40 w-1/4 overflow-y-auto bg-gradient-to-t from-fundo/60 to-fundo/10 p-2"
          >
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((tag) => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  tamanho="md"
                  manterFoco
                  onClick={(t) => adicionar(t.name)}
                />
              ))}
            </div>
          </div>
        )
      )}

      <div data-adicionar-tag className="fixed bottom-0 left-3/4 z-50 w-1/4">
        <input
          autoFocus
          autoComplete="off"
          placeholder="Digite uma tag..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") fechar();
          }}
          className="w-full bg-botao py-1 pl-2 font-Alexandria font-[500] text-white focus:outline-none"
        />
      </div>
    </>
  );
}