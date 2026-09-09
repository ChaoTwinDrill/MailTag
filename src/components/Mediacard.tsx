import type { Media } from './types/media';

interface MediaCardProps 
{
    media: Media;
}

function MediaCard({media}: MediaCardProps)
{
    return
    (
        <div className="overflow-hidden rounded-lg bg-card">
            <img 
                src={media.src}
                alt={media.name}
                className="w-full object-cover"
            >  </img>
        </div>  
    )
}

export default MediaCard;