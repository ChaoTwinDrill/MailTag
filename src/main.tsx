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

import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

import "./global.css";

  const WORKER_URL = "https://mailtag-api.oririkkj.workers.dev";

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
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          throw new Error("Usuário não autenticado.");
        }

        // Remover associações com tags
        const { error: erroTags } = await supabase
          .from("media_tags")
          .delete()
          .eq("library_id", LIBRARY_ID)
          .eq("media_id", media.id);

        if (erroTags) throw erroTags;

        // Remover registro da mídia
        const { error: erroMedia } = await supabase
          .from("medias")
          .delete()
          .eq("library_id", LIBRARY_ID)
          .eq("id", media.id);

        if (erroMedia) throw erroMedia;

        // Remover arquivos do R2
        const resposta = await fetch(WORKER_URL, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "X-Library-Id": LIBRARY_ID,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: media.r2Key,
            thumbnailKey: media.thumbnailR2Key,
          }),
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          throw new Error(resultado.error || "Erro ao excluir arquivos do R2.");
        }

        // Atualizar a galeria
        setMedias((atuais) =>
          atuais.filter((m) => m.id !== media.id)
        );

        setSelectedMedia((atual) =>
          atual?.id === media.id ? null : atual
        );

      } catch (erro) {
        console.error("Erro ao excluir mídia:", erro);
        alert("Não foi possível concluir a exclusão. Verifique o console.");
      }
    }

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
        hasBorder: tag.has_border,
        borderColor: tag.border_color,
        textColor: tag.text_color,
      }));
      setTodasTags(tagsConvertidas);

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
//Criar tag na categoria
  async function criarTagCategoria(nomeTag: string): Promise<tags | null> {
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
      parent_tag_id: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar tag:", error);
    alert("Não foi possível criar a tag.");
    return null;
  }

  const novaTag: tags = {
    id: data.id,
    libraryId: data.library_id,
    name: data.name,
    color: data.color,
    description: data.description,
    parentTagId: data.parent_tag_id,
    createdAt: new Date(data.created_at),
    modifiedAt: new Date(data.updated_at),
    hasBorder: data.has_border,
    borderColor: data.border_color,
    textColor: data.text_color,
  };

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
        hasBorder: tagExistente.has_border,
        borderColor: tagExistente.border_color,
        textColor: tagExistente.text_color,
        
      };

      setTodasTags((atuais) => {
        if (atuais.some((tag) => tag.id === novaTag.id)) {
          return atuais;
        }

        return [...atuais, novaTag];
      });

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


      // Importação local (mandar pra nuvem depois)
      function adicionarMedias(novasMedias: Media[]) {
        setMedias((mediasAntigas) => [
          ...mediasAntigas,
          ...novasMedias,
        ]);
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
          parentTagId: string | null
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
              })
              .eq("library_id", LIBRARY_ID)
              .eq("id", tagId)
              .select()
              .single();

            if (error) throw error;

            const tagAtualizada: tags = {
              id: data.id,
              libraryId: data.library_id,
              name: data.name,
              color: data.color,
              hasBorder: data.has_border,
              borderColor: data.border_color,
              description: data.description,
              parentTagId: data.parent_tag_id,
              createdAt: new Date(data.created_at),
              modifiedAt: new Date(data.updated_at),
              textColor: data.text_color,
            };  

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
            alert("Não foi possível atualizar o MailTag.");
          } finally {
            setUpdating(false);
          }
        }

  // Filtrar mídias por tag
    const mediasFiltradas = medias.filter((media) =>
      buscaTagIds.every((tagId) => {
        const tagsDaCategoria = todasTags
          .filter((tag) => tag.parentTagId === tagId)
          .map((tag) => tag.id);

        return (
          media.tags.some((tag) => tag.id === tagId) ||
          media.tags.some((tag) => tagsDaCategoria.includes(tag.id))
        );
      })
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
        buscaTagIds={buscaTagIds}
        onBuscaTagIds={setBuscaTagIds}
        allTags={todasTags}
        userEmail={user?.email ?? null}
        onLogin={() => setMostrarAuth(true)}
        updateAvailable={updateAvailable}
        updating={updating}
        onUpdate={atualizarApp}
      />

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
        
      />
    </main>
  );
}

ReactDOM
  .createRoot(document.getElementById("root") as HTMLElement)
  .render(<App />);
