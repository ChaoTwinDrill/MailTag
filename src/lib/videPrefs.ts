const CHAVE = "videoVolume";

export type PreferenciaVolume = { volume: number; mudo: boolean };

const PADRAO: PreferenciaVolume = { volume: 0.5, mudo: false };

const ouvintes = new Set<() => void>();

export function lerPreferenciaVolume(): PreferenciaVolume {
  try {
    const bruto = localStorage.getItem(CHAVE);

    if (bruto) {
      const dados = JSON.parse(bruto);

      return {
        volume:
          typeof dados?.volume === "number"
            ? Math.min(1, Math.max(0, dados.volume))
            : PADRAO.volume,
        mudo: dados?.mudo === true,
      };
    }
  } catch {
  }
  return PADRAO;
}

export function salvarPreferenciaVolume(volume: number, mudo: boolean) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ volume, mudo }));
  } catch {
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function assinarPreferenciaVolume(ouvinte: () => void) {
  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);
  };
}