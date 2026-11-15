import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

// Devolve true enquanto há arquivos sendo arrastados sobre a janela
export function useArrastarSoltar(aoSoltar: (caminhos: string[]) => void) {
  const [arrastando, setArrastando] = useState(false);
  const aoSoltarRef = useRef(aoSoltar);

  useEffect(() => {
    aoSoltarRef.current = aoSoltar;
  });

  useEffect(() => {
    let cancelado = false;
    let desligar: (() => void) | null = null;

    getCurrentWebview()
      .onDragDropEvent((evento) => {
        const p = evento.payload;

        if (p.type === "enter" || p.type === "over") {
          setArrastando(true);
        } else if (p.type === "leave") {
          setArrastando(false);
        } else if (p.type === "drop") {
          setArrastando(false);
          aoSoltarRef.current(p.paths);
        }
      })
      .then((fn) => {
        if (cancelado) fn();
        else desligar = fn;
      })
      .catch((erro) => console.error("Erro ao ouvir arrastar e soltar:", erro));

    return () => {
      cancelado = true;
      desligar?.();
    };
  }, []);

  return arrastando;
}