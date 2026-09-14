import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  AppUpdate,
  AppUpdateAvailability,
  FlexibleUpdateInstallStatus,
} from '@capawesome/capacitor-app-update';

/**
 * Alerta de atualização disponível na Play Store, pro app instalado
 * (fora do fluxo de PWA/service worker, que é `useServiceWorkerAtualizacao`).
 *
 * Fluxo "flexível" do Google Play: baixa a atualização em segundo plano
 * sem interromper quem já está lendo uma cifra, e só pede pra reiniciar
 * quando o download termina — daí `precisaAtualizar` liga.
 *
 * Só roda em Android nativo: web/iOS não têm a API do Play Core.
 * Falha silenciosamente (sem Play Store disponível, sem rede etc.) porque
 * isso nunca deve impedir o uso do app.
 */
export function useAppUpdate() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const emAndamentoRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let vivo = true;
    let removerListener: (() => void) | undefined;

    const verificar = async () => {
      if (emAndamentoRef.current) return;
      emAndamentoRef.current = true;
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (!vivo) return;
        if (
          info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE &&
          info.flexibleUpdateAllowed
        ) {
          await AppUpdate.startFlexibleUpdate();
        }
      } catch {
        // Sem Play Store, sem rede, ou plataforma sem suporte — ignora.
      } finally {
        emAndamentoRef.current = false;
      }
    };

    AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
      if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
        setPrecisaAtualizar(true);
      }
    }).then((handle) => {
      if (vivo) removerListener = () => handle.remove();
      else handle.remove();
    });

    verificar();

    let removerAppState: (() => void) | undefined;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) verificar();
    }).then((handle) => {
      if (vivo) removerAppState = () => handle.remove();
      else handle.remove();
    });

    return () => {
      vivo = false;
      removerListener?.();
      removerAppState?.();
    };
  }, []);

  return {
    precisaAtualizar,
    atualizarAgora: () => {
      AppUpdate.completeFlexibleUpdate().catch(() => {});
    },
  };
}
