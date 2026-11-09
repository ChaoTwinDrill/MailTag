import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FaTimes, FaArrowUp, FaArrowDown } from "react-icons/fa";
import type { tags } from "./types/tag";
import { supabase } from "../lib/supabase";
import { LIBRARY_ID } from "../lib/library";
import { executarComLimite, importarArquivo } from "./Importbutton";






type Props = {
  aberto: boolean;
  allTags: tags[];
  categoriaPadraoId: string | null;
  onCreateTag: (nome: string, categoriaId?: string | null) => Promise<tags | null>;
  onClose: () => void;
  onCreated: () => void;
};

const EXTENSOES = ["png", "jpg", "jpeg", "gif", "webp", "avif"];

const nomeDe = (caminho: string) => caminho.split(/[\\/]/).pop() ?? caminho;

const ordenar = (lista: string[]) =>
  [...lista].sort((a, b) =>
    nomeDe(a).localeCompare(nomeDe(b), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    })
  );

const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400";

function estilo(t: tags) {
  return {
    backgroundColor: t.color ?? "#555555",
    color: t.textColor ?? "#ffffff",
    border: t.hasBorder ? `2px solid ${t.borderColor ?? "#ffffff"}` : "none",
  };
}


function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;

  if (erro && typeof erro === "object") {
    const e = erro as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return [e.message, e.details, e.hint, e.code && `(código ${e.code})`]
      .filter(Boolean)
      .join("\n");
  }

  return String(erro);
}


