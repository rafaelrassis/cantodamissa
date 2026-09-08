import type { CapacitorConfig } from '@capacitor/cli';

// appId: identificador reverso-DNS único da Play Store — não dá pra trocar
// depois de publicar.
const config: CapacitorConfig = {
  appId: 'com.cantodamissa.app',
  appName: 'Canto da Missa',
  webDir: 'dist',
  server: {
    // Sem isso o Capacitor serve os arquivos de dist/ por um esquema
    // local (capacitor://) — troca de tela funciona, mas qualquer coisa
    // que dependa de same-origin com o domínio de produção (ex:
    // redirect do Google OAuth) quebraria. androidScheme 'https' faz o
    // WebView rodar como se fosse https://localhost, mais compatível.
    androidScheme: 'https',
  },
};

export default config;
