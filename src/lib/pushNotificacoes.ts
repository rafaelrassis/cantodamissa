import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { garantirSessaoAnonima } from './supabaseAuth';
import { fetchApi } from './apiClient';

/**
 * Push de solicitação de ingresso (Android).
 *
 * O Realtime resolve a tela do app aberto; isto cobre o resto do dia: o
 * admin com o celular no bolso não tinha como saber que alguém pediu pra
 * entrar no ministério.
 *
 * Tudo aqui é opcional de propósito. Um build sem `google-services.json`
 * (o arquivo do Firebase, que não está no repositório) faz o plugin
 * lançar no `register()` — e o app tem que continuar funcionando igual,
 * só sem push. Por isso cada passo é envolvido em try/catch e nenhuma
 * falha sobe pra tela.
 */

const CANAL_ANDROID = 'ministerio';

/**
 * Pede permissão, registra no FCM e guarda o token do aparelho.
 * Idempotente: o plugin reemite o token a cada abertura e o upsert
 * atualiza a mesma linha.
 */
export async function registrarPush(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isSupabaseConfigured) return;

  try {
    if (Capacitor.getPlatform() === 'android') {
      // Sem canal declarado o Android 8+ entrega a notificação sem som
      // nem cabeçalho — que é justamente o ponto aqui.
      await PushNotifications.createChannel({
        id: CANAL_ANDROID,
        name: 'Ministério',
        description: 'Solicitações de ingresso e avisos do seu ministério',
        importance: 4,
        visibility: 1,
      });
    }

    let { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt' || receive === 'prompt-with-rationale') {
      receive = (await PushNotifications.requestPermissions()).receive;
    }
    if (receive !== 'granted') return;

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', ({ value }) => {
      void guardarToken(value);
    });
    await PushNotifications.addListener('registrationError', (erro) => {
      console.warn('Push: registro recusado pelo FCM —', erro);
    });

    await PushNotifications.register();
  } catch (erro) {
    console.warn('Push indisponível neste build:', erro);
  }
}

async function guardarToken(token: string): Promise<void> {
  try {
    const authUid = await garantirSessaoAnonima();
    if (!authUid) return;
    await supabase.from('dispositivos_push').upsert(
      {
        token,
        auth_uid: authUid,
        plataforma: Capacitor.getPlatform(),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
  } catch (erro) {
    console.warn('Push: não foi possível guardar o token —', erro);
  }
}

/**
 * Avisa os admins de que chegou uma solicitação. Chamado logo depois da
 * RPC de ingresso; quem decide se pode enviar é o servidor, que confere
 * a solicitação pendente antes (ver api/notificar-solicitacao.ts).
 *
 * Silencioso: o pedido de ingresso já está gravado, e falhar o aviso não
 * pode virar erro na tela de quem pediu.
 */
export async function avisarAdminsDeSolicitacao(codigo: string): Promise<void> {
  try {
    await fetchApi('/api/notificar-solicitacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    });
  } catch (erro) {
    console.warn('Push: não foi possível avisar os admins —', erro);
  }
}
