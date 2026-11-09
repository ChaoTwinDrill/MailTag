import { obterArquivoCacheado, removerDoCache } from "./lib/cache";
import { useState, useEffect, useMemo, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import CreateBook from "./components/CreateBook.tsx";
import BookFilterPanel from "./components/BookFilterPanel";
import Settings from "./components/Settings.tsx";
import {
  FILTROS_LIVROS_PADRAO,
  contarFiltrosLivrosAtivos,
  filtrarLivros,
  type FiltrosLivros,
} from "./lib/bookFilters";
import { useFilaLivros } from "./lib/fIlaLivros.ts";

import { lerAvatar, salvarAvatar, removerAvatar } from "./lib/avatar";
import Auth from "./components/Auth.tsx";
import Header from "./components/Header.tsx";
import Mediagrid from "./components/Mediagrid.tsx";
import TagManager from "./components/TagManager.tsx";
import BookGrid from "./components/BookGrid.tsx";
import type { Book, ModoApp } from "./components/types/book.ts";


import { supabase } from "./lib/supabase";
import { LIBRARY_ID } from "./lib/library";

import type { Media } from "./components/types/media.ts";
import type { tags } from "./components/types/tag.ts";

import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import FilterPanel from "./components/FilterPanel.tsx";
import {
  FILTROS_PADRAO,
  contarFiltrosAtivos,
  filtrarMedias,
  type Filtros,
} from "./lib/filtros";


import "./global.css";

  const WORKER_URL = "https://mailtag-api.oririkkj.workers.dev";
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = Record<string, any>;

      function converterTag(tag: Linha): tags {
        return {
          id: tag.id,
          libraryId: tag.library_id,
          name: tag.name,
          color: tag.color,
          description: tag.description,
          parentTagId: tag.parent_tag_id,
          createdAt: new Date(tag.created_at),
          modifiedAt: new Date(tag.updated_at),
          hasBorder: tag.has_border,
          borderColor: tag.border_color,
          textColor: tag.text_color,
          priority: tag.priority ?? null,
          autoTagIds: tag.auto_tag_ids ?? [],
        };
      }

      function converterMedia(media: Linha): Media {
        return {
          id: media.id,
          libraryId: media.library_id,
          name: media.name,
          src: "",
          r2Key: media.r2_key,
          mimeType: media.mime_type,
          size: Number(media.size_bytes),
          createdAt: media.file_created_at ? new Date(media.file_created_at) : null,
          modifiedAt: media.file_modified_at ? new Date(media.file_modified_at) : null,
          width: media.width,
          height: media.height,
          extension: media.name.split(".").pop()?.toLowerCase(),
          thumbnailR2Key: media.thumbnail_r2_key,
          thumbnailSrc: "",
          tags: [],
        };
      }

  async function buscarTodos<T>(
  consulta: (
    de: number,
    ate: number
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const TAMANHO_PAGINA = 1000;
  const todos: T[] = [];

  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await consulta(
      inicio,
      inicio + TAMANHO_PAGINA - 1
    );

    if (error) throw error;
    if (!data) break;

    todos.push(...data);

    if (data.length < TAMANHO_PAGINA) break;
  }

  return todos;
}
async function carregarLivros(): Promise<Book[]> {
  const [livros, associacoes, paginas] = await Promise.all([
    buscarTodos((de, ate) =>
      supabase
        .from("books")
        .select("*")
        .eq("library_id", LIBRARY_ID)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(de, ate)
    ),
    buscarTodos((de, ate) =>
      supabase
        .from("book_tags")
        .select("book_id, tag_id")
        .eq("library_id", LIBRARY_ID)
        .order("book_id")
        .order("tag_id")
        .range(de, ate)
    ),
    buscarTodos((de, ate) =>
      supabase
        .from("medias")
        .select("id, book_id")
        .eq("library_id", LIBRARY_ID)
        .eq("book_role", "page")
        .is("deleted_at", null)
        .order("id")
        .range(de, ate)
    ),
  ]);

  // Miniaturas das capas, em lotes para não estourar o tamanho da URL
  const capaIds: string[] = livros
    .map((l) => l.cover_media_id)
    .filter((id): id is string => Boolean(id));

    const miniaturaPorCapa = new Map<string, string | null>();
    const originalPorCapa = new Map<string, string | null>();

  
    for (let i = 0; i < capaIds.length; i += 100) {
  const { data, error } = await supabase
    .from("medias")
    .select("id, thumbnail_r2_key, r2_key")
    .in("id", capaIds.slice(i, i + 100));

  if (error) throw error;

  for (const capa of data ?? []) {
    miniaturaPorCapa.set(capa.id, capa.thumbnail_r2_key);
    originalPorCapa.set(capa.id, capa.r2_key);
  }
}

  const tagIdsPorLivro = new Map<string, string[]>();

  for (const a of associacoes) {
    const lista = tagIdsPorLivro.get(a.book_id);
    if (lista) lista.push(a.tag_id);
    else tagIdsPorLivro.set(a.book_id, [a.tag_id]);
  }

  const paginasPorLivro = new Map<string, number>();

  for (const p of paginas) {
    paginasPorLivro.set(p.book_id, (paginasPorLivro.get(p.book_id) ?? 0) + 1);
  }

  return livros.map((l) => ({
    id: l.id,
    libraryId: l.library_id,
    name: l.name,
    coverMediaId: l.cover_media_id,
    coverThumbnailR2Key: l.cover_media_id
      ? miniaturaPorCapa.get(l.cover_media_id) ?? null
      : null,
    coverR2Key: l.cover_media_id
    ? originalPorCapa.get(l.cover_media_id) ?? null
    : null,
    pageCount: paginasPorLivro.get(l.id) ?? 0,
    tagIds: tagIdsPorLivro.get(l.id) ?? [],
    createdAt: new Date(l.created_at),
    modifiedAt: new Date(l.updated_at),
  }));
}


function App() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [buscaTagIds, setBuscaTagIds] = useState<string[]>([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [todasTags, setTodasTags] = useState<tags[]>([]);
  const [mostrarAuth, setMostrarAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [galeriaCarregada, setGaleriaCarregada] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [tentativaGaleria, setTentativaGaleria] = useState(0);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false);
  const todasTagsRef = useRef<tags[]>([]);
  const [modo, setModo] = useState<ModoApp>("imagens");
  const [livros, setLivros] = useState<Book[]>([]);
  const [versaoLivros, setVersaoLivros] = useState(0);
  const [criandoLivro, setCriandoLivro] = useState(false);
  const fila = useFilaLivros(user?.id ?? null, livros);
  const [configAberta, setConfigAberta] = useState(false);
  const [filtrosLivros, setFiltrosLivros] =
  useState<FiltrosLivros>(FILTROS_LIVROS_PADRAO);


  useEffect(() => {
  setAvatar(user ? lerAvatar(user.id) : null);
}, [user]);

    
  const [categoriaPadraoId, setCategoriaPadraoId] = useState<string | null>(() => {
  try {
    return localStorage.getItem("categoriaPadraoId");
  } catch {
    return null;
  }
});

    async function definirTagsAutomaticas(tagId: string, ids: string[]) {
        const limpos = ids.filter((id) => id !== tagId);

        const { data, error } = await supabase
          .from("tags")
          .update({ auto_tag_ids: limpos, updated_at: new Date().toISOString() })
          .eq("library_id", LIBRARY_ID)
          .eq("id", tagId)
          .select()
          .single();

        if (error) {
          console.error("Erro ao salvar tags automáticas:", error);
          alert("Não foi possível salvar as tags automáticas.");
          return;
        }

        const atualizada = converterTag(data);

        setTodasTags((atuais) => atuais.map((t) => (t.id === tagId ? atualizada : t)));
      }


function alterarCategoriaPadrao(id: string | null) {
  setCategoriaPadraoId(id);

  try {
    if (id) localStorage.setItem("categoriaPadraoId", id);
    else localStorage.removeItem("categoriaPadraoId");
  } catch {
  }
}

// Só vale se a tag ainda existir e continuar sendo uma categoria (sem pai)
const categoriaPadrao =
  todasTags.find((t) => t.id === categoriaPadraoId && t.parentTagId === null) ??
  null;

    useEffect(() => {
      async function aoTeclar(e: KeyboardEvent) {
        if (e.key !== "F11") return;

        e.preventDefault();

        try {
          const janela = getCurrentWindow();
          await janela.setFullscreen(!(await janela.isFullscreen()));
        } catch (erro) {
          console.error("Erro ao alternar tela cheia:", erro);
        }
      }

      window.addEventListener("keydown", aoTeclar);

      return () => window.removeEventListener("keydown", aoTeclar);
    }, []);

    useEffect(() => {
      todasTagsRef.current = todasTags;
    }, [todasTags]);
  // Autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {

      setUser(data.session?.user ?? null);
      setVerificandoSessao(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setVerificandoSessao(false);

      if (session) {
        setMostrarAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

   useEffect(() => {
        async function verificarAtualizacao() {
          try {
            const update = await check();

            if (update) {
              setAvailableUpdate(update);
              setUpdateAvailable(true);
              console.log("Atualização disponível:", update.version);
            }
          } catch (erro) {
            console.error("Erro ao verificar atualização:", erro);
          }
        }

        verificarAtualizacao();

        const intervalo = setInterval(verificarAtualizacao, 60 * 60 * 1000);

        return () => clearInterval(intervalo);
      }, []);

          // Excluir mídia
    async function removerMedia(media: Media) {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          alert("Usuário não autenticado.");
          return;
        }

        const token = data.session.access_token;

        //  Banco de dados
        try {
          const { error: erroTags } = await supabase
            .from("media_tags")
            .delete()
            .eq("library_id", LIBRARY_ID)
            .eq("media_id", media.id);

          if (erroTags) throw erroTags;

          const { error: erroMedia } = await supabase
            .from("medias")
            .delete()
            .eq("library_id", LIBRARY_ID)
            .eq("id", media.id);

          if (erroMedia) throw erroMedia;
        } catch (erro) {
          console.error("Erro ao excluir mídia:", erro);
          alert("Não foi possível excluir a mídia. Verifique o console.");
          return;
        }

        setMedias((atuais) => atuais.filter((m) => m.id !== media.id));
        setSelectedMedia((atual) => (atual?.id === media.id ? null : atual));
        await removerDoCache([media.r2Key, media.thumbnailR2Key]);

        try {
          const resposta = await fetch(WORKER_URL, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Library-Id": LIBRARY_ID,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: media.r2Key,
              thumbnailKey: media.thumbnailR2Key,
            }),
          });

          if (!resposta.ok) {
            const resultado = await resposta.json().catch(() => ({}));
            throw new Error(resultado.error || `Status ${resposta.status}`);
          }
        } catch (erro) {
          console.error("Mídia excluída, mas os arquivos ficaram no R2:", media.r2Key, erro);
          alert("A mídia foi excluída, mas os arquivos na nuvem não puderam ser removidos.");
        }
      }

      async function renomearMedia(mediaId: string, novoNome: string) {
  const nome = novoNome.trim();

  if (!nome) return;

  const { error } = await supabase
    .from("medias")
    .update({ name: nome, updated_at: new Date().toISOString() })
    .eq("library_id", LIBRARY_ID)
    .eq("id", mediaId);

  if (error) {
    console.error("Erro ao renomear mídia:", error);
    alert("Não foi possível renomear a mídia.");
    return;
  }

  setMedias((atuais) =>
    atuais.map((m) => (m.id === mediaId ? { ...m, name: nome } : m))
  );

  setSelectedMedia((atual) =>
    atual?.id === mediaId ? { ...atual, name: nome } : atual
  );
}

  // Carregar galeria, mídias e tags
 useEffect(() => {
        let cancelado = false;

        async function carregarGaleria() {
          if (!user) {
            setGaleriaCarregada(false);
            setErroCarregamento(null);
            setMedias([]);
            setSelectedMedia(null);
            return;
          }

          setGaleriaCarregada(false);
          setErroCarregamento(null);

          try {
            const { data: galeria, error: erroGaleria } = await supabase
              .from("libraries")
              .select("id, name")
              .eq("id", LIBRARY_ID)
              .single();

            if (erroGaleria) throw erroGaleria;

            console.log("Galeria carregada:", galeria);

            // A ordenação mantém as páginas estáveis entre as consultas
            const [midias, associacoes, tagsBanco] = await Promise.all([
              buscarTodos((de, ate) =>
                supabase
                  .from("medias")
                  .select("*")
                  .eq("library_id", LIBRARY_ID)
                  .is("deleted_at", null)
                  .order("created_at", { ascending: false })
                  .is("deleted_at", null)
                  .is("book_id", null)
                  .order("id") // desempate para a paginação ficar estável
                  .range(de, ate)
              ),
              buscarTodos((de, ate) =>
                supabase
                  .from("media_tags")
                  .select("media_id, tag_id")
                  .eq("library_id", LIBRARY_ID)
                  .order("media_id")
                  .order("tag_id")
                  .range(de, ate)
              ),
              buscarTodos((de, ate) =>
                supabase
                  .from("tags")
                  .select("*")
                  .eq("library_id", LIBRARY_ID)
                  .is("deleted_at", null)
                  .order("id")
                  .range(de, ate)
              ),
            ]);

            if (cancelado) return;

           const tagsConvertidas: tags[] = tagsBanco.map(converterTag);

            // Índices para não percorrer as listas inteiras a cada mídia
            const tagPorId = new Map(tagsConvertidas.map((t) => [t.id, t]));
            const tagsPorMidia = new Map<string, tags[]>();

            for (const associacao of associacoes) {
              const tag = tagPorId.get(associacao.tag_id);
              if (!tag) continue;

              const lista = tagsPorMidia.get(associacao.media_id);
              if (lista) lista.push(tag);
              else tagsPorMidia.set(associacao.media_id, [tag]);
            }

            const midiasConvertidas: Media[] = midias.map((media) => ({
              id: media.id,
              libraryId: media.library_id,
              name: media.name,
              src: "",
              r2Key: media.r2_key,
              mimeType: media.mime_type,
              size: Number(media.size_bytes),
              createdAt: media.file_created_at ? new Date(media.file_created_at) : null,
              modifiedAt: media.file_modified_at ? new Date(media.file_modified_at) : null,
              width: media.width,
              height: media.height,
              extension: media.name.split(".").pop()?.toLowerCase(),
              thumbnailR2Key: media.thumbnail_r2_key,
              thumbnailSrc: "",
              tags: tagsPorMidia.get(media.id) ?? [],
            }));

            setTodasTags(tagsConvertidas);
            setMedias(midiasConvertidas);
            setSelectedMedia(null);
            setGaleriaCarregada(true);
          } catch (erro) {
            if (cancelado) return;

            console.error("Erro ao carregar galeria:", erro);
            setErroCarregamento(
              (erro as { message?: string })?.message ?? "Erro desconhecido."
            );
          }
        }

        carregarGaleria();

        return () => {
          cancelado = true;
        };
      }, [user, tentativaGaleria]);
     
      function alterarAvatar(dataUrl: string | null) {
        if (!user) return;

        setAvatar(dataUrl);

        if (dataUrl) salvarAvatar(user.id, dataUrl);
        else removerAvatar(user.id);
      }


      useEffect(() => {
  if (!user || !galeriaCarregada) return;

  const filtro = `library_id=eq.${LIBRARY_ID}`;

  function aplicarTag(tag: tags) {
    const trocar = (lista: tags[]) =>
      lista.map((t) => (t.id === tag.id ? tag : t));
    const usa = (m: Media) => m.tags.some((t) => t.id === tag.id);

    setTodasTags((atuais) =>
      atuais.some((t) => t.id === tag.id)
        ? trocar(atuais)
        : [...atuais, tag]
    );
    setMedias((atuais) =>
      atuais.map((m) => (usa(m) ? { ...m, tags: trocar(m.tags) } : m))
    );
    setSelectedMedia((atual) =>
      atual && usa(atual) ? { ...atual, tags: trocar(atual.tags) } : atual
    );
  }

  function removerTagLocal(tagId: string) {
    const sem = (m: Media): Media => ({
      ...m,
      tags: m.tags.filter((t) => t.id !== tagId),
    });

    setTodasTags((atuais) => atuais.filter((t) => t.id !== tagId));
    setBuscaTagIds((atuais) => atuais.filter((id) => id !== tagId));
    setMedias((atuais) => atuais.map(sem));
    setSelectedMedia((atual) => (atual ? sem(atual) : atual));
  }

  function removerMediaLocal(mediaId: string) {
    setMedias((atuais) => atuais.filter((m) => m.id !== mediaId));
    setSelectedMedia((atual) => (atual?.id === mediaId ? null : atual));
  }

  const canal = supabase
    .channel(`galeria-${LIBRARY_ID}`)

    // Mídias
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "medias", filter: filtro },
      (payload) => {
        const linha = payload.new as Linha;
        if (linha.deleted_at || linha.book_id) return;

        const nova = converterMedia(linha);

        setMedias((atuais) =>
          atuais.some((m) => m.id === nova.id) ? atuais : [nova, ...atuais]
        );
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "medias", filter: filtro },
      (payload) => {
        const linha = payload.new as Linha;

        if (linha.deleted_at) {
          removerMediaLocal(linha.id);
          return;
        }

        const atualizar = (m: Media): Media =>
          m.id === linha.id
            ? {
                ...m,
                name: linha.name,
                extension: linha.name.split(".").pop()?.toLowerCase(),
              }
            : m;

        setMedias((atuais) => atuais.map(atualizar));
        setSelectedMedia((atual) => (atual ? atualizar(atual) : atual));
      }
    )
    // O Supabase não aceita filtro em DELETE; remover por id é inofensivo
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "medias" },
      (payload) => {
        const id = (payload.old as Linha).id;
        if (id) removerMediaLocal(id);
      }
    )

    // Tags
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tags", filter: filtro },
      (payload) => {
        const linha = payload.new as Linha;
        if (!linha.deleted_at) aplicarTag(converterTag(linha));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tags", filter: filtro },
      (payload) => {
        const linha = payload.new as Linha;

        if (linha.deleted_at) removerTagLocal(linha.id);
        else aplicarTag(converterTag(linha));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tags" },
      (payload) => {
        const id = (payload.old as Linha).id;
        if (id) removerTagLocal(id);
      }
    )

    // Associações mídia <-> tag
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "media_tags",
        filter: filtro,
      },
      async (payload) => {
        const { media_id, tag_id } = payload.new as Linha;

        let tag = todasTagsRef.current.find((t) => t.id === tag_id);

        // A associação pode chegar antes da própria tag
        if (!tag) {
          const { data } = await supabase
            .from("tags")
            .select("*")
            .eq("id", tag_id)
            .maybeSingle();

          if (!data) return;

          tag = converterTag(data);
          aplicarTag(tag);
        }

        const nova = tag;

        const adicionar = (m: Media): Media =>
          m.id === media_id && !m.tags.some((t) => t.id === nova.id)
            ? { ...m, tags: [...m.tags, nova] }
            : m;

        setMedias((atuais) => atuais.map(adicionar));
        setSelectedMedia((atual) => (atual ? adicionar(atual) : atual));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "media_tags" },
      (payload) => {
        const { media_id, tag_id } = payload.old as Linha;
        if (!media_id || !tag_id) return;

        const remover = (m: Media): Media =>
          m.id === media_id
            ? { ...m, tags: m.tags.filter((t) => t.id !== tag_id) }
            : m;

        setMedias((atuais) => atuais.map(remover));
        setSelectedMedia((atual) => (atual ? remover(atual) : atual));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}, [user, galeriaCarregada]);

  async function selecionarMedia(media: Media | null) {
    if (!media) {
      setSelectedMedia(null);
      return;
    }

    // Exibe imediatamente as informações da mídia
    setSelectedMedia(media);

    // Se o original já estiver carregado, não precisa baixar novamente
    if (media.src) return;

    try {
      const src = await obterArquivoCacheado(media.r2Key);

      // Atualiza a mídia na galeria
      setMedias((mediasAntigas) =>
        mediasAntigas.map((m) =>
          m.id === media.id ? { ...m, src } : m
        )
      );

      // Atualiza a mídia selecionada
      setSelectedMedia((atual) =>
        atual?.id === media.id ? { ...atual, src } : atual
      );

    } catch (erro) {
      console.error("Erro ao carregar original:", erro);
    }
  }
