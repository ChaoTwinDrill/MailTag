import { tags } from "./tag";

export interface Media 
{
    id: string;
    name: string;
    src: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    width: number;
    height: number;
    tags: tags[];
}

