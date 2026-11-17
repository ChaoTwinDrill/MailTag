import type { MouseEvent } from "react";
import type { tags } from "./types/tag";
import TagChip from "./TagChip";
import { agruparPorCategoria } from "../lib/tags";

type TagGroupsProps = {
  tags: tags[];
  allTags: tags[];
  onClick?: (tag: tags, e: MouseEvent) => void;
  onContextMenu?: (tag: tags, e: MouseEvent) => void;
  onRemove?: (tag: tags) => void; // clique do meio
};

export default function TagGroups({
  tags: lista,
  allTags,
  onClick,
  onContextMenu,
  onRemove,
}: TagGroupsProps) {
  const grupos = agruparPorCategoria(lista, allTags);

  if (grupos.length === 0) return null;

  return (
    <div className="m-2 flex flex-col gap-3">
      {grupos.map((grupo) => (
        <div
          key={grupo.chave}
          className="relative mt-3 min-w-0 rounded-b-lg rounded-t-lg border-b-15 border-t-25 border-card bg-fundo p-2"
        >
          {grupo.categoria && (
            <span className="absolute -top-[25px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-card px-2 font-semibold text-white">
              {grupo.categoria.name}
            </span>
          )}

          <div className="flex flex-wrap gap-2">
            {grupo.tags.map((tag) => (
              <TagChip
                key={tag.id}
                onClick={onClick}
                tag={tag}
                tamanho="md"
                onContextMenu={onContextMenu}
                onMiddleClick={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
