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
 * (o arquivo do Firebase, que não está no repositório) faz o Android pular
 * o plugin do Google Services e o Firebase nunca inicializa — nesse caso
 * `PushNotifications.register()` chama `FirebaseMessaging.getInstance()`
 * nativamente e crasha o app de verdade (não é um erro que promise/try-catch
 * em JS consiga pegar: o plugin lança de dentro do Handler principal do
 * Capacitor). Por isso `__PUSH_FIREBASE_CONFIGURADO__` (setada em
 * vite.config.ts a partir da presença do arquivo) barra a chamada antes
 * de chegar nesse ponto — o resto dos passos segue em try/catch pelo
 * que ainda pode falhar (rede, permissão negada etc.).
 */

const CANAL_ANDROID = 'ministerio';

/**
 * Pede permissão, registra no FCM e guarda o token do aparelho.
 * Idempotente: o plugin reemite o token a cada abertura e o upsert
 * atualiza a mesma linha.
 */
export async function registrarPush(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isSupabaseConfigured) return;
  if (Capacitor.getPlatform() === 'android' && !__PUSH_FIREBASE_CONFIGURADO__) return;

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
  await avisar('/api/notificar-solicitacao', { codigo });
}

/**
 * Avisa quem foi escalado que a escala saiu. Chamado pelo aparelho do
 * admin que publicou; quem confere se ele é admin mesmo — e se a escala
 * já não foi notificada antes — é o servidor (api/notificar-escala.ts).
 */
export async function avisarEscalaPublicada(escalaId: string): Promise<void> {
  await avisar('/api/notificar-escala', { escalaId });
}

/**
 * Silencioso de propósito: a ação que originou o aviso (o pedido de
 * ingresso, a escala publicada) já está gravada, e falhar a notificação
 * não pode virar erro na tela.
 */
async function avisar(rota: string, corpo: Record<string, string>): Promise<void> {
  try {
    await fetchApi(rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  } catch (erro) {
    console.warn(`Push: ${rota} falhou —`, erro);
  }
}
