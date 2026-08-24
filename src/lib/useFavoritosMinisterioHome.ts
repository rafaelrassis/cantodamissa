import { useCallback, useEffect, useState } from 'react';
import {
  listarFavoritosComProximoRepertorio,
  type ProximoRepertorioFavorito,
} from './favoritosMinisterio';

/** Espelha useProximosRepertoriosHome, mas pra ministérios favoritados
 * (não membro) — só carrega quando logado. */
export function useFavoritosMinisterioHome(isLoggedIn: boolean) {
  const [itens, setItens] = useState<ProximoRepertorioFavorito[]>([]);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!isLoggedIn) {
      setItens([]);
      return;
    }
    setCarregando(true);
    try {
      setItens(await listarFavoritosComProximoRepertorio());
    } finally {
      setCarregando(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { itens, carregando, recarregar };
}