//Criar tag na categoria
  async function criarTagCategoria(nomeTag: string, categoriaId: string | null = null): Promise<tags | null> {
  const nome = nomeTag.trim();

  if (!nome) return null;

  // Verifica se já existe uma tag com esse nome
  const existente = todasTags.find(
    (tag) => tag.name.toLowerCase() === nome.toLowerCase()
  );

  if (existente) return existente;

  const { data, error } = await supabase
    .from("tags")
    .insert({
      library_id: LIBRARY_ID,
      name: nome,
      parent_tag_id: categoriaId,
    })
    .select()
    .single();
    
  if (error) {
    console.error("Erro ao criar tag:", error);
    alert("Não foi possível criar a tag.");
    return null;
  }

  const novaTag = converterTag(data);

  setTodasTags((atuais) => [...atuais, novaTag]);

  return novaTag;
}

  // Adicionar tag
      async function adicionarTag(mediaId: string, nomeTag: string) {
      const nome = nomeTag.trim();

      if (!nome) return;

      const media = medias.find((m) => m.id === mediaId);

      if (!media) return;

      // Evita adicionar a mesma tag duas vezes na mídia
      if (media.tags.some((tag) => tag.name.toLowerCase() === nome.toLowerCase())) {
        return;
      }

      // Procura a tag na galeria
      let { data: tagExistente, error } = await supabase
        .from("tags")
        .select("*")
        .eq("library_id", LIBRARY_ID)
        .eq("name", nome)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error("Erro ao procurar tag:", error);
        return;
      }

      // Cria a tag caso ela ainda não exista
      if (!tagExistente) {
        const { data, error: erroCriacao } = await supabase
          .from("tags")
          .insert({
            library_id: LIBRARY_ID,
            name: nome,
            parent_tag_id: categoriaPadrao?.id ?? null,
          })
          .select()
          .single();

        if (erroCriacao) {
          console.error("Erro ao criar tag:", erroCriacao);
          return;
        }

        tagExistente = data;
      }

      const novaTag = converterTag(tagExistente);

        const aplicar = tagsComImplicadas(novaTag).filter(
          (t) => !media.tags.some((x) => x.id === t.id)
        );

        if (aplicar.length === 0) return;

        const { error: erroAssociacao } = await supabase.from("media_tags").insert(
          aplicar.map((t) => ({
            library_id: LIBRARY_ID,
            media_id: mediaId,
            tag_id: t.id,
          }))
        );

        if (erroAssociacao) {
          console.error("Erro ao associar tag:", erroAssociacao);
          return;
        }

        setTodasTags((atuais) => {
          const novas = aplicar.filter((t) => !atuais.some((a) => a.id === t.id));
          return novas.length ? [...atuais, ...novas] : atuais;
        });

        const adicionar = (m: Media): Media =>
          m.id === mediaId ? { ...m, tags: [...m.tags, ...aplicar] } : m;

        setMedias((atuais) => atuais.map(adicionar));
        setSelectedMedia((atual) => (atual ? adicionar(atual) : atual));
      
      // Converte os dados do Supabase para nossa interface
      
    }

    // A tag + as que ela puxa automaticamente (e as que essas puxam)
      function tagsComImplicadas(tag: tags): tags[] {
        const porId = new Map(todasTags.map((t) => [t.id, t]));
        porId.set(tag.id, tag);

        const resultado: tags[] = [];
        const visitadas = new Set<string>();
        const fila = [tag.id];

        while (fila.length > 0) {
          const id = fila.shift()!;
          if (visitadas.has(id)) continue;
          visitadas.add(id);

          const t = porId.get(id);
          if (!t) continue;

          resultado.push(t);
          fila.push(...t.autoTagIds);
        }

        return resultado;
      }

      async function adicionarTagAoLivro(livroId: string, nomeTag: string) {
          const nome = nomeTag.trim();
          if (!nome) return;

          const livro = livros.find((l) => l.id === livroId);
          if (!livro) return;

          let { data: tagExistente, error } = await supabase
            .from("tags")
            .select("*")
            .eq("library_id", LIBRARY_ID)
            .eq("name", nome)
            .is("deleted_at", null)
            .maybeSingle();

          if (error) {
            console.error("Erro ao procurar tag:", error);
            return;
          }

          if (!tagExistente) {
            const { data, error: erroCriacao } = await supabase
              .from("tags")
              .insert({
                library_id: LIBRARY_ID,
                name: nome,
                parent_tag_id: categoriaPadrao?.id ?? null,
              })
              .select()
              .single();

            if (erroCriacao) {
              console.error("Erro ao criar tag:", erroCriacao);
              alert("Não foi possível criar a tag.");
              return;
            }

            tagExistente = data;
          }

          const tag = converterTag(tagExistente);
          const aplicar = tagsComImplicadas(tag).filter(
            (t) => !livro.tagIds.includes(t.id)
          );

          if (aplicar.length === 0) return;

          const { error: erroAssociacao } = await supabase
            .from("book_tags")
            .insert(
              aplicar.map((t) => ({
                library_id: LIBRARY_ID,
                book_id: livroId,
                tag_id: t.id,
              }))
            );

          if (erroAssociacao) {
            console.error("Erro ao associar tag ao livro:", erroAssociacao);
            alert("Não foi possível adicionar a tag ao livro.");
            return;
          }

          setTodasTags((atuais) => {
            const novas = aplicar.filter((t) => !atuais.some((a) => a.id === t.id));
            return novas.length ? [...atuais, ...novas] : atuais;
          });

          setLivros((atuais) =>
            atuais.map((l) =>
              l.id === livroId
                ? {
                    ...l,
                    tagIds: [...new Set([...l.tagIds, ...aplicar.map((t) => t.id)])],
                  }
                : l
            )
          );
        }
        
