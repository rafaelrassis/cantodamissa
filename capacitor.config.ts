import type { CapacitorConfig } from '@capacitor/cli';

// appId: identificador reverso-DNS único da Play Store — não dá pra trocar
// depois de publicar. "app.cantodamissa" segue o domínio de produção
// (canto-da-missa.vercel.app); ajuste antes do primeiro upload na Play
// Console se preferir outro pacote.
const config: CapacitorConfig = {
  appId: 'app.cantodamissa.mobile',
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
