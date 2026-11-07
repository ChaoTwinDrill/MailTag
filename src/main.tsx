import { obterArquivoCacheado } from "./lib/cache";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import ReactDOM from "react-dom/client";

import Auth from "./components/Auth.tsx";
import Header from "./components/Header.tsx";
import Mediagrid from "./components/Mediagrid.tsx";

import { supabase } from "./lib/supabase";
import { LIBRARY_ID } from "./lib/library";

import type { Media } from "./components/types/media.ts";
import type { tags } from "./components/types/tag.ts";

import "./global.css";

function App() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [buscaTag, setBuscaTag] = useState("");

  const [mostrarAuth, setMostrarAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [galeriaCarregada, setGaleriaCarregada] = useState(false);

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

  // Carregar galeria, mídias e tags
  useEffect(() => {
    async function carregarGaleria() {
      if (!user) {
        setGaleriaCarregada(false);
        setMedias([]);
        setSelectedMedia(null);
        return;
      }

      setGaleriaCarregada(false);

      // Buscar galeria
      const { data: galeria, error: erroGaleria } = await supabase
        .from("libraries")
        .select("id, name")
        .eq("id", LIBRARY_ID)
        .single();

      if (erroGaleria) {
        console.error("Erro ao carregar galeria:", erroGaleria);
        return;
      }

      console.log("Galeria carregada:", galeria);

      // Buscar mídias
      const { data: midias, error: erroMidias } = await supabase
        .from("medias")
        .select("*")
        .eq("library_id", LIBRARY_ID)
        .is("deleted_at", null);

      if (erroMidias) {
        console.error("Erro ao buscar mídias:", erroMidias);
        return;
      }

      // Buscar associações entre mídias e tags
      const { data: associacoes, error: erroAssociacoes } = await supabase
        .from("media_tags")
        .select("media_id, tag_id")
        .eq("library_id", LIBRARY_ID);

      if (erroAssociacoes) {
        console.error("Erro ao buscar associações:", erroAssociacoes);
        return;
      }

      // Buscar tags
      const { data: tagsBanco, error: erroTags } = await supabase
        .from("tags")
        .select("*")
        .eq("library_id", LIBRARY_ID)
        .is("deleted_at", null);

      if (erroTags) {
        console.error("Erro ao buscar tags:", erroTags);
        return;
      }

      // Converter tags do banco
      const tagsConvertidas: tags[] = tagsBanco.map((tag) => ({
        id: tag.id,
        libraryId: tag.library_id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        parentTagId: tag.parent_tag_id,
        createdAt: new Date(tag.created_at),
        modifiedAt: new Date(tag.updated_at),
      }));

      // Converter mídias do banco
      const midiasConvertidas: Media[] = midias.map((media) => ({
        id: media.id,
        libraryId: media.library_id,
        name: media.name,
        src: "",
        r2Key: media.r2_key,
        mimeType: media.mime_type,
        size: Number(media.size_bytes),
        createdAt: media.file_created_at
          ? new Date(media.file_created_at)
          : null,
        modifiedAt: media.file_modified_at
          ? new Date(media.file_modified_at)
          : null,
        width: media.width,
        height: media.height,
        extension: media.name.split(".").pop()?.toLowerCase(),
        thumbnailR2Key: media.thumbnail_r2_key,
        thumbnailSrc: "",
        tags: tagsConvertidas.filter((tag) =>
          associacoes.some(
            (associacao) =>
              associacao.media_id === media.id &&
              associacao.tag_id === tag.id
          )
        ),
      }));

      setMedias(midiasConvertidas);
      setSelectedMedia(null);

      console.log("Mídias carregadas:", midiasConvertidas);

      setGaleriaCarregada(true);
    }

    carregarGaleria();
  }, [user]);

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
          })
          .select()
          .single();

        if (erroCriacao) {
          console.error("Erro ao criar tag:", erroCriacao);
          return;
        }

        tagExistente = data;
      }

      // Associa a tag à mídia
      const { error: erroAssociacao } = await supabase
        .from("media_tags")
        .insert({
          library_id: LIBRARY_ID,
          media_id: mediaId,
          tag_id: tagExistente.id,
        });

      if (erroAssociacao) {
        console.error("Erro ao associar tag:", erroAssociacao);
        return;
      }

      // Converte os dados do Supabase para nossa interface
      const novaTag: tags = {
        id: tagExistente.id,
        libraryId: tagExistente.library_id,
        name: tagExistente.name,
        color: tagExistente.color,
        description: tagExistente.description,
        parentTagId: tagExistente.parent_tag_id,
        createdAt: new Date(tagExistente.created_at),
        modifiedAt: new Date(tagExistente.updated_at),
      };

      setMedias((mediasAntigas) =>
        mediasAntigas.map((media) =>
          media.id === mediaId
            ? { ...media, tags: [...media.tags, novaTag] }
            : media
        )
      );

      setSelectedMedia((mediaAtual) => {
        if (!mediaAtual || mediaAtual.id !== mediaId) return mediaAtual;

        return {
          ...mediaAtual,
          tags: [...mediaAtual.tags, novaTag],
        };
      });
    }

  // Remover tag
  function removerTag(mediaId: string, tagId: string) {
    setMedias((mediasAntigas) =>
      mediasAntigas.map((media) =>
        media.id === mediaId
          ? {
              ...media,
              tags: media.tags.filter((tag) => tag.id !== tagId),
            }
          : media
      )
    );

    setSelectedMedia((mediaAtual) => {
      if (!mediaAtual || mediaAtual.id !== mediaId) {
        return mediaAtual;
      }

      return {
        ...mediaAtual,
        tags: mediaAtual.tags.filter((tag) => tag.id !== tagId),
      };
    });
  }

  // Importação local (mandar pra nuvem depois)
  function adicionarMedias(novasMedias: Media[]) {
    setMedias((mediasAntigas) => [
      ...mediasAntigas,
      ...novasMedias,
    ]);
  }

  // Filtrar mídias por tag
  const mediasFiltradas = medias.filter((media) =>
    buscaTag.trim() === "" ||
    (media.tags ?? []).some((tag) =>
      tag.name.toLowerCase().includes(buscaTag.toLowerCase())
    )
  );

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
        buscaTag={buscaTag}
        onBuscaTag={setBuscaTag}
        userEmail={user?.email ?? null}
        onLogin={() => setMostrarAuth(true)}
      />

      <Mediagrid
        medias={mediasFiltradas}
        selectedMedia={selectedMedia}
        onSelectMedia={selecionarMedia}
        onAddTag={adicionarTag}
        onRemoveTag={removerTag}
      />
    </main>
  );
}

ReactDOM
  .createRoot(document.getElementById("root") as HTMLElement)
  .render(<App />);
