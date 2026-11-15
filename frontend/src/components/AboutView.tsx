import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Code2,
  GraduationCap,
  Info,
  Layers,
  Mail,
  RefreshCw,
  ShieldCheck,
  Terminal,
  X,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { APP_VERSION, VERSION_HISTORY } from '../config/version';

interface AboutViewProps {
  onBackToWorkspace: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBackToWorkspace }) => {
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  // Fechar modal ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLogoModalOpen(false);
      }
    };
    if (isLogoModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLogoModalOpen]);

  return (
    <div className="flex-1 flex flex-col bg-[#0B0F19] text-slate-100 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl overflow-y-auto select-none transition-colors">
      {/* Modal Ampliado do Logo Milkfed */}
      {isLogoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLogoModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full p-6 sm:p-8 bg-slate-900 border border-[#FF6B00]/40 rounded-2xl shadow-2xl shadow-black/80 flex flex-col items-center cursor-default"
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-[#FF6B00] text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="Fechar (Esc)"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo da Milkfed em Alta Definição */}
            <div className="p-4 my-2 flex items-center justify-center">
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo Ampliado"
                className="max-h-[55vh] max-w-full object-contain drop-shadow-[0_10px_35px_rgba(255,107,0,0.45)] select-none"
              />
            </div>

            {/* Informações no Modal */}
            <div className="text-center mt-3 space-y-1">
              <h3 className="text-xl font-extrabold tracking-tight text-white">
                Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
              </h3>
              <p className="text-xs text-amber-400 font-mono">
                Software House • Requirements Mastery • AI Architecture
              </p>
              <p className="text-[11px] text-slate-400 pt-2">
                Clique fora deste modal ou pressione{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">
                  Esc
                </kbd>{' '}
                para fechar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Topo / Header do Sobre */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Sobre a Central de Agentes Inteligentes — Avaliador TCC (PSOF3)
                </h1>
                <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 text-xs font-mono font-semibold border border-amber-400/30">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                SENAI Ourinhos (Unidade 794) • Plataforma de Automação e Orquestração de Agentes de IA
              </p>
            </div>
          </div>

          <button
            onClick={onBackToWorkspace}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Central</span>
          </button>
        </div>

        {/* Card do Autor / Instrutor */}
        <div className="mb-8 p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] via-amber-400 to-emerald-500 p-0.5 shadow-lg shrink-0 overflow-hidden">
                <img
                  src="/foto-william.jpg"
                  alt="Professor William Devidé Komel"
                  className="w-full h-full rounded-full object-cover shadow-inner"
                />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Desenvolvedor &amp; Idealizador
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  Professor William Devidé Komel
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <a
                      href="mailto:williamdevide@gmail.com"
                      className="hover:text-amber-400 underline underline-offset-2 transition-colors font-mono"
                    >
                      williamdevide@gmail.com
                    </a>
                  </div>
                  <a
                    href="https://www.linkedin.com/in/williamdevide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0A66C2]/15 hover:bg-[#0A66C2] text-[#3898FF] hover:text-white border border-[#0A66C2]/40 rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Conectar no LinkedIn"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span>LinkedIn Profile</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-slate-300 font-mono border-l-0 md:border-l border-slate-800 pl-0 md:pl-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instrutor de Desenvolvimento de Sistemas</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#FF6B00]" />
                <span>Perfil Educacional SENAI &amp; Antigravity</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Foco em Mercado de Trabalho &amp; Excelência Técnica</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card da Empresa: Milkfed Devs && Reqs Lords */}
        <div className="mb-8 p-6 sm:p-7 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden transition-all hover:border-[#FF6B00]/40">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative z-10">
            {/* Logo da Empresa com clique para modal ampliado */}
            <div
              onClick={() => setIsLogoModalOpen(true)}
              className="shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[#FF6B00] shadow-lg shadow-black/20 group cursor-zoom-in transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.3)]"
              title="Clique para ampliar o logo"
            >
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo"
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_4px_16px_rgba(255,107,0,0.35)] group-hover:scale-105 transition-transform duration-300"
              />
              <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-slate-400 group-hover:text-[#FF6B00] transition-colors">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Ampliar logo</span>
              </div>
            </div>

            {/* Conteúdo Institucional */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Software House &amp; Tech Consulting
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  Engineering &amp; Requirements Mastery
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
                </h2>
                <p className="text-xs sm:text-sm font-medium text-amber-400 mt-0.5">
                  Engenharia de Software de Alta Precisão, Requisitos Refinados e Soluções Guiadas por IA
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                A <strong>Milkfed Devs &amp;&amp; Reqs Lords</strong> nasceu da convicção de que o verdadeiro diferencial em tecnologia reside no equilíbrio perfeito entre código de alto padrão (<em>Devs</em>) e a maestria profunda na especificação de regras de negócio e requisitos (<em>Reqs Lords</em>).
              </p>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Especializada no desenvolvimento de sistemas complexos, ferramentas de produtividade corporativa e plataformas educacionais inovadoras — como a <strong>Central de Agentes Inteligentes SENAI</strong> e o ecossistema <strong>SQLEditor</strong> —, nossa atuação combina arquiteturas resilientes em 3 camadas, automação determinística, empacotamento nativo e orquestração autônoma de agentes de Inteligência Artificial para entregar produtos robustos, escaláveis e esteticamente impecáveis.
              </p>

              {/* Pilares / Destaques da Empresa */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00] shrink-0" />
                  <span className="text-slate-100 font-medium">Engenharia de Requisitos &amp; Domínio de Negócio</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Automação Determinística &amp; Performance Extrema</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-100 font-medium">Inteligência Artificial Generativa &amp; Agentes Autônomos</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-slate-100 font-medium">EdTech, Automação Escolar &amp; Ferramentas SENAI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações da Stack Tecnológica com 3D Flip Cards */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Stack Tecnológica &amp; Arquitetura Oficial do Sistema
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Passe o cursor para virar os cards e ver a arquitetura</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Frontend Core - React & TypeScript */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#61DAFB] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#61DAFB]/15 text-[#61DAFB] border border-[#61DAFB]/40 px-2 py-0.5 rounded-full font-bold">
                      REACT &amp; TS
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#20232A] border-2 border-[#61DAFB]/70 shadow-[0_0_25px_rgba(97,218,251,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/react.svg" alt="React" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(97,218,251,0.6)]" />
                      <img src="/logos/typescript.svg" alt="TypeScript" className="w-6 h-6 absolute -bottom-1 -right-1 rounded-md shadow-md border border-white/20" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">Frontend Core</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">React • TypeScript • Vite</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#61DAFB]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#61DAFB] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#61DAFB]">Frontend Core</span>
                      <span className="text-[10px] font-mono bg-[#61DAFB]/15 text-[#61DAFB] border border-[#61DAFB]/30 px-2 py-0.5 rounded-full font-bold">
                        Vite + React
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Interface reativa construída com <strong>React</strong>, <strong>TypeScript</strong> estrito e <strong>Vite</strong>. Inclui árvore de seleção em 3 níveis, flags interativas de dias de aula e monitoramento em tempo real.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    React • TypeScript 5 • Vite 8
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Motor Backend - Python & FastAPI */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#FFD43B] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#FFD43B]/15 text-[#FFD43B] border border-[#FFD43B]/40 px-2 py-0.5 rounded-full font-bold">
                      PYTHON &amp; FASTAPI
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#1E293B] border-2 border-[#FFD43B]/80 shadow-[0_0_25px_rgba(255,212,59,0.4)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/python.svg" alt="Python & FastAPI" className="w-14 h-14 object-contain" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">Orquestrador Backend</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Python 3 • FastAPI • Uvicorn</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#FFD43B]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#FFD43B] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#FFD43B]">FastAPI + Agendador</span>
                      <span className="text-[10px] font-mono bg-[#FFD43B]/20 text-[#FFD43B] border border-[#FFD43B]/40 px-2 py-0.5 rounded-full font-bold">
                        Assíncrono
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Servidor local de alta velocidade com agendador diário em background, validação de esquemas via <strong>Pydantic</strong> e entrega unificada da SPA.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    Python • FastAPI • Uvicorn • Pydantic
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Automação Web - Playwright Engine */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#2EAD33] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#2EAD33]/15 text-[#4ADE80] border border-[#2EAD33]/40 px-2 py-0.5 rounded-full font-bold">
                      PLAYWRIGHT RPA
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#14261C] border-2 border-[#2EAD33]/80 shadow-[0_0_25px_rgba(46,173,51,0.45)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/playwright.svg" alt="Playwright" className="w-14 h-14 object-contain" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">Automação PESS Portal</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Playwright • Headless • DCE</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#4ADE80]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#2EAD33] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#4ADE80]">Playwright Determinístico</span>
                      <span className="text-[10px] font-mono bg-[#2EAD33]/20 text-[#4ADE80] border border-[#2EAD33]/40 px-2 py-0.5 rounded-full font-bold">
                        Headless
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Navegação automatizada no Diário de Classe (DCE), contornando bloqueios de Datepicker ASP.NET, validando assinatura binária <code>.xls</code> e salvando com fallback automático.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    Playwright • Chromium / Edge • BIFF8 XLS
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Aprendizado Inteligente de Turmas */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#FF6B00] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 px-2 py-0.5 rounded-full font-bold">
                      SMART SCHEDULE
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#1C1E24] border-2 border-[#FF6B00]/80 shadow-[0_0_25px_rgba(255,107,0,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/indexeddb.svg" alt="Aprendizado de Turmas" className="w-14 h-14 object-contain" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">Aprendizado de Turmas</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Detecção de Dias de Aula • Cache</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#FF8533]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#FF6B00] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#FF6B00]">Inteligência de Calendário</span>
                      <span className="text-[10px] font-mono bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2 py-0.5 rounded-full font-bold">
                        Seg..Sáb
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Inspeciona automaticamente os relatórios baixados para aprender em quais dias da semana cada turma assiste aula, pulando dias sem aula nas execuções seguintes.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    State JSON • Flags Editáveis • Otimização
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Design System - Tailwind CSS */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#38BDF8] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full font-bold">
                      TAILWIND CSS
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8]/80 shadow-[0_0_25px_rgba(56,189,248,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/tailwind.svg" alt="Tailwind CSS" className="w-14 h-14 object-contain" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">Design System SENAI</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Tailwind CSS • Identidade SENAI</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#38BDF8]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#38BDF8] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#38BDF8]">UX Institucional</span>
                      <span className="text-[10px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full font-bold">
                        Modo App
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Interface limpa e responsiva com barra de progresso em tempo real, relógio digital sincronizado e abertura em janela dedicada maximizada sem terminal visível.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    Tailwind CSS • Lucide Icons • WinExe
                  </div>
                </div>
              </div>
            </div>

            {/* 6. IA & Engenharia Multi-Agente - Google Antigravity */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 group-hover:border-[#4285F4] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/40 px-2 py-0.5 rounded-full font-bold">
                      DEEPMIND AGENTS
                    </span>
                    <span className="text-slate-400">Virar ↻</span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    <div className="w-20 h-20 rounded-2xl bg-[#0B0F19] border-2 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/antigravity.svg" alt="Google Antigravity" className="w-14 h-14 object-contain" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-white">IA &amp; Engenharia</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Google Antigravity • 3 Camadas</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#4285F4]">↺ Veja as especificações</div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-slate-900 border border-[#4285F4] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#4285F4]">Google Antigravity</span>
                      <span className="text-[10px] font-mono bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/40 px-2 py-0.5 rounded-full font-bold">
                        AG Kit 2.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Estruturado na Arquitetura de 3 Camadas (Diretivas SOP, Orquestração IA e Execução Determinística) com ciclo de autorrecuperação e conformidade SENAI Ourinhos.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                    Google Antigravity • DeepMind • 3-Layer Arch
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Versões (Release Notes) */}
        <div className="mt-8 p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-3">
            Controle de Versões &amp; Histórico de Lançamentos
          </h4>
          {VERSION_HISTORY.map((rel) => (
            <div key={rel.version} className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-bold">
                  v{rel.version}
                </span>
                <span className="text-slate-400">{rel.date}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                {rel.highlights.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Rodapé institucional */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div>
            © 2026 SENAI Ourinhos - Central de Agentes Inteligentes (v{APP_VERSION}) • Professor William Devidé Komel
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <Terminal className="w-4 h-4" />
            <span>SENAI Ourinhos Edition • Google Antigravity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