async function adicionarTagAosLivros(livroIds: string[], nomeTag: string) {
  const nome = nomeTag.trim();
  if (!nome || livroIds.length === 0) return;

  let { data: tagExistente, error } = await supabase
    .from("tags")
    .select("*")
    .eq("library_id", LIBRARY_ID)
    .eq("name", nome)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Erro ao procurar tag:", error);
    return;
  }

  if (!tagExistente) {
    const { data, error: erroCriacao } = await supabase
      .from("tags")
      .insert({
        library_id: LIBRARY_ID,
        name: nome,
        parent_tag_id: categoriaPadrao?.id ?? null,
      })
      .select()
      .single();

    if (erroCriacao) {
      console.error("Erro ao criar tag:", erroCriacao);
      alert("Não foi possível criar a tag.");
      return;
    }

    tagExistente = data;
  }

  const tag = converterTag(tagExistente);
  const aplicar = tagsComImplicadas(tag);
  const escolhidos = new Set(livroIds);
  const linhas: { library_id: string; book_id: string; tag_id: string }[] = [];

  const novasPorLivro = new Map<string, string[]>();

  for (const livro of livros) {
    if (!escolhidos.has(livro.id)) continue;

    const faltam = aplicar.filter((t) => !livro.tagIds.includes(t.id));
    if (faltam.length === 0) continue;

    novasPorLivro.set(livro.id, faltam.map((t) => t.id));

    for (const t of faltam) {
      linhas.push({
        library_id: LIBRARY_ID,
        book_id: livro.id,
        tag_id: t.id,
      });
    }
  }

  if (linhas.length === 0) return;

  const { error: erroAssociacao } = await supabase
    .from("book_tags")
    .insert(linhas);

  if (erroAssociacao) {
    console.error("Erro ao associar tags aos livros:", erroAssociacao);
    alert("Não foi possível adicionar a tag aos livros.");
    return;
  }

  setTodasTags((atuais) => {
    const novas = aplicar.filter((t) => !atuais.some((a) => a.id === t.id));
    return novas.length ? [...atuais, ...novas] : atuais;
  });

  setLivros((atuais) =>
    atuais.map((livro) => {
      const novas = novasPorLivro.get(livro.id);
      return novas
        ? { ...livro, tagIds: [...new Set([...livro.tagIds, ...novas])] }
        : livro;
    })
  );
}

        async function removerTagDoLivro(livroId: string, tagId: string) {
          const { error } = await supabase
            .from("book_tags")
            .delete()
            .eq("library_id", LIBRARY_ID)
            .eq("book_id", livroId)
            .eq("tag_id", tagId);

          if (error) {
            console.error("Erro ao remover tag do livro:", error);
            alert("Não foi possível remover a tag do livro.");
            return;
          }

          setLivros((atuais) =>
            atuais.map((l) =>
              l.id === livroId
                ? { ...l, tagIds: l.tagIds.filter((id) => id !== tagId) }
                : l
            )
          );
        }

  // Remover tag
  
      async function removerTag(mediaId: string, tagId: string) {
        try {
          const { data, error } = await supabase
            .from("media_tags")
            .delete()
            .eq("library_id", LIBRARY_ID)
            .eq("media_id", mediaId)
            .eq("tag_id", tagId)
            .select();

          console.log("Resultado ao remover associação:", { data, error });

          if (error) throw error;


          setMedias((atuais) =>
            atuais.map((media) =>
              media.id === mediaId
                ? { ...media, tags: media.tags.filter((tag) => tag.id !== tagId) }
                : media
            )
          );
            
          setSelectedMedia((atual) =>
            atual?.id === mediaId
              ? { ...atual, tags: atual.tags.filter((tag) => tag.id !== tagId) }
              : atual
          );
        } catch (erro) {
          console.error("Erro ao remover tag:", erro);


          alert("Não foi possível remover a tag. Verifique o console.");

          
        }
      }
      async function adicionarTagEmVarias(mediaIds: string[], nomeTag: string) {
  const nome = nomeTag.trim();

  if (!nome || mediaIds.length === 0) return;

  let { data: tagExistente, error } = await supabase
    .from("tags")
    .select("*")
    .eq("library_id", LIBRARY_ID)
    .eq("name", nome)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Erro ao procurar tag:", error);
    return;
  }

  if (!tagExistente) {
    const { data, error: erroCriacao } = await supabase
      .from("tags")
      .insert({
        library_id: LIBRARY_ID,
        name: nome,
        parent_tag_id: categoriaPadrao?.id ?? null,
      })
      .select()
      .single();

    if (erroCriacao) {
      console.error("Erro ao criar tag:", erroCriacao);
      alert("Não foi possível criar a tag.");
      return;
    }

    tagExistente = data;
  }

  const tag = converterTag(tagExistente);
    const aplicar = tagsComImplicadas(tag);
    const escolhidos = new Set(mediaIds);

    const novasPorMidia = new Map<string, tags[]>();
    const linhas: { library_id: string; media_id: string; tag_id: string }[] = [];

    for (const m of medias) {
      if (!escolhidos.has(m.id)) continue;

      const faltam = aplicar.filter((t) => !m.tags.some((x) => x.id === t.id));
      if (faltam.length === 0) continue;

      novasPorMidia.set(m.id, faltam);

      for (const t of faltam) {
        linhas.push({ library_id: LIBRARY_ID, media_id: m.id, tag_id: t.id });
      }
    }

    if (linhas.length === 0) return;

    const { error: erroAssociacao } = await supabase
      .from("media_tags")
      .insert(linhas);

    if (erroAssociacao) {
      console.error("Erro ao associar tag:", erroAssociacao);
      alert("Não foi possível adicionar a tag às mídias.");
      return;
    }

    const adicionar = (m: Media): Media => {
      const novas = novasPorMidia.get(m.id);
      return novas ? { ...m, tags: [...m.tags, ...novas] } : m;
    };

    setTodasTags((atuais) => {
      const novas = aplicar.filter((t) => !atuais.some((a) => a.id === t.id));
      return novas.length ? [...atuais, ...novas] : atuais;
    });
    setMedias((atuais) => atuais.map(adicionar));
    setSelectedMedia((atual) => (atual ? adicionar(atual) : atual));
    }
      // Importação
      function adicionarMedias(novasMedias: Media[]) {
        setMedias((mediasAntigas) => {
          const novasPorId = new Map(novasMedias.map((m) => [m.id, m]));

          const atualizadas = mediasAntigas.map((m) => novasPorId.get(m.id) ?? m);
          const existentes = new Set(mediasAntigas.map((m) => m.id));

          const realmenteNovas = [...novasMedias]
            .reverse()
            .filter((m) => !existentes.has(m.id));

          return [...realmenteNovas, ...atualizadas];
        });
      }

        //exclui tag
        async function excluirTag(tagId: string) {
          try {
            const { data: associacoes, error: erroAssociacoes } = await supabase
              .from("media_tags")
              .delete()
              .eq("library_id", LIBRARY_ID)
              .eq("tag_id", tagId)
              .select();

            console.log("Associações removidas:", { associacoes, erroAssociacoes });
            if (erroAssociacoes) throw erroAssociacoes;
            const { error: erroTagsLivros } = await supabase
              .from("book_tags")
              .delete()
              .eq("library_id", LIBRARY_ID)
              .eq("tag_id", tagId);

            if (erroTagsLivros) throw erroTagsLivros;
            

            const { data, error } = await supabase
              .from("tags")
              .delete()
              .eq("library_id", LIBRARY_ID)
              .eq("id", tagId)
              .select();
            console.log("Tag excluída:", { data, error });

            if (error) throw error;

            if (!data || data.length === 0) {
              throw new Error("A tag não foi encontrada ou a exclusão foi bloqueada.");
            }

            setTodasTags((atuais) => atuais.filter((tag) => tag.id !== tagId));

            setMedias((atuais) =>
              atuais.map((media) => ({
                ...media,
                tags: media.tags.filter((tag) => tag.id !== tagId),
              }))
            );
            setLivros((atuais) =>
              atuais.map((livro) => ({
                ...livro,
                tagIds: livro.tagIds.filter((id) => id !== tagId),
              }))
            );
            setSelectedMedia((atual) =>
              atual
                ? {
                    ...atual,
                    tags: atual.tags.filter((tag) => tag.id !== tagId),
                  }
                : atual
            );
          } catch (erro) {
            console.error("Erro ao excluir tag:", erro);
            alert("Não foi possível excluir a tag. Verifique o console.");
          }
        }


        async function personalizarTag(
          tagId: string,
          nome: string,
          cor: string | null,
          corTexto: string | null,
          temBorda: boolean,
          corBorda: string | null,
          parentTagId: string | null,
          prioridade: number | null
        ) {
          try {
            const nomeLimpo = nome.trim();

            if (!nomeLimpo) {
              alert("O nome da tag não pode ficar vazio.");
              return;
            }

            const { data, error } = await supabase
              .from("tags")
              .update({
                name: nomeLimpo,
                color: cor,
                has_border: temBorda,
                border_color: temBorda ? corBorda : null,
                updated_at: new Date().toISOString(),
                text_color: corTexto,
                parent_tag_id: parentTagId,
                priority: prioridade,
              })
              .eq("library_id", LIBRARY_ID)
              .eq("id", tagId)
              .select()
              .single();

            if (error) throw error;

            const tagAtualizada = converterTag(data);

              setTodasTags((atuais) =>
                atuais.map((tag) =>
                  tag.id === tagId ? tagAtualizada : tag
                )
              );

            setMedias((atuais) =>
              atuais.map((media) => ({
                ...media,
                tags: media.tags.map((tag) =>
                  tag.id === tagId ? tagAtualizada : tag
                ),
              }))
            );

            setSelectedMedia((atual) =>
              atual
                ? {
                    ...atual,
                    tags: atual.tags.map((tag) =>
                      tag.id === tagId ? tagAtualizada : tag
                    ),
                  }
                : atual
            );
          } catch (erro) {
            console.error("Erro ao personalizar tag:", erro);
            alert("Não foi possível personalizar a tag.");
          }
        }

      async function atualizarApp() {
          if (!availableUpdate) return;

          try {
            setUpdating(true);

            await availableUpdate.downloadAndInstall();

            await relaunch();
          } catch (erro) {
            console.error("Erro ao atualizar aplicativo:", erro);
            alert(
              `Não foi possível atualizar o MailTag.\n\n${
                erro instanceof Error ? erro.message : String(erro)
              }`
            );
          } finally {
            setUpdating(false);
          }
        }

        useEffect(() => {
  if (!user) {
    setLivros([]);
    return;
  }

  if (!galeriaCarregada) return;

  let cancelado = false;

  carregarLivros()
    .then((lista) => {
      if (!cancelado) setLivros(lista);
    })
    .catch((erro) => console.error("Erro ao carregar livros:", erro));

  return () => {
    cancelado = true;
  };
}, [user, galeriaCarregada, versaoLivros]);

