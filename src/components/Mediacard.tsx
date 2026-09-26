import type { Media } from './types/media';

interface MediaCardProps 
{
    media: Media;
    onSelectMedia: (media: Media | null) => void;
    selected: boolean;
}

function MediaCard({media, onSelectMedia, selected}: MediaCardProps)
{
    return (
        <div className={`overflow-hidden rounded-lg bg-card cursor-pointer ${selected ? 'outline outline-4 outline-purple-200 outline-offset brightness-69' : ''}`}
            onClick={() => onSelectMedia(media)} >
            <img 
                src={media.src}
                alt={media.name}
                className="w-full object-cover"
            />
        </div>  
    )
}

export default MediaCard;