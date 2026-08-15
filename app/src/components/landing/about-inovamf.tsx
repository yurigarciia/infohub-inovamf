/** Seção institucional explicando o que é o InovAMF — o InfoHub é a
 * porta de entrada pra esse programa, então quem nunca ouviu falar
 * precisa de contexto antes de decidir se inscrever. Conteúdo
 * resumido a partir do site oficial (faculdadeamonline.com.br/inovamf). */
export function AboutInovamf() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
      <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
        Humanismo, Negócios & Tecnologia
      </span>
      <h2 className="text-xl font-semibold">O que é o InovAMF</h2>
      <p className="text-sm text-muted-foreground sm:text-base">
        O InovAMF é o ecossistema de inovação da Faculdade e da Fundação Antonio Meneghetti.
        Transforma ideias em negócios reais e sustentáveis, apoiando startups e projetos com
        soluções para desafios sociais e tecnológicos: da mentoria à incubação, passando por
        parcerias entre a academia, o mercado e o setor público.
      </p>
    </div>
  );
}
