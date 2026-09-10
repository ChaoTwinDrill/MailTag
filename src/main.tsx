import React from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import Header from "./components/Header.tsx";
import Mediagrid from "./components/Mediagrid.tsx";
import { Media } from "./components/types/media.ts";

  const medias: Media[] = [
  {
    id: "1",
    name: "Neeko",
    src: "./ahri.jpg",
  },
  {
    id: "2",
    name: "Ahri",
    src: "./ahri.webp",
  },
  {
    id: "3",
    name: "boho",
    src: "./bobooh.jpg",
  },
  {
    id: "4",
    name: "ko",
    src: "./vboho.webp",
  },
  {
    id: "5",
    name: "Ahri",
    src: "./neeko-lol-splash.avif",
  },
  {
    id: "6",
    name: "Ahri",
    src: "./boho.webp",
  },
  {
    id: "7",
    name: "Ahri",
    src: "./SINCLAS.png",
  },
  {
    id: "8",
    name: "Ahri",
    src: "./images.jpg",
  },
  {
    id: "9",
    name: "Ahri",
    src: "./horizontal.jpg",
  },
  {
    id: "10",
    name: "Ahri",
    src: "./maquina.jpg",
  },
];


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <main className="flex h-screen flex-col overflow-hidden">
      <Header />
      

<Mediagrid medias={medias} />
    </main>
);
