import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './escalasApi';
import { preservarSeIgual, useRevalidarEmFoco } from './useRevalidarEmFoco';
import { assinarTabelas } from './realtimeSupabase';
import { avisarEscalaPublicada } from './pushNotificacoes';
import type { Escala } from '../types/ministerio';

/**
 * Escalas do ministério ativo. `ministerioId` null (ainda carregando
 * identidade, ou usuário não pertence a nenhum) resulta em lista vazia,
 * sem chamar a API.
 */
export function useEscalas(ministerioId: string | null) {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!ministerioId) {
      setEscalas([]);
      return;
    }
    const lista = await api.listarEscalas(ministerioId);
    setEscalas((prev) => preservarSeIgual(prev, lista));
  }, [ministerioId]);

  useEffect(() => {
    setCarregando(true);
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  // Fallback do Realtime abaixo (canal caído, volta do multitarefa).
  useRevalidarEmFoco(recarregar, 5 * 60_000);

  const recarregarRef = useRef(recarregar);
  useEffect(() => {
    recarregarRef.current = recarregar;
  }, [recarregar]);

  // Escala criada/alterada por outro admin, e confirmação de presença de
  // quem está escalado, aparecem na hora. `escala_participantes` não tem
  // ministerio_id pra filtrar — a RLS de select é quem restringe (0013).
  useEffect(() => {
    if (!ministerioId) return;
    return assinarTabelas(
      `escalas:${ministerioId}`,
      [
        { tabela: 'escalas', filtro: `ministerio_id=eq.${ministerioId}` },
        { tabela: 'escala_participantes' },
      ],
      () => recarregarRef.current().catch(() => {})
    );
  }, [ministerioId]);

  const criar = useCallback(
    async (rascunho: Escala) => {
      if (!ministerioId) throw new Error('Nenhum ministério ativo.');
      const nova = await api.criarEscala(ministerioId, rascunho);
      setEscalas((prev) => [...prev, nova]);
      // Escala que já nasce publicada avisa quem está nela.
      if (nova.publicada) void avisarEscalaPublicada(nova.id);
      return nova;
    },
    [ministerioId]
  );

  const atualizar = useCallback(async (escala: Escala) => {
    await api.atualizarEscala(escala);
    // Só a virada rascunho -> publicada notifica; salvar de novo uma
    // escala já publicada não deve tocar o celular de ninguém (o
    // servidor também barra pelo notificacao_enviada_em, ver 0034).
    const eraRascunho = !escalas.find((e) => e.id === escala.id)?.publicada;
    setEscalas((prev) => prev.map((e) => (e.id === escala.id ? escala : e)));
    if (escala.publicada && eraRascunho) void avisarEscalaPublicada(escala.id);
  }, [escalas]);

  const excluir = useCallback(async (escalaId: string) => {
    await api.excluirEscala(escalaId);
    setEscalas((prev) => prev.filter((e) => e.id !== escalaId));
  }, []);

  return { escalas, carregando, criar, atualizar, excluir, recarregar };
}

export type EscalasApi = ReturnType<typeof useEscalas>;
