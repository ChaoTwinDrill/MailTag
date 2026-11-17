import type { tags } from "./tag";

export interface Media {
    id: string;
    libraryId: string;
    name: string;
    src: string;
    r2Key: string;
    mimeType: string | null;
    size: number;
    createdAt: Date | null;
    modifiedAt: Date | null;
    width: number | null;
    height: number | null;
    tags: tags[];
    extension: string | undefined;
    previousMediaId?: string | null;
    thumbnailR2Key: string | null;
    thumbnailSrc: string;
    durationSeconds?: number | null;
    createdBy?: string | null;
}