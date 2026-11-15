export type ModoApp = "imagens" | "livros";

export interface Book {
    id: string;
    libraryId: string;
    name: string;
    coverMediaId: string | null;
    coverThumbnailR2Key: string | null;
    pageCount: number;
    tagIds: string[];
    createdAt: Date;
    modifiedAt: Date;
    previousBookId?: string | null;
    coverR2Key: string | null;
}