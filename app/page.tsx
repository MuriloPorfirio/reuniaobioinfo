export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-10 inline-flex w-fit rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
          Reuniões de Bioinformática • 2026
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
          Um espaço elegante para organizar temas, artigos e sugestões das
          reuniões semanais.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
          As reuniões acontecem toda segunda-feira às 14:00. Em breve, este site
          mostrará o cronograma completo de 2026, as datas em aberto e o envio
          de sugestões de temas com DOI e indicação de quem poderá guiar a
          discussão.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#cronograma"
            className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Ver cronograma
          </a>

          <a
            href="#sugestoes"
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Ver sugestões
          </a>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Cronograma 2026</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Todas as segundas-feiras do ano organizadas de forma clara, com
              sinalização das reuniões já definidas e das que ainda estão em
              aberto.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Sugestão de temas</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Qualquer pessoa poderá sugerir um tema, informar se possui artigo
              relacionado e inserir o DOI quando houver.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Painel de análise</h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              As propostas ficarão visíveis com nome, data, hora e status, para
              futura aprovação ou recusa pela administração.
            </p>
          </div>
        </div>

        <section id="cronograma" className="mt-20">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-8">
            <h2 className="text-2xl font-semibold">Prévia do cronograma</h2>
            <p className="mt-3 text-white/70">
              Esta é uma versão inicial do site. No próximo passo, vamos trocar
              esta prévia por uma agenda real das reuniões.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-200">05 jan 2026 • 14:00</p>
                <p className="mt-2 text-lg font-semibold">Em aberto</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-200">12 jan 2026 • 14:00</p>
                <p className="mt-2 text-lg font-semibold">Em aberto</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/60">19 jan 2026 • 14:00</p>
                <p className="mt-2 text-lg font-semibold">Tema a definir</p>
              </div>
            </div>
          </div>
        </section>

        <section id="sugestoes" className="mt-10">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-8">
            <h2 className="text-2xl font-semibold">Área de sugestões</h2>
            <p className="mt-3 text-white/70">
              Ainda vamos construir o formulário completo, mas a estrutura do
              site já começou.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
