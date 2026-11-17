import { useState } from "react";
import type { tags } from "./types/tag";
import TagMultiSelect from "./TagMultiSelect";
import { FaTimes } from "react-icons/fa";
import { tagQueUsaNome } from "../lib/tags";

type TagEditorProps = {
  tag: tags;
  allTags: tags[];
 onSave: (
  tagId: string,
  nome: string,
  cor: string | null,
  corTexto: string | null,
  temBorda: boolean,
  corBorda: string | null,
  parentTagId: string | null,
  prioridade: number | null,
  sinonimos?: string[]
) => void | Promise<void>;
  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
  onCreateCategory: (nome: string) => Promise<tags | null>;
  onBack: () => void;
};

const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm text-white outline-none focus:ring-2 focus:ring-botao-claro [color-scheme:dark]";

export default function TagEditor({
  tag,
  allTags,
  onSave,
  onChangeAutoTags,
  onCreateCategory,
  onBack,
}: TagEditorProps) {
  const [nome, setNome] = useState(tag.name);
  const [cor, setCor] = useState(tag.color ?? "#6366f1");
  const [corTexto, setCorTexto] = useState(tag.textColor ?? "#ffffff");
  const [temBorda, setTemBorda] = useState(tag.hasBorder);
  const [corBorda, setCorBorda] = useState(tag.borderColor ?? "#ffffff");
  const [parentTagId, setParentTagId] = useState<string | null>(tag.parentTagId);
  const [prioridade, setPrioridade] = useState(tag.priority?.toString() ?? "");
  const [autoIds, setAutoIds] = useState<string[]>(tag.autoTagIds);
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);    
  const [aliases, setAliases] = useState<string[]>(tag.aliases ?? []);
  const [novoAlias, setNovoAlias] = useState("");
  const temFilhas = allTags.some((t) => t.parentTagId === tag.id);

  const categorias = allTags
    .filter((t) => t.parentTagId === null && t.id !== tag.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  async function salvar() {
    const nomeLimpo = nome.trim();
    const numero = prioridade.trim() === "" ? null : Number(prioridade);

    if (!nomeLimpo) {
      alert("O nome da tag não pode ficar vazio.");
      return;
    }

    const dona = tagQueUsaNome(allTags, nomeLimpo, tag.id);

    if (dona) {
      alert(`Já existe uma tag (ou sinônimo) com esse nome: "${dona.name}".`);
      return;
      }

      await onSave(
        tag.id,
        nomeLimpo,
        cor,
        corTexto,
        temBorda,
        corBorda,
        parentTagId,
        Number.isFinite(numero) ? numero : null,
        aliases
      );
        
    


    await onSave(
      tag.id,
      nomeLimpo,
      cor,
      corTexto,
      temBorda,
      corBorda,
      parentTagId,
      Number.isFinite(numero) ? numero : null
    );

    const mudou =
      autoIds.length !== tag.autoTagIds.length ||
      autoIds.some((id) => !tag.autoTagIds.includes(id));

    if (mudou) {
      await onChangeAutoTags(tag.id, autoIds);
    }

    onBack();
  }
  function adicionarAlias() {
      const texto = novoAlias.trim();

      if (!texto) return;

      const minusculo = texto.toLowerCase();

      if (
        minusculo === nome.trim().toLowerCase() ||
        aliases.some((a) => a.toLowerCase() === minusculo)
      ) {
        setNovoAlias("");
        return;
      }

      const dona = tagQueUsaNome(allTags, texto, tag.id);

      if (dona) {
        alert(`"${texto}" já é usado pela tag "${dona.name}".`);
        return;
      }

      setAliases([...aliases, texto]);
      setNovoAlias("");
    }
  async function criarCategoria() {
        const nomeLimpo = nomeCategoria.trim();

        if (!nomeLimpo) {
            alert("Digite um nome para a categoria.");
            return;
        }

        const duplicada = allTags.some(
            (t) => t.name.toLowerCase() === nomeLimpo.toLowerCase()
        );

        if (duplicada) {
            alert("Já existe uma tag com esse nome.");
            return;
        }

        setCriandoCategoria(true);

        try {
            const novaCategoria = await onCreateCategory(nomeLimpo);

            if (novaCategoria) {
            setParentTagId(novaCategoria.id);
            setNomeCategoria("");
            }
        } finally {
            setCriandoCategoria(false);
        }
        }


  return (
    <div className="overflow-y-auto p-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <label className="mb-2 block text-sm text-gray-300">Nome</label>
      <input
        value={nome}
        autoComplete="off"
        autoFocus
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && salvar()}
        className={`${classeCampo} mb-5`}
      />

      <label className="mb-2 block text-sm text-gray-300">
        Categoria pai
      </label>
      <select
        value={parentTagId ?? ""}
        disabled={temFilhas}
        onChange={(e) => setParentTagId(e.target.value || null)}
        className={`${classeCampo} ${temFilhas ? "mb-1" : "mb-5"} disabled:opacity-50`}
      >
        <option value="">Nenhuma</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="mb-5 flex gap-2">
        <input
            value={nomeCategoria}
            onChange={(e) => setNomeCategoria(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                criarCategoria();
            }
            }}
            placeholder="Nova categoria..."
            className={`${classeCampo} min-w-0 flex-1`}
        />

        <button
            type="button"
            disabled={criandoCategoria}
            onClick={criarCategoria}
            className="shrink-0 rounded-md bg-botao px-3 py-2 text-sm hover:brightness-110 disabled:opacity-50"
        >
            {criandoCategoria ? "Criando..." : "Criar"}
        </button>
        </div>

      {temFilhas && (
        <>
          <p className="mb-5 text-sm text-gray-400">
            Esta tag já é categoria de outras tags, por isso não pode ter
            categoria pai.
          </p>

          <label className="mb-2 block text-sm text-gray-300">
            Prioridade da categoria
          </label>
          <input
            type="number"
            step={1}
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            placeholder="Menor número = aparece primeiro"
            className={`${classeCampo} mb-5`}
          />
        </>
      )}

      <label className="mb-2 block text-sm text-gray-300">
        Ao adicionar esta tag, adicionar também
      </label>
      
      <div className="mb-5">
        <TagMultiSelect
          allTags={allTags}
          selectedIds={autoIds}
          onChange={setAutoIds}
          ocultarId={tag.id}
          placeholder="Buscar tag para puxar..."
        />
      </div>
      <label className="mb-2 block text-sm text-gray-300">Sinônimos</label>

        {aliases.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {aliases.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1 rounded bg-fundo px-2 py-1 text-xs font-semibold text-white outline outline-1 outline-botao-claro/50"
              >
                {a}
                <button
                  type="button"
                  title="Remover sinônimo"
                  onClick={() => setAliases(aliases.filter((x) => x !== a))}
                  className="hover:opacity-60"
                >
                  <FaTimes />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          value={novoAlias}
          autoComplete="off"
          onChange={(e) => setNovoAlias(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarAlias();
            }
          }}
          placeholder="Outro nome para esta tag (Enter)..."
          className={`${classeCampo} mb-1`}
        />
        <p className="mb-5 text-xs text-gray-400">
          Buscar ou digitar um sinônimo leva a esta tag.
        </p>
      <label className="mb-2 block text-sm text-gray-300">
        Cor de fundo
      </label>
      <div className="mb-5 flex items-center gap-3">
        <input
          type="color"
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded"
        />
        <span className="text-sm text-gray-400">{cor}</span>
      </div>

      <label className="mb-2 block text-sm text-gray-300">
        Cor do texto
      </label>
      <div className="mb-5 flex items-center gap-3">
        <input
          type="color"
          value={corTexto}
          onChange={(e) => setCorTexto(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded"
        />
        <span className="text-sm text-gray-400">{corTexto}</span>
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={temBorda}
          onChange={(e) => setTemBorda(e.target.checked)}
        />
        <span>Adicionar borda</span>
      </label>

      {temBorda && (
        <div className="mb-5 flex items-center gap-3">
          <input
            type="color"
            value={corBorda}
            onChange={(e) => setCorBorda(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded"
          />
          <span className="text-sm text-gray-400">{corBorda}</span>
        </div>
      )}

      <p className="mb-2 text-sm text-gray-300">Prévia</p>
      <span
        className="mb-6 inline-block rounded px-3 py-2"
        style={{
          backgroundColor: cor,
          color: corTexto,
          border: temBorda ? `2px solid ${corBorda}` : "none",
        }}
      >
        {nome || "Nome da tag"}
      </span>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-botao px-4 py-2 hover:brightness-110"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={salvar}
          className="rounded-md bg-botao-claro px-4 py-2 text-fundo hover:brightness-110"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}