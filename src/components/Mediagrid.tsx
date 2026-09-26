import type { Media } from './types/media';
import MediaCard from './Mediacard';

type MediagridProps = {
  medias : Media[];
  onSelectMedia: (media: Media | null) => void;
  selectedMedia: Media | null;
};

function Mediagrid({ medias, onSelectMedia, selectedMedia }: MediagridProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 bg-fundo">
          <div className="columns-4 gap-4">
          {medias.map((media) => (
            <div
              key={media.id}
              className="mb-4 break-inside-avoid"
            >
              <MediaCard media={media} 
              onSelectMedia={onSelectMedia}
              selected={selectedMedia?.id === media.id}
        />
            </div>
          ))}
      </div>
</div>
      <div className="w-1/4 shrink-0 bg-base p-4 text-white">
        Informações da mídia
      </div>

    </div>
);
}

export default Mediagrid;