function CreateBook({
  aberto,
  allTags,
  categoriaPadraoId,
  onCreateTag,
  onClose,
  onCreated,
}: Props) {
  const [nome, setNome] = useState("");
  const [paginas, setPaginas] = useState<string[]>([]);
  const [capa, setCapa] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [textoTag, setTextoTag] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (aberto) return;
    setNome("");
    setPaginas([]);
    setCapa(null);
    setTagIds([]);
    setTextoTag("");
  }, [aberto]);

  useEffect(() => {
    if (!aberto || enviando) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, enviando, onClose]);

  if (!aberto) return null;

  const busca = textoTag.trim().toLowerCase();

  const sugestoes = busca
    ? allTags
        .filter((t) => !tagIds.includes(t.id) && t.name.toLowerCase().includes(busca))
        .slice(0, 20)
    : [];

  async function adicionarPaginas() {
    const escolhidas = await open({
      multiple: true,
      directory: false,
      filters: [{ name: "Imagens", extensions: EXTENSOES }],
    });

    if (!escolhidas) return;

    setPaginas((atuais) => ordenar([...new Set([...atuais, ...escolhidas])]));
  }

  async function escolherCapa() {
    const arquivo = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Imagens", extensions: EXTENSOES }],
    });

    if (arquivo) setCapa(arquivo);
  }

  function mover(indice: number, delta: number) {
    setPaginas((atuais) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atuais.length) return atuais;

      const copia = [...atuais];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  async function confirmarTag() {
    const nomeTag = textoTag.trim();
    if (!nomeTag) return;

    const existente = allTags.find((t) => t.name.toLowerCase() === nomeTag.toLowerCase());
    const tag = existente ?? (await onCreateTag(nomeTag, categoriaPadraoId));

    if (tag && !tagIds.includes(tag.id)) setTagIds((atuais) => [...atuais, tag.id]);
    setTextoTag("");
  }

  async function criar() {
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) return alert("Dê um nome ao livro.");
    if (paginas.length === 0) return alert("Adicione pelo menos uma página.");

    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;

    if (!token) return alert("Você precisa estar logado.");

    setEnviando(true);

    const bookId = crypto.randomUUID();

    try {
      const { error } = await supabase
        .from("books")
        .insert({ id: bookId, library_id: LIBRARY_ID, name: nomeLimpo });

      if (error) throw error;

      const tarefas = [
        ...(capa
          ? [{ caminho: capa, livro: { book_id: bookId, book_role: "cover" as const, page_position: null } }]
          : []),
        ...paginas.map((caminho, i) => ({
          caminho,
          livro: { book_id: bookId, book_role: "page" as const, page_position: i + 1 },
        })),
      ];

      setTotal(tarefas.length);
      setProgresso(0);

      let feitos = 0;

      const resultados = await executarComLimite(tarefas, 3, async (t, i) => {
        const r = await importarArquivo(
          t.caminho,
          `[${i + 1}/${tarefas.length}] ${nomeDe(t.caminho)}`,
          token,
          t.livro
        );
        setProgresso(++feitos);
        return r;
      });

      const falhas: string[] = [];
      let capaId: string | null = null;

      resultados.forEach((r, i) => {
        if ("midia" in r) {
          const ehCapa = tarefas[i].livro.book_role === "cover";
          if (ehCapa || (!capa && capaId === null)) capaId = r.midia.id;
        } else {
          falhas.push(`• ${r.nome}: ${r.erro}`);
        }
      });

      // Nada foi enviado: não deixa um livro vazio
      if (resultados.every((r) => !("midia" in r))) {
        await supabase.from("books").delete().eq("id", bookId);
        throw new Error(falhas.slice(0, 5).join("\n"));
      }

      if (capaId) {
        await supabase.from("books").update({ cover_media_id: capaId }).eq("id", bookId);
      }

      if (tagIds.length > 0) {
        const { error: erroTags } = await supabase.from("book_tags").insert(
          tagIds.map((tag_id) => ({ library_id: LIBRARY_ID, book_id: bookId, tag_id }))
        );

        if (erroTags) console.error("Erro ao salvar tags do livro:", erroTags);
      }

      if (falhas.length > 0) {
        alert(`Livro criado, mas alguns arquivos falharam:\n\n${falhas.slice(0, 5).join("\n")}`);
      }

      onCreated();
      onClose();
    } catch (erro) {
      console.error("Erro ao criar livro:", erro);
      alert(`Não foi possível criar o livro.\n\n${mensagemDeErro(erro)}`);
      onCreated();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={() => !enviando && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-base text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-Alexandria text-lg font-[700]">Criar livro</h2>
          <button type="button" onClick={onClose} disabled={enviando} className="hover:opacity-60 disabled:opacity-30">
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <label className="mb-1 block text-sm text-gray-300">Nome</label>
          <input
            autoFocus
            autoComplete="off"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={`${classeCampo} mb-5`}
          />

          <label className="mb-1 block text-sm text-gray-300">Tags</label>

          {tagIds.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {tagIds.map((id) => {
                const tag = allTags.find((t) => t.id === id);
                if (!tag) return null;

                return (
                  <span key={id} className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold" style={estilo(tag)}>
                    {tag.name}
                    <button type="button" onClick={() => setTagIds(tagIds.filter((t) => t !== id))} className="hover:opacity-60">
                      <FaTimes />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <input
            autoComplete="off"
            placeholder="Digite uma tag e tecle Enter..."
            value={textoTag}
            onChange={(e) => setTextoTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmarTag();
              }
            }}
            className={classeCampo}
          />

          {sugestoes.length > 0 && (
            <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {sugestoes.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setTagIds([...tagIds, tag.id]);
                    setTextoTag("");
                  }}
                  className="rounded px-2 py-1 text-xs font-bold hover:brightness-125"
                  style={estilo(tag)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <div className="mb-5 mt-5 flex items-center gap-3">
            <button type="button" onClick={escolherCapa} className="rounded-md bg-botao px-3 py-2 text-sm hover:brightness-110">
              Escolher capa
            </button>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-300">
              {capa ? nomeDe(capa) : "Sem capa: usa a primeira página"}
            </span>
            {capa && (
              <button type="button" onClick={() => setCapa(null)} className="hover:opacity-60">
                <FaTimes />
              </button>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-300">
              {paginas.length} {paginas.length === 1 ? "página" : "páginas"}
            </span>
            <div className="flex gap-2">
              {paginas.length > 1 && (
                <button type="button" onClick={() => setPaginas(ordenar(paginas))} className="rounded-md bg-botao px-3 py-1.5 text-sm hover:brightness-110">
                  Ordenar por nome
                </button>
              )}
              <button type="button" onClick={adicionarPaginas} className="rounded-md bg-botao-claro px-3 py-1.5 text-sm text-fundo hover:brightness-110">
                Adicionar páginas
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {paginas.map((caminho, i) => (
              <div key={caminho} className="mb-1 flex items-center gap-2 rounded-md bg-fundo p-2 text-sm">
                <span className="w-8 shrink-0 text-gray-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{nomeDe(caminho)}</span>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="hover:opacity-60 disabled:opacity-20"><FaArrowUp /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === paginas.length - 1} className="hover:opacity-60 disabled:opacity-20"><FaArrowDown /></button>
                <button type="button" onClick={() => setPaginas(paginas.filter((p) => p !== caminho))} className="hover:opacity-60"><FaTimes /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border p-3 text-sm">
          <span className="text-gray-300">
            {enviando ? `Enviando ${progresso} de ${total}...` : ""}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={enviando} className="rounded-md bg-botao px-4 py-2 hover:brightness-110 disabled:opacity-40">
              Cancelar
            </button>
            <button type="button" onClick={criar} disabled={enviando} className="rounded-md bg-botao-claro px-4 py-2 text-fundo hover:brightness-110 disabled:opacity-40">
              {enviando ? "Criando..." : "Criar livro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateBook;