export interface tags {
    id: string;
    libraryId: string;
    name: string;
    color: string | null;
    description: string | null;
    parentTagId: string | null;
    createdAt: Date;
    modifiedAt: Date;
}