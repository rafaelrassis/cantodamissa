import { ChevronLeft } from 'lucide-react';

interface Props {
  documento: 'privacidade' | 'termos';
  onBack: () => void;
}

const EMAIL_CONTATO = 'rafaelrassis@hotmail.com';
const ATUALIZADO_EM = '25 de agosto de 2026';

/**
 * Política de Privacidade e Termos de Uso — telas estáticas, mas
 * precisam existir de verdade: são exigência da LGPD (dado que o login
 * Google coleta e-mail/nome/foto) e a base do modelo notice-and-takedown
 * do catálogo (SPEC.md, seção 8). Antes disso não existia lugar nenhum
 * no app pra declarar prazo de atendimento a pedido de remoção, nem
 * texto de privacidade — o botão "solicitar remoção" (ver
 * SolicitarRemocaoLink.tsx) referencia o prazo declarado aqui.
 *
 * Redigido para refletir o que o app realmente faz hoje (ver
 * src/lib/supabase.ts, useUserAuth.ts, useHistoricoMusicas.ts etc.) —
 * revisão jurídica antes de publicar em produção é responsabilidade de
 * quem opera o app, isto não substitui aconselhamento legal.
 */
export function LegalTela({ documento, onBack }: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="bg-[var(--accent)] px-4 py-4 text-[var(--accent-fg)] md:px-10">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-xs opacity-80">
          <ChevronLeft size={14} /> Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">
          {documento === 'privacidade' ? 'Política de Privacidade' : 'Termos de Uso'}
        </h1>
        <p className="mt-0.5 text-xs opacity-80">Última atualização: {ATUALIZADO_EM}</p>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 md:px-10">
        {documento === 'privacidade' ? <ConteudoPrivacidade /> : <ConteudoTermos />}
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-bold text-[var(--text)]">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </section>
  );
}

function ConteudoPrivacidade() {
  return (
    <>
      <Secao titulo="1. Quem trata os seus dados">
        <p>
          O Canto da Missa é operado por {EMAIL_CONTATO}, responsável pelo tratamento dos dados
          descritos aqui. Dúvidas ou pedidos sobre seus dados podem ser enviados para esse e-mail.
        </p>
      </Secao>

      <Secao titulo="2. Quais dados coletamos">
        <p>
          <strong className="text-[var(--text)]">Login com Google (opcional):</strong> nome,
          e-mail e foto de perfil, usados para identificar sua conta e sincronizar repertórios e
          participação em ministérios entre aparelhos.
        </p>
        <p>
          <strong className="text-[var(--text)]">Dados de uso do ministério:</strong> quando você
          participa de um ministério, guardamos as escalas, repertórios e avisos que você cria ou
          acessa ali.
        </p>
        <p>
          <strong className="text-[var(--text)]">Dados salvos só no seu aparelho:</strong>{' '}
          preferências (tema, tamanho de fonte, tom preferido), histórico de músicas visitadas e
          repertórios criados sem login ficam no armazenamento local do navegador
          (localStorage), não em nossos servidores — apagar os dados do site no navegador apaga
          essas informações.
        </p>
        <p>
          Não usamos cookies de rastreamento nem compartilhamos dados com redes de publicidade
          hoje. Se um espaço de anúncio for ativado no futuro, esta política será atualizada antes
          disso entrar no ar.
        </p>
      </Secao>

      <Secao titulo="3. Com quem compartilhamos">
        <p>
          Os dados ficam hospedados no Supabase (banco de dados e autenticação) e o login usa a
          infraestrutura de OAuth do Google — ambos atuam como operadores dos dados que
          processam em nosso nome, não como donos deles. Não vendemos nem compartilhamos seus
          dados com terceiros para fins de marketing.
        </p>
      </Secao>

      <Secao titulo="4. Seus direitos (LGPD)">
        <p>
          Você pode pedir a qualquer momento, pelo e-mail acima: acesso aos dados que temos sobre
          você, correção de dados incorretos, exclusão da sua conta e dos dados associados, ou
          revogação do consentimento ao login. Atendemos esses pedidos em até 15 dias úteis. Você
          também pode reclamar diretamente à Autoridade Nacional de Proteção de Dados (ANPD) se
          entender que algo aqui não foi respeitado.
        </p>
      </Secao>

      <Secao titulo="5. Menores de idade">
        <p>
          O app não é direcionado a crianças e não pede intencionalmente dados de menores fora do
          contexto de uso normal (nome/e-mail de quem faz login). Responsáveis que identificarem
          uso por uma criança sem sua autorização podem pedir a remoção pelo e-mail acima.
        </p>
      </Secao>

      <Secao titulo="6. Alterações desta política">
        <p>
          Podemos atualizar este texto conforme o app evolui. Mudanças relevantes (por exemplo,
          ativação de anúncios) serão refletidas na data no topo desta página.
        </p>
      </Secao>
    </>
  );
}

function ConteudoTermos() {
  return (
    <>
      <Secao titulo="1. Aceite">
        <p>
          Ao usar o Canto da Missa você concorda com estes termos. Se não concordar, não é
          possível usar o app.
        </p>
      </Secao>

      <Secao titulo="2. O que é o app">
        <p>
          O Canto da Missa é uma ferramenta de apoio a ministérios de música litúrgica católica:
          cifras, repertórios e organização de escalas. É oferecido gratuitamente, "como está",
          sem garantia de disponibilidade contínua ou ausência de erros.
        </p>
      </Secao>

      <Secao titulo="3. Conteúdo do catálogo e direitos autorais">
        <p>
          As cifras e letras disponibilizadas seguem um modelo de notice-and-takedown: o app não
          reivindica autoria da letra ou melodia original de nenhuma música, e existe apenas para
          facilitar sua execução em celebrações. Quem detiver os direitos autorais de uma
          letra/cifra publicada aqui e não autorizar sua disponibilização pode solicitar a
          remoção pelo botão "solicitar remoção", presente em toda página de música e de
          cantor/artista, ou pelo e-mail {EMAIL_CONTATO}.
        </p>
        <p>
          Pedidos de remoção são analisados e respondidos em até 15 dias úteis a partir do
          recebimento. Havendo dúvida legítima sobre a titularidade dos direitos, o conteúdo pode
          ser removido preventivamente até a resolução do pedido.
        </p>
      </Secao>

      <Secao titulo="4. Contribuições da comunidade">
        <p>
          Qualquer pessoa pode sugerir uma música nova ou correção de cifra. Sugestões só são
          publicadas depois de revisadas por um administrador, e quem contribuiu recebe crédito
          visível na música quando a sugestão é aprovada.
        </p>
      </Secao>

      <Secao titulo="5. Conta e login">
        <p>
          O login (Google) é opcional e só necessário para salvar repertórios na nuvem e
          participar de um ministério compartilhado. Você é responsável por manter o acesso à sua
          conta Google seguro.
        </p>
      </Secao>

      <Secao titulo="6. Uso aceitável">
        <p>
          Não é permitido usar o app para publicar conteúdo ofensivo, ilegal, ou que infrinja
          direitos de terceiros, nem tentar acessar, sobrecarregar ou comprometer a infraestrutura
          do serviço.
        </p>
      </Secao>

      <Secao titulo="7. Alterações e encerramento">
        <p>
          Podemos alterar estes termos, o app ou descontinuar funcionalidades a qualquer momento,
          com aviso razoável quando a mudança afetar dados já salvos pelo usuário.
        </p>
      </Secao>

      <Secao titulo="8. Contato">
        <p>Dúvidas sobre estes termos: {EMAIL_CONTATO}.</p>
      </Secao>
    </>
  );
}