useEffect(() => {
  if (!user || !galeriaCarregada) return;

  const filtro = `library_id=eq.${LIBRARY_ID}`;
  let timer: number | null = null;

  function recarregar() {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => setVersaoLivros((n) => n + 1), 500);
  }

  let canal = supabase.channel(`livros-${LIBRARY_ID}`);

  // O Supabase não aceita filtro em DELETE, por isso ele vem separado
  for (const tabela of ["books", "book_tags"]) {
    canal = canal
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: tabela, filter: filtro },
        recarregar
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: tabela, filter: filtro },
        recarregar
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: tabela },
        recarregar
      );
  }

  // Só páginas e capas de livros interessam aqui
  canal = canal
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "medias", filter: filtro },
      (payload) => {
        if ((payload.new as Linha).book_id) recarregar();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "medias", filter: filtro },
      (payload) => {
        if ((payload.new as Linha).book_id) recarregar();
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "medias" },
      recarregar
    );

  canal.subscribe();

  return () => {
    if (timer !== null) window.clearTimeout(timer);
    supabase.removeChannel(canal);
  };
}, [user, galeriaCarregada]);

    const extensoesDisponiveis = useMemo(
      () =>
        Array.from(
          new Set(
            medias
              .map((m) => m.extension)
              .filter((e): e is string => Boolean(e))
          )
        ).sort(),
      [medias]
    );

  // Filtrar mídias por tag
    const filhasPorCategoria = useMemo(() => {
        const filhas = new Map<string, Set<string>>();

        for (const tag of todasTags) {
          if (!tag.parentTagId) continue;

          const conjunto = filhas.get(tag.parentTagId);
          if (conjunto) conjunto.add(tag.id);
          else filhas.set(tag.parentTagId, new Set([tag.id]));
        }

        return filhas;
      }, [todasTags]);

      const mediasFiltradas = useMemo(() => {
        const porTag = medias.filter((media) => {
          const corresponde = (tagId: string) =>
            media.tags.some(
              (tag) => tag.id === tagId || filhasPorCategoria.get(tagId)?.has(tag.id)
            );

          if (filtros.tagsExcluidas.some(corresponde)) return false;

          if (buscaTagIds.length === 0) return true;

          return filtros.modoTags === "todas"
            ? buscaTagIds.every(corresponde)
            : buscaTagIds.some(corresponde);
        });

        return filtrarMedias(porTag, filtros);
      }, [medias, filhasPorCategoria, buscaTagIds, filtros]);

      const livrosFiltrados = useMemo(() => {
        const livrosPorTags =
          buscaTagIds.length === 0
            ? livros
            : livros.filter((livro) => {
                const corresponde = (tagId: string) =>
                  livro.tagIds.some(
                    (id) =>
                      id === tagId ||
                      filhasPorCategoria.get(tagId)?.has(id)
                  );

                return filtros.modoTags === "todas"
                  ? buscaTagIds.every(corresponde)
                  : buscaTagIds.some(corresponde);
              });

        return filtrarLivros(livrosPorTags, filtrosLivros);
      }, [
        livros,
        buscaTagIds,
        filhasPorCategoria,
        filtros.modoTags,
        filtrosLivros,
      ]);
              
        
        
   
   
    if (erroCarregamento) {
      return (
        <main className="flex h-screen flex-col items-center justify-center gap-4 bg-fundo text-white">
          <p>Não foi possível carregar a galeria.</p>
          <p className="text-sm text-gray-400">{erroCarregamento}</p>
          <button
            className="rounded-md bg-botao px-4 py-2 hover:brightness-110"
            onClick={() => setTentativaGaleria((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </main>
      );
    }
  // Estados de carregamento
  if (verificandoSessao || (user && !galeriaCarregada)) {
    return <p className="text-white">Carregando...</p>;
  }

  // Tela de autenticação
  if (mostrarAuth && !user) {
    return <Auth />;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <Header
        onImport={adicionarMedias}
        buscaTagIds={buscaTagIds}
        onBuscaTagIds={setBuscaTagIds}
        avatarUrl={avatar}
        allTags={todasTags}
        userEmail={user?.email ?? null}
        onLogin={() => setMostrarAuth(true)}
        updateAvailable={updateAvailable}
        updating={updating}
        onUpdate={atualizarApp}
        onOpenSettings={() => setConfigAberta(true)}
        filtrosAbertos={filtrosAbertos}
        totalFiltrosAtivos={
          modo === "imagens"
            ? contarFiltrosAtivos(filtros)
            : contarFiltrosLivrosAtivos(filtrosLivros)
        }
        onToggleFiltros={() => setFiltrosAbertos((aberto) => !aberto)}
        gerenciadorAberto={gerenciadorAberto}
        onToggleGerenciador={() => setGerenciadorAberto((a) => !a)}
        modo={modo}
        onCriarLivro={() => setCriandoLivro(true)}
        onChangeModo={(novo) => {
          setModo(novo);
          setFiltrosAbertos(false);
        }}
      />
      {modo === "imagens" ? (
       <Mediagrid
         medias={mediasFiltradas}
         allTags={todasTags}
         selectedMedia={selectedMedia}
         onSelectMedia={selecionarMedia}
         onAddTag={adicionarTag}
         onRemoveTag={removerTag}
         onDeleteMedia={removerMedia}
         onDeleteTag={excluirTag}
         onCustomizeTag={personalizarTag}
         onCreateCategory={criarTagCategoria}
         onRenameMedia={renomearMedia}
         onAddTagToMany={adicionarTagEmVarias}
         onChangeAutoTags={definirTagsAutomaticas}
         />
      ) : (
        <BookGrid
          livros={livrosFiltrados}
          todosLivros={livros}
          fila={fila}
          allTags={todasTags}
          onAddTag={adicionarTagAoLivro}
          onRemoveTag={removerTagDoLivro}
          onCustomizeTag={personalizarTag}
          onCreateCategory={criarTagCategoria}
          onChangeAutoTags={definirTagsAutomaticas}
          onAddTagToMany={adicionarTagAosLivros}
        />
      )}

      {modo === "imagens" ? (
        <FilterPanel
          aberto={filtrosAbertos}
          filtros={filtros}
          onChange={setFiltros}
          extensoesDisponiveis={extensoesDisponiveis}
          totalMidias={medias.length}
          totalFiltradas={mediasFiltradas.length}
          onClose={() => setFiltrosAbertos(false)}
          todasTags={todasTags}
        />
      ) : (
        <BookFilterPanel
          aberto={filtrosAbertos}
          filtros={filtrosLivros}
          onChange={setFiltrosLivros}
          totalLivros={livros.length}
          totalFiltrados={livrosFiltrados.length}
          onClose={() => setFiltrosAbertos(false)}
          todasTags={todasTags}
        />
      )}

      <TagManager
        aberto={gerenciadorAberto}
        allTags={todasTags}
        medias={medias}
        
        onClose={() => setGerenciadorAberto(false)}
        onCustomizeTag={personalizarTag}
        onDeleteTag={excluirTag}
        onCreateCategory={criarTagCategoria}
        categoriaPadraoId={categoriaPadrao?.id ?? null}
        onChangeAutoTags={definirTagsAutomaticas}
        onChangeCategoriaPadrao={alterarCategoriaPadrao}
      />
      
      
      {configAberta && 
      <Settings
      avatarUrl={avatar}
      onClose={() => setConfigAberta(false)} 
      onChangeAvatar={alterarAvatar}
      />}


      <CreateBook

        aberto={criandoLivro}
        allTags={todasTags}
        categoriaPadraoId={categoriaPadrao?.id ?? null}
        onCreateTag={criarTagCategoria}
        onClose={() => setCriandoLivro(false)}
        onCreated={() => setVersaoLivros((n) => n + 1)}
      />

    </main>
  );
}

ReactDOM
  .createRoot(document.getElementById("root") as HTMLElement)
  .render(<App />);
