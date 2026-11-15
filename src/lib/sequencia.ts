export function estaNaCadeia(
    inicio: string | null,
    alvo: string,
    anteriorDe: (id: string) => string | null
    ): boolean {
    const visitados = new Set<string>();
    let atual = inicio;
  
    while (atual && !visitados.has(atual)) {
        if (atual === alvo) return true;
  
        visitados.add(atual);
        atual = anteriorDe(atual);
    }
  
    return false;
    }