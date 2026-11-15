import type { Media } from "../components/types/media";
import type { ResultadoImportacao } from "../components/Importbutton";


const LIMITE_SIMULTANEO = 3;

export type TarefaImportacao = {
  nome: string;
  executar: (ignorarDuplicata: boolean) => Promise<ResultadoImportacao>;
};

export interface EstadoImportacao {
  total: number;
  concluidas: number;
  importadas: number;
  emAndamento: string[];
  falhas: { nome: string; erro: string }[];
  duplicadas: { nome: string; igualA: string; tarefa: TarefaImportacao }[];
}

const VAZIO: EstadoImportacao = {
  total: 0,
  concluidas: 0,
  importadas: 0,
  emAndamento: [],
  falhas: [],
  duplicadas: [],
};

let estado = VAZIO;
let destino: ((medias: Media[]) => void) | null = null;
let ativos = 0;

const pendentes: { tarefa: TarefaImportacao; ignorarDuplicata: boolean }[] = [];
const ouvintes = new Set<() => void>();

function atualizar(mudar: (atual: EstadoImportacao) => EstadoImportacao) {
  estado = mudar(estado);
  ouvintes.forEach((ouvinte) => ouvinte());
}

function semUmaOcorrencia(lista: string[], nome: string) {
  const i = lista.indexOf(nome);

  return i === -1 ? lista : [...lista.slice(0, i), ...lista.slice(i + 1)];
}

export function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
  };
}

export const obterEstado = () => estado;

export function definirDestinoImportacao(fn: (medias: Media[]) => void) {
  destino = fn;
}

function processar() {
  while (ativos < LIMITE_SIMULTANEO && pendentes.length > 0) {
    const item = pendentes.shift()!;

    ativos++;

    atualizar((e) => ({
      ...e,
      emAndamento: [...e.emAndamento, item.tarefa.nome],
    }));

    item.tarefa
      .executar(item.ignorarDuplicata)
      .catch(
        (erro): ResultadoImportacao => ({
          nome: item.tarefa.nome,
          erro: erro instanceof Error ? erro.message : String(erro),
        })
      )
      .then((resultado) => {
        if ("midia" in resultado) destino?.([resultado.midia]);

        atualizar((e) => {
          const base = {
            ...e,
            concluidas: e.concluidas + 1,
            emAndamento: semUmaOcorrencia(e.emAndamento, item.tarefa.nome),
          };

          if ("midia" in resultado) {
            return { ...base, importadas: e.importadas + 1 };
          }

          if (resultado.duplicadaDe) {
            return {
              ...base,
              duplicadas: [
                ...e.duplicadas,
                {
                  nome: item.tarefa.nome,
                  igualA: resultado.duplicadaDe.nome,
                  tarefa: item.tarefa,
                },
              ],
            };
          }

          return {
            ...base,
            falhas: [...e.falhas, { nome: item.tarefa.nome, erro: resultado.erro }],
          };
        });
      })
      .finally(() => {
        ativos--;
        processar();
      });
  }
}

export function adicionarTarefas(
  tarefas: TarefaImportacao[],
  ignorarDuplicata = false
) {
  if (tarefas.length === 0) return;

  const ocioso = ativos === 0 && pendentes.length === 0;

  atualizar((e) => {
    if (ignorarDuplicata) {
      return { ...e, concluidas: Math.max(0, e.concluidas - tarefas.length) };
    }

    if (ocioso) return { ...VAZIO, total: tarefas.length };

    return { ...e, total: e.total + tarefas.length };
  });

  pendentes.push(...tarefas.map((tarefa) => ({ tarefa, ignorarDuplicata })));
  processar();
}

export function importarDuplicadasMesmoAssim() {
  const tarefas = estado.duplicadas.map((d) => d.tarefa);

  if (tarefas.length === 0) return;

  atualizar((e) => ({ ...e, duplicadas: [] }));
  adicionarTarefas(tarefas, true);
}

export function cancelarRestantes() {
  const removidas = pendentes.length;

  pendentes.length = 0;

  if (removidas > 0) {
    atualizar((e) => ({ ...e, total: e.total - removidas }));
  }
}

export function limparImportacao() {
  if (ativos > 0 || pendentes.length > 0) return;

  atualizar(() => VAZIO);
}