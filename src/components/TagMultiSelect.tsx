import type { tags } from "./types/tag";
import TagChip from "./TagChip";
import TagSearch from "./TagSearch";

type TagMultiSelectProps = {
  allTags: tags[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  rotulo?: string;
  placeholder?: string;
  // Uma tag que nunca pode ser escolhida (ex.: a que está sendo editada)
  ocultarId?: string;
  // Se informado, Enter com um nome novo cria a tag e já a seleciona
  onCreate?: (nome: string) => Promise<tags | null>;
  removerTitulo?: string;
  autoFocus?: boolean;
};

export default function TagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  rotulo,
  placeholder,
  ocultarId,
  onCreate,
  removerTitulo,
  autoFocus,
}: TagMultiSelectProps) {
  const excluirIds = ocultarId ? [...selectedIds, ocultarId] : selectedIds;

  function adicionar(id: string) {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
  }

  return (
    <div>
      {rotulo && <p className="mb-1 text-xs text-gray-300">{rotulo}</p>}

      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const tag = allTags.find((t) => t.id === id);

            if (!tag) return null;

            return (
              <TagChip
                key={id}
                tag={tag}
                removerTitulo={removerTitulo}
                onRemove={() => onChange(selectedIds.filter((s) => s !== id))}
              />
            );
          })}
        </div>
      )}

      <TagSearch
        allTags={allTags}
        excluirIds={excluirIds}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onPick={(tag) => adicionar(tag.id)}
        onCreate={
          onCreate
            ? async (nome) => {
                const nova = await onCreate(nome);

                if (nova) adicionar(nova.id);
              }
            : undefined
        }
      />
    </div>
  );
}
