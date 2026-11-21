import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Code2,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  GraduationCap,
  HelpCircle,
  Info,
  LayoutGrid,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Settings,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AboutView } from './components/AboutView';
import { AgentHub, type AbaAgente } from './components/AgentHub';
import { AuthModal } from './components/AuthModal';
import { BannerBancaAoVivo } from './components/BannerBancaAoVivo';
import { ModalEntregaArquivos } from './components/ModalEntregaArquivos';
import { ModalReauditoria } from './components/ModalReauditoria';
import { PainelBancaConsolidada } from './components/PainelBancaConsolidada';
import { StudentLandingPage } from './components/StudentLandingPage';
import { APP_VERSION } from './config/version';
import { api } from './services/api';
import { auth, onAuthStateChanged, signOut, type User } from './services/firebase';
import {
  salvarAvaliacaoNoFirestore,
  escutarAvaliacoesGrupoFirestore,
  calcularMediaBanca,
  iniciarSessaoBanca,
  escutarSessaoBanca,
  escutarTodasSessoesAtivas,
  escutarTodasSessoesBanca,
  encerrarMinhaAvaliacao,
  encerrarEConsolidarBanca,
  atualizarPendenciasBanca,
  reabrirBancaParaEntregue,
  sincronizarRevisaoPosBancaFirestore,
  resetarBancaGrupo,
  recalcularEConsolidarBancaAposEdicao,
  salvarAnaliseAutomaticaFirestore,
  salvarDraftLocalStorage,
  carregarDraftLocalStorage,
} from './services/bancaMultiAvaliador';
import type {
  AgentStatus,
  AgentSummary,
  AvaliacaoGrupo,
  AvaliacaoProfessorIndividual,
  BancaConsolidada,
  ConfigEnv,
  NivelMSEP,
  NotaIndividualIntegrante,
  RegrasOficiaisResponse,
  ResultadoFinalTipo,
  RubricaItemAvaliacao,
  SessaoBancaAoVivo,
} from './types';

const CONFIG_INICIAL: ConfigEnv = {
  escola: '794 - ESCOLA SENAI OURINHOS',
  disciplina: 'Projetos de Software III (PSOF3)',
  avaliador_padrao: 'Prof. William Devidé Komel',
  pasta_tcc: './tcc',
  pasta_destino: './downloads_relatorios',
  github_token_configurado: true,
  github_token_preview: '',
  gemini_api_key: '',
  gemini_model: 'gemini-2.5-flash',
  firebase_project_id: '',
  firebase_api_key: '',
  firebase_auth_domain: '',
  firebase_storage_bucket: '',
  firebase_sincronizacao_ativa: true,
  auditar_online_github_deploy: true,
};

function calcularNivel(nota: number, pesoMax: number): NivelMSEP {
  if (pesoMax <= 0) return 'Pleno';
  const pct = (nota / pesoMax) * 100;
  if (pct < 50) return 'Insuficiente';
  if (pct < 90) return 'Pleno';
  return 'Avançado';
}

function parseDataIso(dataBr: string): string {
  if (!dataBr) return '9999-99-99';
  if (dataBr.includes('/')) {
    const p = dataBr.split('/');
    if (p.length === 3) {
      return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
  }
  return dataBr;
}

function parseHorarioPeso(horario: string): number {
  const h = (horario || '').toLowerCase();
  if (h.includes('primeiro')) return 1;
  if (h.includes('segundo')) return 2;
  if (h.includes('terceiro')) return 3;
  if (h.includes('quarto')) return 4;
  return 99;
}

function compararBancasTurmaDataHorario(a: AvaliacaoGrupo, b: AvaliacaoGrupo): number {
  // 1. Ordem de Turma (I2DEV-A primeiro, depois I2DEV-B)
  const compTurma = a.turma.localeCompare(b.turma);
  if (compTurma !== 0) return compTurma;

  // 2. Ordem de Data (cronológica)
  const dataA = a.data_banca_iso || parseDataIso(a.data_banca);
  const dataB = b.data_banca_iso || parseDataIso(b.data_banca);
  const compData = dataA.localeCompare(dataB);
  if (compData !== 0) return compData;

  // 3. Ordem de Horário (Primeiro Horário, Segundo, Terceiro, Quarto)
  const pesoA = parseHorarioPeso(a.horario);
  const pesoB = parseHorarioPeso(b.horario);
  if (pesoA !== pesoB) return pesoA - pesoB;

  return (a.ordem_apresentacao || 999) - (b.ordem_apresentacao || 999);
}

function detectarRotaInicial(): 'alunos' | 'professor' {
  if (typeof window === 'undefined') return 'alunos';
  const caminho = window.location.pathname.toLowerCase();
  return caminho.startsWith('/professor') || caminho.startsWith('/admin') ? 'professor' : 'alunos';
}

export function App() {
  const [rotaAtual, setRotaAtual] = useState<'alunos' | 'professor'>(detectarRotaInicial);
  const [agenteAtivo, setAgenteAtivo] = useState<string | null>(null);
  const [exibirSobre, setExibirSobre] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAgente>('bancas');

  const [agentesCatalogo, setAgentesCatalogo] = useState<AgentSummary[]>([]);
  const [bancas, setBancas] = useState<AvaliacaoGrupo[]>([]);
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string>('I2DEV-B_Grupo08');
  const [turmaFiltro, setTurmaFiltro] = useState<'Todas' | 'I2DEV-A' | 'I2DEV-B'>('Todas');
  const [dataFiltro, setDataFiltro] = useState<string>('');
  const [apenasEntregues, setApenasEntregues] = useState<boolean>(false);
  const [buscaGrupo, setBuscaGrupo] = useState<string>('');
  const [colunaEsquerdaRecolhida, setColunaEsquerdaRecolhida] = useState<boolean>(false);

  // Estados de Autenticação Firebase & Avaliação Multi-Docente (2 Professores)
  const [usuarioAuth, setUsuarioAuth] = useState<User | null>(null);
  const [authModalAberto, setAuthModalAberto] = useState<boolean>(false);
  const [modalReauditoriaAberto, setModalReauditoriaAberto] = useState<boolean>(false);
  const [modalArquivosAberto, setModalArquivosAberto] = useState<boolean>(false);
  const [abaModalArquivos, setAbaModalArquivos] = useState<'originais' | 'revisados'>('originais');
  const [authPronto, setAuthPronto] = useState<boolean>(false);
  const [bancaConsolidada, setBancaConsolidada] = useState<BancaConsolidada | null>(null);
  const [sessaoAoVivo, setSessaoAoVivo] = useState<SessaoBancaAoVivo | null>(null);
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoBancaAoVivo[]>([]);
  const [mapaSessoesBanca, setMapaSessoesBanca] = useState<Record<string, SessaoBancaAoVivo>>({});

  // Estados editáveis da Ficha MSEP do grupo selecionado
  const [rubricasEdit, setRubricasEdit] = useState<RubricaItemAvaliacao[]>([]);
  const [integrantesEdit, setIntegrantesEdit] = useState<NotaIndividualIntegrante[]>([]);
  const [parecerEdit, setParecerEdit] = useState<string>('');
  const [avaliadorEdit, setAvaliadorEdit] = useState<string>('Prof. William Devidé Komel');
  const [salvandoFicha, setSalvandoFicha] = useState<boolean>(false);
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);
  const [exportandoDossie, setExportandoDossie] = useState<boolean>(false);
  const [exportandoXlsx, setExportandoXlsx] = useState<boolean>(false);
  const [detalhesStatusAberto, setDetalhesStatusAberto] = useState<boolean>(false);
  const [statusManualLiberacao, setStatusManualLiberacao] = useState<ResultadoFinalTipo | null>(null);

  // Estados para os blocos minimizáveis (accordion) da aba Auditoria & Bancas
  const [blocoParecerAberto, setBlocoParecerAberto] = useState<boolean>(false);
  const [blocoAnexosAberto, setBlocoAnexosAberto] = useState<boolean>(false);
  const [blocoTabelasAberto, setBlocoTabelasAberto] = useState<boolean>(false);
  const [blocoPilar4Aberto, setBlocoPilar4Aberto] = useState<boolean>(false);

  // Estado para reabertura de edição de banca concluída / encerrada
  const [modoEdicaoReaberto, setModoEdicaoReaberto] = useState<boolean>(false);

  const [regrasOficiais, setRegrasOficiais] = useState<RegrasOficiaisResponse | null>(null);
  const [env, setEnv] = useState<ConfigEnv>(CONFIG_INICIAL);
  const [status, setStatus] = useState<AgentStatus>({
    estado: 'idle',
    tarefa_atual: null,
    progresso_atual: 0,
    progresso_total: 0,
    progresso_etapa: null,
    logs: [],
    ultimo_arquivo: null,
    erro: null,
  });

  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [horaAtual, setHoraAtual] = useState(() => new Date().toLocaleTimeString('pt-BR'));

  const carregarTudo = async () => {
    try {
      const [agRes, bancasRes, cfgRes, stRes, regRes] = await Promise.all([
        api.getAgents(),
        api.getBancas(),
        api.getConfig(),
        api.getStatus(),
        api.getRegras(),
      ]);
      setAgentesCatalogo(agRes.agentes || []);
      setBancas(bancasRes.bancas || []);
      setEnv(cfgRes);
      setStatus(stRes);
      setRegrasOficiais(regRes);

      const lista = bancasRes.bancas || [];
      const primeiroEntregue = lista.find((b) => b.entregue_na_pasta) || lista[0];
      if (primeiroEntregue && !lista.some((b) => b.id === grupoSelecionadoId)) {
        setGrupoSelecionadoId(primeiroEntregue.id);
      }
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? err.message
            : 'Falha ao conectar com o backend FastAPI (porta 8000).',
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarTudo();
  }, []);

  const navegarPara = (destino: 'alunos' | 'professor') => {
    const alvoUrl = destino === 'professor' ? '/professor' : '/';
    if (typeof window !== 'undefined' && window.location.pathname !== alvoUrl) {
      window.history.pushState({}, '', alvoUrl);
    }
    setRotaAtual(destino);
    if (destino === 'professor' && !usuarioAuth) {
      setAuthModalAberto(true);
    } else if (destino === 'alunos') {
      setAuthModalAberto(false);
    }
  };

  // Sincronizar botão voltar/avançar do navegador entre Portal dos Alunos (/) e Área do Professor (/professor)
  useEffect(() => {
    const aoNavegarHistorico = () => {
      setRotaAtual(detectarRotaInicial());
    };
    window.addEventListener('popstate', aoNavegarHistorico);
    return () => window.removeEventListener('popstate', aoNavegarHistorico);
  }, []);

  // Monitorar estado de autenticação Firebase dos Professores Avaliadores (Identificação Obrigatória na rota /professor)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuarioAuth(user);
      setAuthPronto(true);
      if (user) {
        setAuthModalAberto(false);
        if (user.displayName) {
          setAvaliadorEdit(user.displayName);
        }
      }
    });
    return () => unsub();
  }, []);

  // Relógio em tempo real no cabeçalho
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling de status quando a auditoria estiver rodando
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const st = await api.getStatus();
        setStatus((prev) => {
          if (prev.estado === 'running' && st.estado !== 'running') {
            void carregarTudo();
            if (st.estado === 'success') {
              setAviso({
                tipo: 'ok',
                texto: st.progresso_etapa || 'Auditoria das bancas concluída com sucesso!',
              });
            } else if (st.estado === 'error' && st.erro) {
              setAviso({ tipo: 'erro', texto: st.erro });
            }
          }
          return st;
        });
      } catch {
        // Ignorar falha momentânea de rede
      }
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const grupoAtual = bancas.find((b) => b.id === grupoSelecionadoId) || bancas[0] || null;

  // Dados consolidados e sessão ao vivo pós-banca para o grupo selecionado
  const sessaoAtual = (grupoAtual ? mapaSessoesBanca[grupoAtual.id] : null) || sessaoAoVivo;
  const statusSessaoBancaAtual = sessaoAtual?.status || 'aguardando_inicio';
  const consolidadaAtual = sessaoAtual?.banca_consolidada || bancaConsolidada;
  const minhaAvaliacaoNaSessao = usuarioAuth?.uid && consolidadaAtual
    ? consolidadaAtual.avaliacoes_individuais[usuarioAuth.uid]
    : null;
  const euJaEncerreiMinhaAvaliacao = Boolean(minhaAvaliacaoNaSessao?.concluido);

  // Regra de bloqueio de edição na Ficha MSEP:
  // NENHUM valor é alterado simplesmente por acessar a guia.
  // - Se 'aguardando_inicio': somente leitura (exige iniciar a banca ao vivo)
  // - Se 'em_andamento': liberado para edição até encerrar; se encerrou, pode reabrir
  // - Se 'concluida': somente leitura oficial, a menos que o professor clique em 'Editar Minha Avaliação / Editar Banca'
  const podeEditarFicha = statusSessaoBancaAtual === 'em_andamento'
    ? (!euJaEncerreiMinhaAvaliacao || modoEdicaoReaberto)
    : (statusSessaoBancaAtual === 'concluida' && modoEdicaoReaberto);

  // Determinar se o usuário logado possui privilégios de Professor Titular / Presidente da Banca
  // Como o sistema é exclusivo dos docentes avaliadores, qualquer professor autenticado tem poderes de gestão da banca
  const isProfessorTitular = Boolean(usuarioAuth);

  // Escutar todas as sessões de bancas cadastradas no Firestore (para status dos cards e banner ao vivo)
  useEffect(() => {
    const unsub = escutarTodasSessoesBanca((mapa) => {
      setMapaSessoesBanca(mapa);
      const ativas = Object.values(mapa).filter((s) => s.status === 'em_andamento');
      setSessoesAtivas(ativas);
    });
    return () => unsub();
  }, []);

  // Escutar a sessão ao vivo da banca do grupo selecionado no Firestore
  useEffect(() => {
    if (rotaAtual !== 'professor' || !grupoAtual?.id) {
      setSessaoAoVivo(null);
      return;
    }
    const unsub = escutarSessaoBanca(grupoAtual.id, (sessao) => {
      setSessaoAoVivo(sessao);
    });
    return () => unsub();
  }, [rotaAtual, grupoAtual?.id]);

  // Persistir a análise prévia automática no Firebase Firestore apenas quando professor autenticado na área docente
  useEffect(() => {
    if (rotaAtual === 'professor' && usuarioAuth && grupoAtual && grupoAtual.entregue_na_pasta) {
      void salvarAnaliseAutomaticaFirestore(grupoAtual);
    }
  }, [rotaAtual, usuarioAuth?.uid, grupoAtual?.id, grupoAtual?.media_nota_final_grupo]);

  // Sincronizar estados editáveis com draft de localStorage ou dados originais
  useEffect(() => {
    setModoEdicaoReaberto(false);
    if (grupoAtual && usuarioAuth) {
      const draft = carregarDraftLocalStorage(grupoAtual.id, usuarioAuth.uid);
      if (draft && draft.rubricas.length > 0) {
        setRubricasEdit(draft.rubricas);
        setIntegrantesEdit(draft.integrantes_notas);
        setParecerEdit(draft.parecer_tecnico);
        setStatusManualLiberacao(draft.status_liberacao_manual || null);
      } else {
        setRubricasEdit(grupoAtual.rubricas.map((r) => ({ ...r })));
        setIntegrantesEdit(grupoAtual.integrantes_notas.map((i) => ({ ...i })));
        setParecerEdit('');
        setStatusManualLiberacao(null);
      }
      setAvaliadorEdit(usuarioAuth.displayName || grupoAtual.avaliador || env.avaliador_padrao);
    } else if (grupoAtual) {
      setRubricasEdit(grupoAtual.rubricas.map((r) => ({ ...r })));
      setIntegrantesEdit(grupoAtual.integrantes_notas.map((i) => ({ ...i })));
      setParecerEdit('');
      setStatusManualLiberacao(null);
      setAvaliadorEdit(grupoAtual.avaliador || env.avaliador_padrao);
    }
  }, [grupoAtual?.id, usuarioAuth?.uid]);

  // Auto-save local em tempo real no localStorage APENAS quando a edição for ativamente permitida
  useEffect(() => {
    if (podeEditarFicha && grupoAtual && usuarioAuth && rubricasEdit.length > 0) {
      salvarDraftLocalStorage({
        grupo_id: grupoAtual.id,
        professor_uid: usuarioAuth.uid,
        rubricas: rubricasEdit,
        integrantes_notas: integrantesEdit,
        parecer_tecnico: parecerEdit,
        status_liberacao_manual: statusManualLiberacao,
        salvo_em: new Date().toISOString(),
      });
    }
  }, [podeEditarFicha, grupoAtual?.id, usuarioAuth?.uid, rubricasEdit, integrantesEdit, parecerEdit, statusManualLiberacao]);

  // Escutar avaliações dos 2 professores no Firestore em tempo real
  useEffect(() => {
    if (rotaAtual !== 'professor' || !grupoAtual?.id) {
      setBancaConsolidada(null);
      return;
    }
    const unsub = escutarAvaliacoesGrupoFirestore(grupoAtual.id, (avaliacoes) => {
      const consolidada = calcularMediaBanca(avaliacoes, grupoAtual);
      setBancaConsolidada(consolidada);
    });
    return () => unsub();
  }, [rotaAtual, grupoAtual?.id]);

  // Recalcular notas em tempo real na Ficha MSEP
  const p1TotalEdit = Number(
    rubricasEdit
      .filter((r) => r.pilar === 1)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0)
      .toFixed(2),
  );
  const p2TotalEdit = Number(
    rubricasEdit
      .filter((r) => r.pilar === 2)
      .reduce((acc, r) => acc + Number(r.nota || 0), 0)
      .toFixed(2),
  );
  const rubrica32 = rubricasEdit.find((r) => r.codigo === '3.2');
  const rubrica33 = rubricasEdit.find((r) => r.codigo === '3.3');
  const nota32 = rubrica32 ? (rubrica32.nivel === 'Pendente' ? 0 : Number(rubrica32.nota || 0)) : 0;
  const nota33 = rubrica33 ? (rubrica33.nivel === 'Pendente' ? 0 : Number(rubrica33.nota || 0)) : 0;
  const p3BaseEdit = Number((nota32 + nota33).toFixed(2));

  // Itens coletivos insuficientes (Pilares 1, 2 e itens 3.2, 3.3 quando já avaliados como Insuficiente)
  const itensInsuficientesColetivos = rubricasEdit
    .filter(
      (r) =>
        (r.pilar === 1 || r.pilar === 2 || r.codigo === '3.2' || r.codigo === '3.3') &&
        r.nivel === 'Insuficiente',
    )
    .map((r) => r.codigo);

  const calcularStatusFinalAluno = (ind: NotaIndividualIntegrante) => {
    const n31 = ind.nivel_3_1 === 'Pendente' ? 0 : Number(ind.nota_3_1_arguicao || 0);
    const p3 = Number((n31 + p3BaseEdit).toFixed(2));
    const p4 = Number((Number(ind.nota_4_1_sprints || 0) + Number(ind.nota_4_2_participacao || 0)).toFixed(2));
    const nf = Number((p1TotalEdit + p2TotalEdit + p3 + p4).toFixed(2));
    const insufInd = [...itensInsuficientesColetivos];
    if (ind.nivel_3_1 === 'Insuficiente') insufInd.push('3.1');
    // Regra SENAI: Notas insuficientes no Pilar 4 (4.1 e 4.2) NÃO retêm a nota.

    let resultado: ResultadoFinalTipo;
    if (statusManualLiberacao) {
      resultado = statusManualLiberacao;
    } else if (nf < 50.0) {
      resultado = 'Nova Chance (Data Futura)';
    } else if (insufInd.length > 0) {
      resultado = 'Nota Retida (Pendências)';
    } else {
      resultado = 'Aprovado';
    }
    return { p3, p4, nf, insufInd, resultado };
  };

  const atualizarNotaRubrica = (codigo: string, novaNota: number, pesoMax: number) => {
    const limitada = Math.max(0, Math.min(pesoMax, Number(novaNota) || 0));
    setRubricasEdit((prev) =>
      prev.map((r) =>
        r.codigo === codigo
          ? {
              ...r,
              nota: limitada,
              nivel: calcularNivel(limitada, pesoMax),
              editado_manualmente: true,
            }
          : r,
      ),
    );
  };

  const aplicarPresetNivelRubrica = (codigo: string, nivel: NivelMSEP, pesoMax: number) => {
    const fator = nivel === 'Avançado' ? 1.0 : nivel === 'Pleno' ? 0.75 : 0.35;
    atualizarNotaRubrica(codigo, Number((pesoMax * fator).toFixed(2)), pesoMax);
  };

  const restaurarRubricaAutomatica = (codigo: string) => {
    setRubricasEdit((prev) =>
      prev.map((r) =>
        r.codigo === codigo
          ? {
              ...r,
              nota: r.nota_sugerida_ia,
              nivel: r.nivel_sugerido_ia,
              editado_manualmente: false,
            }
          : r,
      ),
    );
  };

  const atualizarNotaIntegrante = (
    idx: number,
    campo: 'nota_3_1_arguicao' | 'nota_4_1_sprints' | 'nota_4_2_participacao',
    valor: number,
    maxVal: number,
  ) => {
    const lim = Math.max(0, Math.min(maxVal, Number(valor) || 0));
    setIntegrantesEdit((prev) =>
      prev.map((ind, i) => {
        if (i !== idx) return ind;
        const novo = { ...ind, [campo]: lim };
        if (campo === 'nota_3_1_arguicao') {
          novo.nivel_3_1 = calcularNivel(lim, 6.0);
        } else if (campo === 'nota_4_1_sprints') {
          novo.nivel_4_1 = calcularNivel(lim, 8.0);
        } else if (campo === 'nota_4_2_participacao') {
          novo.nivel_4_2 = calcularNivel(lim, 7.0);
        }
        return novo;
      }),
    );
  };

  const aplicarNivelIntegrante = (
    idx: number,
    campo: 'nota_3_1_arguicao' | 'nota_4_1_sprints' | 'nota_4_2_participacao',
    nivel: NivelMSEP,
    maxVal: number,
  ) => {
    const fator = nivel === 'Avançado' ? 1.0 : nivel === 'Pleno' ? 0.75 : 0.35;
    atualizarNotaIntegrante(idx, campo, Number((maxVal * fator).toFixed(2)), maxVal);
  };

  const restaurarItemIntegrante = (
    idx: number,
    campo: 'nota_3_1_arguicao' | 'nota_4_1_sprints' | 'nota_4_2_participacao',
  ) => {
    setIntegrantesEdit((prev) =>
      prev.map((ind, i) => {
        if (i !== idx) return ind;
        if (campo === 'nota_3_1_arguicao') {
          return {
            ...ind,
            nota_3_1_arguicao: ind.nota_3_1_sugerida ?? 0,
            nivel_3_1: ind.nivel_3_1_sugerido ?? 'Pendente',
          };
        }
        if (campo === 'nota_4_1_sprints') {
          return {
            ...ind,
            nota_4_1_sprints: ind.nota_4_1_sugerida,
            nivel_4_1: ind.nivel_4_1_sugerido,
          };
        }
        return {
          ...ind,
          nota_4_2_participacao: ind.nota_4_2_sugerida,
          nivel_4_2: ind.nivel_4_2_sugerido,
        };
      }),
    );
  };

  const handleAuditarAgora = async (grupoIds?: string[] | null, turma?: string | null) => {
    setAviso(null);
    try {
      await api.auditarBancas({
        grupo_ids: grupoIds ?? null,
        turma: turma && turma !== 'Todas' ? turma : null,
        forcar_reauditoria: true,
        sincronizar_firebase: true,
      });
      const st = await api.getStatus();
      setStatus(st);
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao disparar auditoria.',
      });
    }
  };

  const handleReabrirBancaParaEntregue = async (): Promise<boolean> => {
    if (!grupoAtual) return false;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return false;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const resFb = await reabrirBancaParaEntregue(grupoAtual, usuarioAuth);
      if (!resFb.ok) {
        setAviso({ tipo: 'erro', texto: resFb.mensagem });
        return false;
      }
      const resBk = await api.reabrirBancaBackend(grupoAtual.id);
      setBancas((prev) => prev.map((b) => (b.id === resBk.banca.id ? resBk.banca : b)));
      await carregarTudo();
      setAviso({ tipo: 'ok', texto: resBk.mensagem });
      return true;
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao reabrir a banca para estado entregue.',
      });
      return false;
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleSalvarFicha = async () => {
    if (!grupoAtual) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      setAviso({
        tipo: 'erro',
        texto: 'Por favor, faça login ou identifique-se como Professor Avaliador para registrar suas notas individuais da banca no Firebase.',
      });
      return;
    }

    setSalvandoFicha(true);
    setAviso(null);
    try {
      const recalculados: NotaIndividualIntegrante[] = integrantesEdit.map((ind) => {
        const calc = calcularStatusFinalAluno(ind);
        return {
          ...ind,
          p1_nota: p1TotalEdit,
          p2_nota: p2TotalEdit,
          p3_nota: calc.p3,
          p4_nota: calc.p4,
          nota_final: calc.nf,
          possui_item_insuficiente: calc.insufInd.length > 0,
          itens_insuficientes: calc.insufInd,
          resultado: calc.resultado,
        };
      });

      const nomeProfessor =
        usuarioAuth.displayName || avaliadorEdit || usuarioAuth.email?.split('@')[0] || 'Professor Avaliador';

      const mediaFinalGrupoCalculada = Number(
        (
          recalculados.reduce((acc, ind) => acc + ind.nota_final, 0) /
          Math.max(1, recalculados.length)
        ).toFixed(2),
      );

      // 1. Salvar avaliação individual deste professor no Firestore (Sincronização em tempo real entre as 2 máquinas)
      const avaliacaoIndividual: AvaliacaoProfessorIndividual = {
        grupo_id: grupoAtual.id,
        professor_uid: usuarioAuth.uid,
        professor_nome: nomeProfessor,
        professor_email: usuarioAuth.email || '',
        rubricas: rubricasEdit,
        integrantes_notas: recalculados,
        p1_total: p1TotalEdit,
        p2_total: p2TotalEdit,
        p3_grupo_base: p3BaseEdit,
        nota_final_grupo: mediaFinalGrupoCalculada,
        parecer_tecnico: parecerEdit,
        status_liberacao_manual: statusManualLiberacao,
        atualizado_em: new Date().toISOString(),
      };

      await salvarAvaliacaoNoFirestore(avaliacaoIndividual);

      // Se a banca já estava concluída e foi editada, recalcula a consolidação oficial no Firestore
      if (sessaoAtual?.status === 'concluida') {
        await recalcularEConsolidarBancaAposEdicao(grupoAtual.id, grupoAtual);
      }
      setModoEdicaoReaberto(false);

      // 2. Salvar também no backend FastAPI (para relatórios em PDF, Dossiês e XLSX)
      const atualizado = await api.salvarAvaliacao(grupoAtual.id, {
        avaliador: nomeProfessor,
        rubricas: rubricasEdit,
        integrantes_notas: recalculados,
        parecer_tecnico: parecerEdit,
        status_liberacao_manual: statusManualLiberacao,
        sincronizar_firebase: true,
      });

      setBancas((prev) => prev.map((b) => (b.id === atualizado.id ? atualizado : b)));
      setAviso({
        tipo: 'ok',
        texto: sessaoAtual?.status === 'concluida'
          ? `Edição concluída com sucesso! As notas e parecer de ${nomeProfessor} foram salvos e as médias da banca foram recalculadas no Firebase.`
          : `Avaliação do grupo ${atualizado.projeto} salva com sucesso no Firebase pelo ${nomeProfessor}! A média da banca entre os 2 professores é sincronizada em tempo real.`,
      });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao salvar avaliação.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleIniciarBanca = async () => {
    if (!grupoAtual) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const res = await iniciarSessaoBanca(grupoAtual, usuarioAuth);
      setAviso({
        tipo: res.ok ? 'ok' : 'erro',
        texto: res.mensagem,
      });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao iniciar a banca.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleEncerrarMinhaAvaliacao = async () => {
    if (!grupoAtual) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const recalculados: NotaIndividualIntegrante[] = integrantesEdit.map((ind) => {
        const calc = calcularStatusFinalAluno(ind);
        return {
          ...ind,
          p1_nota: p1TotalEdit,
          p2_nota: p2TotalEdit,
          p3_nota: calc.p3,
          p4_nota: calc.p4,
          nota_final: calc.nf,
          possui_item_insuficiente: calc.insufInd.length > 0,
          itens_insuficientes: calc.insufInd,
          resultado: calc.resultado,
        };
      });

      const nomeProfessor =
        usuarioAuth.displayName || avaliadorEdit || usuarioAuth.email?.split('@')[0] || 'Professor Avaliador';

      const mediaFinalGrupoCalculada = Number(
        (
          recalculados.reduce((acc, ind) => acc + ind.nota_final, 0) /
          Math.max(1, recalculados.length)
        ).toFixed(2),
      );

      const avaliacaoIndividual: AvaliacaoProfessorIndividual = {
        grupo_id: grupoAtual.id,
        professor_uid: usuarioAuth.uid,
        professor_nome: nomeProfessor,
        professor_email: usuarioAuth.email || '',
        rubricas: rubricasEdit,
        integrantes_notas: recalculados,
        p1_total: p1TotalEdit,
        p2_total: p2TotalEdit,
        p3_grupo_base: p3BaseEdit,
        nota_final_grupo: mediaFinalGrupoCalculada,
        parecer_tecnico: parecerEdit,
        status_liberacao_manual: statusManualLiberacao,
        concluido: true,
        atualizado_em: new Date().toISOString(),
      };

      const res = await encerrarMinhaAvaliacao(grupoAtual.id, avaliacaoIndividual);

      // Salva também no backend FastAPI local
      await api.salvarAvaliacao(grupoAtual.id, {
        avaliador: nomeProfessor,
        rubricas: rubricasEdit,
        integrantes_notas: recalculados,
        parecer_tecnico: parecerEdit,
        status_liberacao_manual: statusManualLiberacao,
        sincronizar_firebase: true,
      });

      setAviso({
        tipo: res.ok ? 'ok' : 'erro',
        texto: res.mensagem,
      });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao encerrar avaliação.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleEncerrarEConsolidarBanca = async (contingencia = false, justificativa = '') => {
    if (!grupoAtual || !bancaConsolidada) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const res = await encerrarEConsolidarBanca(
        grupoAtual.id,
        bancaConsolidada,
        usuarioAuth,
        sessaoAoVivo?.iniciado_em || null,
        contingencia,
        justificativa,
      );
      setAviso({
        tipo: res.ok ? 'ok' : 'erro',
        texto: res.mensagem,
      });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao consolidar fechamento da banca.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleAtualizarPendencias = async (dados: {
    possui_pendencias: boolean;
    pendencias_descricao: string;
    pendencias_cumpridas: boolean;
    novo_status_liberacao: ResultadoFinalTipo;
  }) => {
    if (!grupoAtual) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const res = await atualizarPendenciasBanca(
        grupoAtual.id,
        sessaoAtual || null,
        consolidadaAtual || null,
        usuarioAuth,
        dados,
      );
      setAviso({ tipo: res.ok ? 'ok' : 'erro', texto: res.mensagem });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao atualizar pendências no portal.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleResetarBanca = async () => {
    if (!grupoAtual) return;
    if (!usuarioAuth) {
      setAuthModalAberto(true);
      return;
    }
    setSalvandoFicha(true);
    setAviso(null);
    try {
      const res = await resetarBancaGrupo(grupoAtual, usuarioAuth);
      if (res.ok) {
        setBancaConsolidada(null);
        setStatusManualLiberacao(null);
        setRubricasEdit(grupoAtual.rubricas.map((r) => ({ ...r })));
        setIntegrantesEdit(grupoAtual.integrantes_notas.map((i) => ({ ...i })));
        setParecerEdit('');
        setAviso({
          tipo: 'ok',
          texto: res.mensagem,
        });
      } else {
        setAviso({
          tipo: 'erro',
          texto: res.mensagem,
        });
      }
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao resetar a banca.',
      });
    } finally {
      setSalvandoFicha(false);
    }
  };

  const handleExportarFichaPdf = async (grupoId: string) => {
    setExportandoPdf(true);
    setAviso(null);
    try {
      const res = await api.exportarFichaPdf(grupoId);
      setAviso({ tipo: 'ok', texto: res.mensagem });
      window.open(api.getDownloadUrl(res.arquivo), '_blank');
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao gerar Ficha PDF.',
      });
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarDossie = async (grupoId: string) => {
    setExportandoDossie(true);
    setAviso(null);
    try {
      const res = await api.exportarDossie(grupoId);
      setAviso({ tipo: 'ok', texto: res.mensagem });
      window.open(api.getDownloadUrl(res.arquivo_pdf), '_blank');
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao gerar Dossiê Analítico.',
      });
    } finally {
      setExportandoDossie(false);
    }
  };

  const handleExportarConsolidadoXlsx = async (turma?: string) => {
    setExportandoXlsx(true);
    setAviso(null);
    try {
      const res = await api.exportarConsolidadoXlsx(turma);
      setAviso({ tipo: 'ok', texto: res.mensagem });
      window.open(api.getDownloadUrl(res.arquivo), '_blank');
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao exportar planilha XLSX.',
      });
    } finally {
      setExportandoXlsx(false);
    }
  };

  const handleSincronizarTodosFirebase = async () => {
    setAviso(null);
    try {
      const res = await api.sincronizarTodosFirebase();
      await carregarTudo();
      setAviso({
        tipo: 'ok',
        texto:
          res.erros && res.erros.length > 0
            ? `${res.mensagem} (${res.erros[0]})`
            : res.mensagem,
      });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao sincronizar com Firebase.',
      });
    }
  };

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    try {
      const atualizado = await api.saveConfig(env);
      setEnv(atualizado);
      setAviso({ tipo: 'ok', texto: 'Configurações salvas no arquivo .env com sucesso!' });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao salvar configurações.',
      });
    }
  };

  // Filtrar e ordenar as bancas primeiro por ordem de TURMA, depois de DATA e por último de HORÁRIO
  const bancasFiltradas = [...bancas]
    .filter((b) => {
      if (turmaFiltro !== 'Todas' && b.turma !== turmaFiltro) return false;
      if (apenasEntregues && !b.entregue_na_pasta) return false;
      if (dataFiltro) {
        const dataIsoGrupo =
          b.data_banca_iso ||
          (b.data_banca.includes('/')
            ? b.data_banca.split('/').reverse().join('-')
            : '');
        if (dataIsoGrupo !== dataFiltro) return false;
      }
      const t = buscaGrupo.trim().toLowerCase();
      if (!t) return true;
      return (
        b.projeto.toLowerCase().includes(t) ||
        b.grupo.toLowerCase().includes(t) ||
        b.tema.toLowerCase().includes(t) ||
        b.integrantes.some((i) => i.toLowerCase().includes(t))
      );
    })
    .sort(compararBancasTurmaDataHorario);

  const totalEntregues = bancas.filter((b) => b.entregue_na_pasta).length;
  const entreguesI2DEVA = bancas.filter((b) => b.turma === 'I2DEV-A' && b.entregue_na_pasta).length;
  const entreguesI2DEVB = bancas.filter((b) => b.turma === 'I2DEV-B' && b.entregue_na_pasta).length;
  const totalApresentados = Object.values(mapaSessoesBanca).filter((s) => s.status === 'concluida').length;

  const formatarDataHoraEfetivaBanca = (
    iniciadoEm: string | null | undefined,
    encerradoEm: string | null | undefined,
    dataFallback: string,
    horarioFallback: string,
  ): string => {
    try {
      if (iniciadoEm && encerradoEm) {
        const dIni = new Date(iniciadoEm);
        const dFim = new Date(encerradoEm);
        const dataStr = dIni.toLocaleDateString('pt-BR');
        const horaIni = dIni.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const horaFim = dFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dataStr} das ${horaIni} às ${horaFim}`;
      }
      if (encerradoEm) {
        const dFim = new Date(encerradoEm);
        return `${dFim.toLocaleDateString('pt-BR')} às ${dFim.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      }
    } catch {
      // Fallback em caso de data inválida
    }
    return `${dataFallback} • ${horarioFallback}`;
  };

  const badgeResultadoFinal = (res: ResultadoFinalTipo) => {
    if (res === 'Aprovado') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aprovado (Liberada)
        </span>
      );
    }
    if (res === 'Nota Retida (Pendências)') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
          <Lock className="h-3.5 w-3.5 text-amber-700" />
          Nota Retida (Pendências)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        Nova Chance (Data Futura)
      </span>
    );
  };

  // Cálculo da média do grupo e status da nota consolidada
  const mediaGrupoEdit = Number(
    (
      integrantesEdit.reduce((acc, ind) => acc + calcularStatusFinalAluno(ind).nf, 0) /
      Math.max(1, integrantesEdit.length)
    ).toFixed(2),
  );

  const todasPendenciasRetencao: string[] = [];
  itensInsuficientesColetivos.forEach((cod) => {
    const rub = rubricasEdit.find((r) => r.codigo === cod);
    todasPendenciasRetencao.push(
      rub
        ? `${rub.codigo} ${rub.titulo} (${rub.nota.toFixed(1)}/${rub.peso_max.toFixed(1)})`
        : `Item ${cod}`,
    );
  });

  integrantesEdit.forEach((ind) => {
    if (ind.nivel_3_1 === 'Insuficiente') {
      todasPendenciasRetencao.push(
        `3.1 Arguição Técnica — ${ind.nome} (${(Number(ind.nota_3_1_arguicao) || 0).toFixed(1)}/6.0)`,
      );
    }
  });

  let statusSugeridoCalculado: 'liberada' | 'retida' | 'nova_apresentacao' = 'liberada';
  if (mediaGrupoEdit < 50.0 || (grupoAtual && !grupoAtual.entregue_na_pasta)) {
    statusSugeridoCalculado = 'nova_apresentacao';
  } else if (todasPendenciasRetencao.length > 0) {
    statusSugeridoCalculado = 'retida';
  } else {
    statusSugeridoCalculado = 'liberada';
  }

  // Se o professor selecionou uma opção manual soberana, ela sobrepõe a sugestão automática
  let statusGrupoTipo: 'liberada' | 'retida' | 'nova_apresentacao' = statusSugeridoCalculado;
  if (statusManualLiberacao === 'Aprovado') {
    statusGrupoTipo = 'liberada';
  } else if (statusManualLiberacao === 'Nota Retida (Pendências)') {
    statusGrupoTipo = 'retida';
  } else if (statusManualLiberacao === 'Nova Chance (Data Futura)') {
    statusGrupoTipo = 'nova_apresentacao';
  }

  const motivoReapresentacao =
    grupoAtual && !grupoAtual.entregue_na_pasta
      ? 'Grupo sem entrega dos arquivos obrigatórios na pasta da turma.'
      : `Média final calculada em ${mediaGrupoEdit.toFixed(2)} pts, inferior ao mínimo regulamentar de 50,0 pts exigido para aprovação direta.`;

  // Dados consolidados pós-banca realizada para o grupo selecionado
  const bancaJaRealizadaAtual = sessaoAtual?.status === 'concluida';
  const avaliacoesIndividuaisMap = consolidadaAtual?.avaliacoes_individuais || {};
  const avaliacoesIndividuaisList = Object.values(avaliacoesIndividuaisMap);
  const statusFinalGrupoAtual = bancaJaRealizadaAtual
    ? (sessaoAtual?.status_liberacao_final ??
      consolidadaAtual?.status_liberacao_final ??
      grupoAtual?.status_liberacao_nota ??
      'Aprovado')
    : (grupoAtual?.status_liberacao_nota ?? 'Aprovado');
  const mediaFinalGrupoAtual = bancaJaRealizadaAtual
    ? (sessaoAtual?.media_final_consolidada ??
      consolidadaAtual?.media_final ??
      grupoAtual?.media_nota_final_grupo ??
      0)
    : (grupoAtual?.media_nota_final_grupo ?? 0);

  const nomesAvaliadoresBanca: string[] = [];
  if (sessaoAtual?.avaliadores_presentes?.length) {
    sessaoAtual.avaliadores_presentes.forEach((n) => {
      if (!nomesAvaliadoresBanca.includes(n)) nomesAvaliadoresBanca.push(n);
    });
  }
  if (avaliacoesIndividuaisList.length > 0) {
    avaliacoesIndividuaisList.forEach((av) => {
      if (!nomesAvaliadoresBanca.includes(av.professor_nome)) nomesAvaliadoresBanca.push(av.professor_nome);
    });
  }
  if (nomesAvaliadoresBanca.length === 0 && sessaoAtual?.titular_nome) {
    nomesAvaliadoresBanca.push(sessaoAtual.titular_nome);
  }

  const pareceresAvaliadoresBanca: {
    professor_nome: string;
    parecer: string;
    atualizado_em?: string;
  }[] = [];
  if (consolidadaAtual?.pareceres_professores?.length) {
    consolidadaAtual.pareceres_professores.forEach((p) => {
      pareceresAvaliadoresBanca.push({
        professor_nome: p.professor_nome,
        parecer: p.parecer,
        atualizado_em: p.atualizado_em,
      });
    });
  } else if (avaliacoesIndividuaisList.length > 0) {
    avaliacoesIndividuaisList.forEach((av) => {
      pareceresAvaliadoresBanca.push({
        professor_nome: av.professor_nome,
        parecer: av.parecer_tecnico,
        atualizado_em: av.atualizado_em,
      });
    });
  }

  // Rota pública raiz (/): Landing Page dos Alunos sem obrigatoriedade de login
  if (rotaAtual === 'alunos') {
    return (
      <StudentLandingPage
        bancas={bancas}
        mapaSessoesBanca={mapaSessoesBanca}
        carregando={carregando}
        usuarioAutenticado={Boolean(usuarioAuth)}
        onIrParaProfessor={() => navegarPara('professor')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Cabeçalho Institucional SENAI Ourinhos */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setExibirSobre(false);
                setAgenteAtivo(null);
              }}
              title="Voltar para a Central de Agentes"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-red-600 shadow transition hover:opacity-90"
            >
              <img src="/senai_icon.png" alt="SENAI" className="h-full w-full object-cover" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  {exibirSobre
                    ? 'SENAI Ourinhos - Central de Agentes Inteligentes'
                    : agenteAtivo
                    ? 'Agente SENAI — Avaliador de Bancas TCC (PSOF3)'
                    : 'SENAI Ourinhos - Central de Agentes Inteligentes'}
                </h1>
                <span className="rounded border border-red-500/40 bg-red-600/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Unidade {env.escola || '794 - ESCOLA SENAI OURINHOS'} • {env.disciplina} • Docente:{' '}
                {env.avaliador_padrao}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 font-mono text-sm font-semibold text-slate-100 shadow-inner">
              <Clock className="h-4 w-4 text-red-400" />
              <span>{horaAtual}</span>
            </div>

            {agenteAtivo && !exibirSobre ? (
              <nav className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setExibirSobre(false);
                    setAgenteAtivo(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Central
                </button>
                <button
                  onClick={() => setAbaAtiva('bancas')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    abaAtiva === 'bancas'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Auditoria & Bancas
                </button>
                <button
                  onClick={() => setAbaAtiva('ficha')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    abaAtiva === 'ficha'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Ficha MSEP & Arguição
                </button>
                <button
                  onClick={() => setAbaAtiva('consolidado')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    abaAtiva === 'consolidado'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Consolidado Turmas
                </button>
                <button
                  onClick={() => setAbaAtiva('regras')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    abaAtiva === 'regras'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Regras Oficiais
                </button>
                <button
                  onClick={() => setAbaAtiva('configuracoes')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    abaAtiva === 'configuracoes'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </button>
              </nav>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setExibirSobre(false);
                  setAgenteAtivo('avaliador-bancas-tcc');
                  setAbaAtiva('bancas');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-red-400" />
                Abrir Avaliador TCC
              </button>
            )}

            <button
              type="button"
              onClick={() => void api.openFolder('relatorios')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-slate-700 hover:text-white"
              title="Abrir pasta de Relatórios Exportados (PDF, MD e XLSX)"
            >
              <FolderOpen className="h-4 w-4 text-emerald-400" />
              <span>Relatórios</span>
            </button>

            <button
              type="button"
              onClick={() => setExibirSobre((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                exibirSobre
                  ? 'border-amber-400/60 bg-amber-400/20 text-amber-300 shadow-sm'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-400/40 hover:bg-slate-700 hover:text-white'
              }`}
              title="Sobre o Desenvolvedor e Arquitetura"
            >
              <Info className="h-4 w-4 text-amber-400" />
              <span>Sobre</span>
            </button>

            <button
              type="button"
              onClick={() => navegarPara('alunos')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/50 hover:bg-slate-700 hover:text-white cursor-pointer"
              title="Visualizar a Landing Page pública dos alunos (/)"
            >
              <GraduationCap className="h-4 w-4 text-sky-400" />
              <span>Portal dos Alunos</span>
            </button>

            {/* Identificação do Professor Avaliador (Firebase Auth com Google e E-mail) */}
            {usuarioAuth ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-xs">
                {usuarioAuth.photoURL ? (
                  <img
                    src={usuarioAuth.photoURL}
                    alt={usuarioAuth.displayName || 'Foto de Perfil do Avaliador'}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-400 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-emerald-200 ring-2 ring-emerald-500/50 shrink-0">
                    {(usuarioAuth.displayName || usuarioAuth.email || 'A')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{usuarioAuth.displayName || usuarioAuth.email?.split('@')[0]}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80">{usuarioAuth.email}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut(auth);
                    setUsuarioAuth(null);
                  }}
                  className="ml-1 rounded border border-emerald-600/50 bg-emerald-900/50 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-red-900/60 hover:text-red-200 hover:border-red-600/50 transition"
                  title="Sair desta conta de avaliador"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalAberto(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                title="Identifique-se com sua conta de professor para avaliar a banca simultânea"
              >
                <Users className="h-4 w-4" />
                <span>Identificar Avaliador</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-5">
        {/* Banner Global de Alerta de Banca Ao Vivo em Execução */}
        <BannerBancaAoVivo
          sessoesAtivas={sessoesAtivas}
          grupoAtualId={grupoAtual?.id || ''}
          onEntrarNaBanca={(id) => {
            setGrupoSelecionadoId(id);
            setAgenteAtivo('avaliador-bancas-tcc');
            setAbaAtiva('ficha');
          }}
        />

        {aviso && (
          <div
            className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm shadow-xs ${
              aviso.tipo === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <span className="font-medium">{aviso.texto}</span>
            <button
              onClick={() => setAviso(null)}
              className="ml-4 font-bold opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {exibirSobre ? (
          <AboutView onBackToWorkspace={() => setExibirSobre(false)} />
        ) : carregando ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Carregando Central de Agentes SENAI — Avaliador de Bancas TCC...
          </div>
        ) : !agenteAtivo ? (
          <AgentHub
            agentes={agentesCatalogo}
            onAbrirAgente={(id, aba = 'bancas') => {
              setAgenteAtivo(id);
              setAbaAtiva(aba);
            }}
            onExecutarRapido={(id) => {
              setAgenteAtivo(id);
              setAbaAtiva('bancas');
              setModalReauditoriaAberto(true);
            }}
          />
        ) : (
          <>
            {/* =================================================================== */}
            {/* ABA 1: AUDITORIA & BANCAS (VISÃO GERAL + RAIO-X DOS GRUPOS)         */}
            {/* =================================================================== */}
            {abaAtiva === 'bancas' && (
              <div className="space-y-6">
                {/* KPIs Superiores */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-medium text-slate-500">Total no Cronograma Oficial</p>
                    <p className="mt-1 flex items-center justify-between text-xl font-bold text-slate-900">
                      <span>{bancas.length} Bancas</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        13 I2DEV-A • 12 I2DEV-B
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                    <p className="text-xs font-medium text-emerald-800">
                      Entregas Recebidas em ./tcc
                    </p>
                    <p className="mt-1 flex items-center justify-between text-xl font-bold text-emerald-900">
                      <span>{totalEntregues} Grupo(s)</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        A: {entreguesI2DEVA} • B: {entreguesI2DEVB}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-medium text-slate-500">Status do Motor de IA</p>
                    <p className="mt-1 flex items-center gap-2 text-lg font-bold capitalize">
                      {status.estado === 'running' && (
                        <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
                      )}
                      {status.estado === 'success' && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      )}
                      {status.estado === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                      {status.estado === 'idle' && (
                        <CheckCircle2 className="h-5 w-5 text-slate-400" />
                      )}
                      {status.estado === 'running'
                        ? 'Auditando ./tcc...'
                        : status.estado === 'success'
                        ? 'Sincronizado'
                        : 'Pronto'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-medium text-slate-500">Ações Rápidas em Lote</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalReauditoriaAberto(true)}
                        disabled={status.estado === 'running'}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Reauditar ./tcc
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleExportarConsolidadoXlsx(turmaFiltro)}
                        disabled={exportandoXlsx}
                        className="flex items-center justify-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                        title="Exportar Planilha Consolidada XLSX"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        XLSX
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barra de Filtros da Lista de Bancas (Por Turma sem dia da semana + Data com Calendário + Encolher Coluna) */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['Todas', 'I2DEV-A', 'I2DEV-B'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTurmaFiltro(t)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                          turmaFiltro === t
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'Todas'
                          ? 'Todas as Turmas (25)'
                          : t === 'I2DEV-A'
                          ? 'I2DEV-A (13)'
                          : 'I2DEV-B (12)'}
                      </button>
                    ))}

                    {/* Filtro por Dia com Calendário */}
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                      <Calendar className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-[11px] font-semibold text-slate-600">Dia da Banca:</span>
                      <input
                        type="date"
                        value={dataFiltro}
                        onChange={(e) => setDataFiltro(e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 focus:border-red-500 focus:outline-none"
                        title="Filtrar bancas por data de apresentação"
                      />
                      {dataFiltro && (
                        <button
                          type="button"
                          onClick={() => setDataFiltro('')}
                          className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-200"
                          title="Limpar filtro de data"
                        >
                          <X className="h-3 w-3" />
                          Limpar
                        </button>
                      )}
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={apenasEntregues}
                        onChange={(e) => setApenasEntregues(e.target.checked)}
                        className="rounded text-red-600"
                      />
                      Apenas entregues ({totalEntregues})
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar projeto, grupo ou aluno..."
                        value={buscaGrupo}
                        onChange={(e) => setBuscaGrupo(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    {/* Botão para Encolher / Expandir a Coluna da Esquerda */}
                    <button
                      type="button"
                      onClick={() => setColunaEsquerdaRecolhida((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        colunaEsquerdaRecolhida
                          ? 'border-red-600 bg-red-600 text-white shadow-xs hover:bg-red-700'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                      }`}
                      title={
                        colunaEsquerdaRecolhida
                          ? 'Expandir coluna de grupos à esquerda'
                          : 'Encolher coluna da esquerda para ampliar a análise à direita'
                      }
                    >
                      {colunaEsquerdaRecolhida ? (
                        <>
                          <PanelLeftOpen className="h-4 w-4" />
                          Mostrar Lista ({bancasFiltradas.length})
                        </>
                      ) : (
                        <>
                          <PanelLeftClose className="h-4 w-4 text-red-600" />
                          Encolher Lista
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Se a coluna da esquerda estiver encolhida, exibir seletor compacto no topo */}
                {colunaEsquerdaRecolhida && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-white shadow-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase">
                        Modo Análise Expandida
                      </span>
                      <span className="text-xs text-slate-300">Trocar Grupo (Ordem de Apresentação):</span>
                      <select
                        value={grupoAtual?.id || ''}
                        onChange={(e) => setGrupoSelecionadoId(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-white focus:border-red-500 focus:outline-none"
                      >
                        {bancasFiltradas.map((b) => (
                          <option key={b.id} value={b.id}>
                            #{b.ordem_apresentacao}º • {b.data_banca} ({b.horario}) — [{b.turma}] {b.grupo}:{' '}
                            {b.projeto} {b.entregue_na_pasta ? '✅' : '⏳'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setColunaEsquerdaRecolhida(false)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-slate-700"
                    >
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                      Reabrir Faixa da Esquerda
                    </button>
                  </div>
                )}

                {/* Layout Master-Detail: Coluna Esquerda (Ordem de Apresentação) + Coluna Direita (Raio-X Técnico) */}
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Coluna Esquerda: Lista de Bancas pela Ordem de Apresentação */}
                  {!colunaEsquerdaRecolhida && (
                    <div className="space-y-3 lg:col-span-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Ordem de Apresentação ({bancasFiltradas.length} grupos)
                        </h3>
                        <button
                          type="button"
                          onClick={() => void api.openFolder('tcc')}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Abrir pasta ./tcc
                        </button>
                      </div>

                      <div className="max-h-[860px] space-y-2.5 overflow-y-auto pr-1">
                        {bancasFiltradas.length === 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                            Nenhuma banca encontrada para os filtros selecionados.
                          </div>
                        ) : (
                          bancasFiltradas.map((b) => {
                            const selecionado = grupoAtual?.id === b.id;
                            const sessaoB = mapaSessoesBanca[b.id];
                            const bancaJaRealizada = sessaoB?.status === 'concluida';
                            const mediaFinalApresentada =
                              sessaoB?.media_final_consolidada ??
                              sessaoB?.banca_consolidada?.media_final ??
                              b.media_nota_final_grupo;
                            const statusFinalApresentado =
                              sessaoB?.status_liberacao_final ??
                              sessaoB?.banca_consolidada?.status_liberacao_final ??
                              b.status_liberacao_nota;

                            return (
                              <div
                                key={b.id}
                                onClick={() => setGrupoSelecionadoId(b.id)}
                                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                                  selecionado
                                    ? 'border-red-600 bg-red-50/30 ring-2 ring-red-500/20 shadow-sm'
                                    : bancaJaRealizada
                                    ? 'border-purple-300 bg-purple-50/30 hover:border-purple-400 shadow-2xs'
                                    : b.entregue_na_pasta
                                    ? 'border-emerald-200 bg-white hover:border-emerald-400'
                                    : 'border-slate-200 bg-white/80 opacity-85 hover:opacity-100'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                        #{b.ordem_apresentacao}º
                                      </span>
                                      <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                          b.turma === 'I2DEV-A'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {b.turma}
                                      </span>
                                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        {b.grupo}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] font-semibold text-slate-600">
                                      <Calendar className="mr-1 inline h-3 w-3 text-red-500" />
                                      {b.data_banca} • {b.horario}
                                    </p>
                                    <h4 className="mt-1 text-sm font-bold text-slate-900">
                                      {b.projeto}
                                    </h4>
                                    <p className="mt-0.5 text-xs text-slate-600">
                                      <Users className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                                      {b.integrantes.join(', ')}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    {bancaJaRealizada ? (
                                      <>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 shadow-2xs">
                                          <Award className="h-3 w-3 text-purple-700" />
                                          Apresentado
                                        </span>
                                        <p className="mt-1.5 text-base font-extrabold text-slate-900">
                                          {mediaFinalApresentada.toFixed(1)}
                                          <span className="text-[10px] font-normal text-slate-500">
                                            /100
                                          </span>
                                        </p>
                                        <span
                                          className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                            statusFinalApresentado === 'Aprovado'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : statusFinalApresentado ===
                                                  'Nota Retida (Pendências)' ||
                                                statusFinalApresentado === 'Nota Retida'
                                              ? 'bg-amber-100 text-amber-900'
                                              : 'bg-red-100 text-red-800'
                                          }`}
                                        >
                                          {statusFinalApresentado}
                                        </span>
                                      </>
                                    ) : b.entregue_na_pasta ? (
                                      <>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Entregue
                                        </span>
                                        <p className="mt-1.5 text-base font-extrabold text-slate-900">
                                          {b.media_nota_final_grupo.toFixed(1)}
                                          <span className="text-[10px] font-normal text-slate-500">
                                            /100
                                          </span>
                                        </p>
                                        <span
                                          className="mt-0.5 inline-block rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-800"
                                        >
                                          Aguardando Banca
                                        </span>
                                      </>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                        Aguardando
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {(bancaJaRealizada || b.entregue_na_pasta) && (
                                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                                    {bancaJaRealizada ? (
                                      <>
                                        <span className="font-semibold text-purple-900">
                                          ⏱️ Duração: <strong>{sessaoB?.duracao_formatada || 'Concluída'}</strong>
                                        </span>
                                        <span className="font-semibold text-purple-700">
                                          👨‍🏫 {sessaoB?.avaliadores_presentes?.length || 2} Avaliadores
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span>
                                          P1: <strong>{b.p1_total.toFixed(1)}</strong>/30 • P2:{' '}
                                          <strong>{b.p2_total.toFixed(1)}</strong>/40
                                        </span>
                                        <span
                                          className={`font-semibold ${
                                            b.auditoria_tecnica.banco_exclusivo_nuvem &&
                                            !b.auditoria_tecnica.usa_localstorage_indevido &&
                                            b.auditoria_tecnica.sql_atende_min_20_por_tabela
                                              ? 'text-emerald-700'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          {b.auditoria_tecnica.usa_localstorage_indevido
                                            ? '⚠️ localStorage Indevido'
                                            : b.auditoria_tecnica.sql_atende_min_20_por_tabela
                                            ? `✅ ${b.auditoria_tecnica.banco_provedor_nuvem || 'Cloud DB'}`
                                            : `⚠️ SQL < 20 regs`}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Coluna Direita: Raio-X Detalhado do Grupo Selecionado */}
                  <div
                    className={`space-y-5 ${
                      colunaEsquerdaRecolhida ? 'lg:col-span-12' : 'lg:col-span-8'
                    }`}
                  >
                    {grupoAtual ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                        {/* Cabeçalho do Grupo */}
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                                #{grupoAtual.ordem_apresentacao}º na Ordem
                              </span>
                              <span className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                                {grupoAtual.turma} • {grupoAtual.grupo}
                              </span>
                              <span className="text-xs font-semibold text-slate-600">
                                Banca: {grupoAtual.data_banca} ({grupoAtual.horario})
                              </span>
                              {bancaJaRealizadaAtual ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-900 shadow-2xs">
                                    <Award className="h-3.5 w-3.5 text-purple-700" />
                                    Apresentado
                                  </span>
                                  {badgeResultadoFinal(statusFinalGrupoAtual)}
                                </div>
                              ) : grupoAtual.entregue_na_pasta ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900 shadow-2xs">
                                  <Clock className="h-3.5 w-3.5 text-blue-700" />
                                  Aguardando Banca
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                  Aguardando Entrega na Pasta
                                </span>
                              )}
                            </div>
                            <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                              {grupoAtual.projeto}
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-600">{grupoAtual.tema}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-800">
                              Integrantes: {grupoAtual.integrantes.join(' • ')}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAbaModalArquivos('originais');
                                setModalArquivosAberto(true);
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-800 transition hover:bg-red-100 cursor-pointer"
                              title="Arrastar arquivos da entrega do grupo, visualizar salvos, excluir ou auditar"
                            >
                              <CloudUpload className="h-4 w-4 text-red-600" />
                              <span>
                                {grupoAtual.entregue_na_pasta
                                  ? 'Gerenciar Entrega / Arquivos'
                                  : 'Enviar Entrega (Arquivos)'}
                              </span>
                            </button>
                            {bancaJaRealizadaAtual && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAbaModalArquivos('revisados');
                                  setModalArquivosAberto(true);
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 cursor-pointer"
                                title="Enviar arquivos corrigidos na pasta revisados/ sem substituir os originais e validar aceite"
                              >
                                <FileCheck2 className="h-4 w-4 text-emerald-700" />
                                <span>Arquivos Revisados</span>
                                {(sessaoAtual?.revisao_pos_banca?.arquivos_qtd ??
                                  grupoAtual.revisao_pos_banca?.arquivos_qtd ??
                                  0) > 0 && (
                                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-black leading-none text-white">
                                    {sessaoAtual?.revisao_pos_banca?.arquivos_qtd ??
                                      grupoAtual.revisao_pos_banca?.arquivos_qtd}
                                  </span>
                                )}
                              </button>
                            )}
                            {grupoAtual.entregue_na_pasta && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setAbaAtiva('ficha')}
                                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                >
                                  <ClipboardCheck className="h-4 w-4 text-amber-400" />
                                  Abrir Ficha MSEP & Arguição
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleExportarFichaPdf(grupoAtual.id)}
                                  disabled={exportandoPdf}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                >
                                  <Download className="h-4 w-4" />
                                  Ficha PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleExportarDossie(grupoAtual.id)}
                                  disabled={exportandoDossie}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                >
                                  <FileText className="h-4 w-4 text-indigo-600" />
                                  Dossiê PDF/MD
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {!grupoAtual.entregue_na_pasta ? (
                          <div className="mt-6 space-y-5">
                            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center">
                              <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
                              <h3 className="mt-2 text-base font-bold text-slate-900">
                                Grupo ainda não realizou a entrega dos arquivos finais em ./tcc/
                                {grupoAtual.turma}
                              </h3>
                              <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
                                As notas individuais do{' '}
                                <strong>Pilar 4 (Sprints 4.1 + Participação 4.2)</strong> extraídas
                                dos PDFs oficiais da turma já estão carregadas abaixo. Você pode
                                arrastar os arquivos diretamente aqui ou colocar na pasta oficial e
                                clicar em <strong>Reauditar ./tcc</strong>.
                              </p>
                              <div className="mt-4 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAbaModalArquivos('originais');
                                    setModalArquivosAberto(true);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
                                >
                                  <CloudUpload className="h-4 w-4" />
                                  Arrastar e Enviar Arquivos da Entrega
                                </button>
                              </div>
                            </div>

                            {/* Tabela do Pilar 4 Oficial mesmo para grupos que ainda não entregaram a pasta */}
                            <div className="rounded-xl border border-slate-200 p-4">
                              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                                <Award className="h-4 w-4 text-indigo-600" />
                                Pontuação Oficial do Pilar 4 (PDFs de Entregas Semanais e
                                Participação — 15,0 pts)
                              </h4>
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                                      <th className="pb-2">Integrante</th>
                                      <th className="pb-2">Matrícula</th>
                                      <th className="pb-2 text-center">4.1 Relatórios (8,0)</th>
                                      <th className="pb-2 text-center">4.2 Participação (7,0)</th>
                                      <th className="pb-2 text-center">Total Pilar 4 (15,0)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {grupoAtual.integrantes_notas.map((ind) => (
                                      <tr key={ind.nome}>
                                        <td className="py-2 font-bold text-slate-900">
                                          {ind.nome}{' '}
                                          <span className="font-normal text-slate-500">
                                            ({ind.nome_completo_planilha})
                                          </span>
                                        </td>
                                        <td className="py-2 font-mono text-[11px] text-slate-600">
                                          {ind.matricula || '—'}
                                        </td>
                                        <td className="py-2 text-center">
                                          <span className="font-bold text-slate-900">
                                            {ind.nota_4_1_sprints.toFixed(2)}
                                          </span>{' '}
                                          <span className="text-[11px] text-slate-500">
                                            ({ind.relatorios_entregues}/{ind.total_relatorios} rel.)
                                          </span>
                                        </td>
                                        <td className="py-2 text-center">
                                          <span className="font-bold text-slate-900">
                                            {ind.nota_4_2_participacao.toFixed(2)}
                                          </span>{' '}
                                          <span className="text-[11px] text-slate-500">
                                            ({ind.aulas_participadas}/{ind.total_aulas_turma} aulas)
                                          </span>
                                        </td>
                                        <td className="py-2 text-center font-mono font-extrabold text-indigo-700">
                                          {ind.p4_nota.toFixed(2)} / 15.00
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 space-y-5">
                            {/* Banner da Regra Final de Liberação de Nota */}
                            {!bancaJaRealizadaAtual ? (
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-blue-950">
                                <div className="flex items-start gap-3">
                                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                                  <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider">
                                      Status de Liberação: Aguardando Banca (Entrega Realizada)
                                    </h4>
                                    <p className="mt-0.5 text-xs leading-relaxed">
                                      Os artefatos e a documentação do projeto foram auditados preliminarmente na pasta de entrega. O status oficial definitivo de liberação da nota será consolidado ao vivo após a apresentação e arguição da banca examinadora.
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-semibold text-blue-800">Média Preliminar IA:</span>
                                  <p className="text-base font-extrabold text-blue-950">{grupoAtual.media_nota_final_grupo.toFixed(1)} pts</p>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                                  statusFinalGrupoAtual === 'Aprovado'
                                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                                    : statusFinalGrupoAtual === 'Nota Retida (Pendências)' ||
                                      statusFinalGrupoAtual === 'Nota Retida'
                                    ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                                    : 'border-red-300 bg-red-50/80 text-red-950'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {statusFinalGrupoAtual === 'Aprovado' ? (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                                  ) : statusFinalGrupoAtual === 'Nota Retida (Pendências)' ||
                                    statusFinalGrupoAtual === 'Nota Retida' ? (
                                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                                  ) : (
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                                  )}
                                  <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider">
                                      Status de Liberação de Nota: {statusFinalGrupoAtual}{' '}
                                      {bancaJaRealizadaAtual && '(Média Oficial Consolidada)'}
                                    </h4>
                                    <p className="mt-0.5 text-xs leading-relaxed">
                                      {statusFinalGrupoAtual === 'Aprovado'
                                        ? `Banca concluída com média final de ${mediaFinalGrupoAtual.toFixed(
                                            2,
                                          )} pts (>= 50) e sem itens insuficientes bloqueantes. Nota final liberada!`
                                        : statusFinalGrupoAtual === 'Nota Retida (Pendências)' ||
                                          statusFinalGrupoAtual === 'Nota Retida'
                                        ? `A média final oficial (${mediaFinalGrupoAtual.toFixed(
                                            2,
                                          )} pts >= 50) está calculada, porém a liberação da nota fica RETIDA até a regularização dos itens Insuficientes: [${grupoAtual.itens_insuficientes_grupo.join(
                                            ', ',
                                          )}].`
                                        : `Média final de ${mediaFinalGrupoAtual.toFixed(
                                            2,
                                          )} pts inferior a 50,0 pontos. Aluno(s) necessitam de nova oportunidade de apresentação em data futura.`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Mini Placar dos 4 Pilares + Média (5 Cards) */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                              {/* Pilar 1 */}
                              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <div>
                                  <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-500">
                                    Pilar 1 • Doc (30 pts)
                                  </span>
                                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                                    {(consolidadaAtual?.media_p1 ?? grupoAtual.p1_total).toFixed(2)}
                                    <span className="text-xs font-normal text-slate-400"> / 30</span>
                                  </p>
                                </div>
                                {bancaJaRealizadaAtual && avaliacoesIndividuaisList.length > 0 && (
                                  <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-1.5 text-left text-[11px]">
                                    {avaliacoesIndividuaisList.map((av) => (
                                      <div
                                        key={av.professor_uid}
                                        className="flex items-center justify-between text-slate-600"
                                      >
                                        <span
                                          className="truncate max-w-[85px] font-medium"
                                          title={av.professor_nome}
                                        >
                                          {av.professor_nome.split(' ')[0]}:
                                        </span>
                                        <span className="font-bold text-slate-800">
                                          {av.p1_total.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Pilar 2 */}
                              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                                <div>
                                  <span className="block whitespace-nowrap text-[11px] font-semibold text-slate-500">
                                    Pilar 2 • Sist (40 pts)
                                  </span>
                                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                                    {(consolidadaAtual?.media_p2 ?? grupoAtual.p2_total).toFixed(2)}
                                    <span className="text-xs font-normal text-slate-400"> / 40</span>
                                  </p>
                                </div>
                                {bancaJaRealizadaAtual && avaliacoesIndividuaisList.length > 0 && (
                                  <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-1.5 text-left text-[11px]">
                                    {avaliacoesIndividuaisList.map((av) => (
                                      <div
                                        key={av.professor_uid}
                                        className="flex items-center justify-between text-slate-600"
                                      >
                                        <span
                                          className="truncate max-w-[85px] font-medium"
                                          title={av.professor_nome}
                                        >
                                          {av.professor_nome.split(' ')[0]}:
                                        </span>
                                        <span className="font-bold text-slate-800">
                                          {av.p2_total.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Pilar 3 */}
                              <div className="flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-center">
                                <div>
                                  <span className="block whitespace-nowrap text-[11px] font-semibold text-amber-900">
                                    Pilar 3 • Banca (15 pts)
                                  </span>
                                  <p className="mt-1 text-2xl font-extrabold text-amber-800">
                                    {(consolidadaAtual?.media_p3 ?? grupoAtual.p3_grupo_base).toFixed(2)}
                                    <span className="text-xs font-normal text-amber-700"> / 15</span>
                                  </p>
                                </div>
                                {bancaJaRealizadaAtual && avaliacoesIndividuaisList.length > 0 ? (
                                  <div className="mt-2 space-y-0.5 border-t border-amber-200/80 pt-1.5 text-left text-[11px]">
                                    {avaliacoesIndividuaisList.map((av) => (
                                      <div
                                        key={av.professor_uid}
                                        className="flex items-center justify-between text-amber-900"
                                      >
                                        <span
                                          className="truncate max-w-[85px] font-medium"
                                          title={av.professor_nome}
                                        >
                                          {av.professor_nome.split(' ')[0]}:
                                        </span>
                                        <span className="font-bold">
                                          {av.p3_grupo_base.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : !bancaJaRealizadaAtual ? (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    (3.1/3.2 Ao Vivo)
                                  </span>
                                ) : null}
                              </div>

                              {/* Pilar 4 */}
                              <div className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-center">
                                <div>
                                  <span className="block whitespace-nowrap text-[11px] font-semibold text-indigo-900">
                                    Pilar 4 • Sprints (15 pts)
                                  </span>
                                  <p className="mt-1 text-2xl font-extrabold text-indigo-800">
                                    {(
                                      consolidadaAtual?.media_p4 ??
                                      (grupoAtual.integrantes_notas.length > 0
                                        ? grupoAtual.integrantes_notas.reduce(
                                            (acc, curr) => acc + curr.p4_nota,
                                            0,
                                          ) / grupoAtual.integrantes_notas.length
                                        : 0)
                                    ).toFixed(2)}
                                    <span className="text-xs font-normal text-indigo-400"> / 15</span>
                                  </p>
                                </div>
                                {bancaJaRealizadaAtual && avaliacoesIndividuaisList.length > 0 && (
                                  <div className="mt-2 space-y-0.5 border-t border-indigo-200/80 pt-1.5 text-left text-[11px]">
                                    {avaliacoesIndividuaisList.map((av) => {
                                      const avP4 =
                                        av.integrantes_notas.length > 0
                                          ? av.integrantes_notas.reduce(
                                              (acc, curr) => acc + curr.p4_nota,
                                              0,
                                            ) / av.integrantes_notas.length
                                          : 0;
                                      return (
                                        <div
                                          key={av.professor_uid}
                                          className="flex items-center justify-between text-indigo-900"
                                        >
                                          <span
                                            className="truncate max-w-[85px] font-medium"
                                            title={av.professor_nome}
                                          >
                                            {av.professor_nome.split(' ')[0]}:
                                          </span>
                                          <span className="font-bold">{avP4.toFixed(2)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Média Final */}
                              <div className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/50 p-3 text-center">
                                <div>
                                  <span className="block whitespace-nowrap text-[11px] font-semibold text-red-800">
                                    {bancaJaRealizadaAtual ? 'Média Consolidada' : 'Média Calculada'}
                                  </span>
                                  <p className="mt-1 text-2xl font-extrabold text-red-700">
                                    {mediaFinalGrupoAtual.toFixed(2)} pts
                                  </p>
                                </div>
                                {bancaJaRealizadaAtual && avaliacoesIndividuaisList.length > 0 && (
                                  <div className="mt-2 space-y-0.5 border-t border-red-200/80 pt-1.5 text-left text-[11px]">
                                    {avaliacoesIndividuaisList.map((av) => (
                                      <div
                                        key={av.professor_uid}
                                        className="flex items-center justify-between text-red-900"
                                      >
                                        <span
                                          className="truncate max-w-[85px] font-medium"
                                          title={av.professor_nome}
                                        >
                                          {av.professor_nome.split(' ')[0]}:
                                        </span>
                                        <span className="font-bold">
                                          {av.nota_final_grupo.toFixed(2)} pts
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bloco da Ata da Banca Realizada: Pareceres Oficiais, Avaliadores, Data/Hora e Duração */}
                            {bancaJaRealizadaAtual && (
                              <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-5 shadow-xs">
                                {/* Cabeçalho da Ata */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                                      <Award className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-indigo-950">
                                          Ata da Banca Realizada & Pareceres Oficiais
                                        </h3>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-900">
                                          <CheckCircle2 className="h-3 w-3 text-purple-700" />
                                          Apresentado
                                        </span>
                                      </div>
                                      <p className="text-xs text-indigo-800/80">
                                        Registro formal da defesa, notas e considerações individuais de cada avaliador
                                      </p>
                                    </div>
                                  </div>

                                  {/* Badges de Metadados: Duração e Data/Horário Efetivo */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
                                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                                      <span className="font-medium text-slate-500">Duração:</span>
                                      <span className="font-extrabold text-indigo-950">
                                        {sessaoAtual?.duracao_formatada || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
                                      <Calendar className="h-3.5 w-3.5 text-red-500" />
                                      <span className="font-medium text-slate-500">Realizada em:</span>
                                      <span className="font-extrabold text-slate-900">
                                        {formatarDataHoraEfetivaBanca(
                                          sessaoAtual?.iniciado_em,
                                          sessaoAtual?.encerrado_em,
                                          grupoAtual.data_banca,
                                          grupoAtual.horario,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Nomes dos Professores Avaliadores da Banca */}
                                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                                  <span className="flex items-center gap-1.5 font-bold text-indigo-950">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                    Banca Examinadora:
                                  </span>
                                  {nomesAvaliadoresBanca.length > 0 ? (
                                    nomesAvaliadoresBanca.map((nome, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/80 bg-white px-3 py-1 font-semibold text-indigo-900 shadow-2xs"
                                      >
                                        👨‍🏫 {nome}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 italic">
                                      Docentes da banca registrados na sessão
                                    </span>
                                  )}
                                </div>

                                {/* Pareceres Consolidados de Cada Avaliador */}
                                <div className="mt-4">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                                    Parecer Técnico & Considerações de Cada Avaliador:
                                  </h4>
                                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                    {pareceresAvaliadoresBanca.length > 0 ? (
                                      pareceresAvaliadoresBanca.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex flex-col justify-between rounded-xl border border-indigo-100 bg-white p-4 shadow-2xs"
                                        >
                                          <div>
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                              <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                                                  {item.professor_nome.charAt(0)}
                                                </div>
                                                <div>
                                                  <h5 className="text-xs font-bold text-slate-900">
                                                    {item.professor_nome}
                                                  </h5>
                                                  {item.atualizado_em && (
                                                    <p className="text-[10px] text-slate-400">
                                                      {new Date(item.atualizado_em).toLocaleDateString(
                                                        'pt-BR',
                                                      )}{' '}
                                                      às{' '}
                                                      {new Date(item.atualizado_em).toLocaleTimeString(
                                                        'pt-BR',
                                                        {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                        },
                                                      )}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                                Avaliador {idx + 1}
                                              </span>
                                            </div>
                                            <div className="mt-3 text-xs leading-relaxed text-slate-700 italic whitespace-pre-wrap">
                                              {item.parecer && item.parecer.trim() ? (
                                                `"${item.parecer}"`
                                              ) : (
                                                <span className="text-slate-400 not-italic">
                                                  Nenhum texto de parecer digitado por este avaliador.
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="col-span-2 rounded-xl border border-dashed border-indigo-200 bg-white/70 p-4 text-center text-xs text-slate-500">
                                        Pareceres dos avaliadores registrados na ata da banca.
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Médias Finais Consolidadas de Cada Integrante do Grupo */}
                                <div className="mt-4 border-t border-indigo-100 pt-3.5">
                                  <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                                    <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                                      Média Final Consolidada dos Integrantes:
                                    </h4>
                                    <span className="text-[10px] text-indigo-800/80 font-medium">
                                      (Nota coletiva da banca + Pilar 4 individual de cada aluno)
                                    </span>
                                  </div>
                                  <div className="mt-2 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                                    {(consolidadaAtual?.integrantes_medias?.length
                                      ? consolidadaAtual.integrantes_medias
                                      : grupoAtual.integrantes_notas
                                    ).map((aluno) => {
                                      const isAprovado = aluno.resultado === 'Aprovado';
                                      const isRetido = aluno.resultado === 'Nota Retida (Pendências)';
                                      return (
                                        <div
                                          key={aluno.nome}
                                          className="flex items-center justify-between rounded-xl border border-indigo-200/80 bg-white p-3 shadow-2xs"
                                        >
                                          <div>
                                            <p className="text-xs font-bold text-slate-900">{aluno.nome}</p>
                                            <p className="text-[10px] text-slate-500">
                                              P4 Sprints/Aulas: <strong className="text-indigo-900">{aluno.p4_nota.toFixed(2)}</strong> pts
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-mono text-base font-black text-slate-900">
                                              {aluno.nota_final.toFixed(2)} pts
                                            </span>
                                            <div className="mt-0.5">
                                              <span
                                                className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                                  !bancaJaRealizadaAtual
                                                    ? 'border border-blue-200 bg-blue-50 text-blue-800'
                                                    : isAprovado
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : isRetido
                                                    ? 'bg-amber-100 text-amber-900'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                              >
                                                {!bancaJaRealizadaAtual
                                                  ? 'Aguardando Banca'
                                                  : isAprovado
                                                  ? 'Aprovado'
                                                  : isRetido
                                                  ? 'Nota Retida'
                                                  : 'Nova Apresentação'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Blocos Rápidos e Diretos: Deploy Online, Banco de Dados em Nuvem e Repositório GitHub */}
                            <div className="grid gap-3 sm:grid-cols-3">
                              {/* Card 1: Deploy Online (Item 2.4) */}
                              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                    Deploy Online (Item 2.4)
                                  </span>
                                  <span
                                    className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      grupoAtual.auditoria_tecnica.deploy_online_ok
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {grupoAtual.auditoria_tecnica.deploy_online_ok
                                      ? '✅ Online (HTTP 200)'
                                      : '❌ Indisponível'}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-900">
                                  Provedor:{' '}
                                  <span className="text-indigo-700">
                                    {grupoAtual.auditoria_tecnica.deploy_provedor ||
                                      'Não identificado'}
                                  </span>
                                </p>
                                {grupoAtual.auditoria_tecnica.deploy_url ? (
                                  <a
                                    href={grupoAtual.auditoria_tecnica.deploy_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 break-all font-mono text-[11px] font-semibold text-emerald-700 hover:underline"
                                  >
                                    <Globe className="h-3.5 w-3.5 shrink-0" />
                                    {grupoAtual.auditoria_tecnica.deploy_url}
                                  </a>
                                ) : (
                                  <p className="mt-1 text-xs font-bold text-red-600">
                                    URL de Deploy não informada em links.txt
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Latência: {grupoAtual.auditoria_tecnica.deploy_tempo_ms} ms •{' '}
                                  {grupoAtual.auditoria_tecnica.deploy_rodando_inteiramente_nuvem
                                    ? '100% Nuvem'
                                    : 'Dependência local'}
                                </p>
                                {grupoAtual.auditoria_tecnica.deploy_versao_compativel_github && (
                                  <p
                                    className="mt-1 text-[11px]"
                                    title={grupoAtual.auditoria_tecnica.deploy_versao_diagnostico || ''}
                                  >
                                    Versão vs GitHub:{' '}
                                    <span
                                      className={`font-bold ${
                                        grupoAtual.auditoria_tecnica.deploy_versao_compativel_github ===
                                        'sincronizado'
                                          ? 'text-emerald-700'
                                          : grupoAtual.auditoria_tecnica.deploy_versao_compativel_github ===
                                            'divergente'
                                          ? 'text-red-700'
                                          : 'text-amber-700'
                                      }`}
                                    >
                                      {grupoAtual.auditoria_tecnica.deploy_versao_compativel_github ===
                                      'sincronizado'
                                        ? 'Sincronizado'
                                        : grupoAtual.auditoria_tecnica.deploy_versao_compativel_github ===
                                          'divergente'
                                        ? 'Divergente'
                                        : grupoAtual.auditoria_tecnica.deploy_versao_compativel_github ===
                                          'possivelmente_desatualizado'
                                        ? 'Possível Defasagem'
                                        : 'Não Verificável'}
                                    </span>
                                  </p>
                                )}
                              </div>

                              {/* Card 2: Banco de Dados em Nuvem (Item 2.3) */}
                              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                    Banco de Dados (Item 2.3)
                                  </span>
                                  <span
                                    className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      grupoAtual.auditoria_tecnica.banco_provedor_nuvem &&
                                      grupoAtual.auditoria_tecnica.tabelas_sql_presentes_online_qtd > 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {grupoAtual.auditoria_tecnica.banco_provedor_nuvem &&
                                    grupoAtual.auditoria_tecnica.tabelas_sql_presentes_online_qtd > 0
                                      ? '✅ Banco Ativo'
                                      : '⚠️ Verificar Endpoint'}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-900">
                                  SGBD / Nuvem:{' '}
                                  <span className="text-indigo-700">
                                    {grupoAtual.auditoria_tecnica.banco_provedor_nuvem ||
                                      'Não identificado'}
                                  </span>
                                </p>
                                {grupoAtual.auditoria_tecnica.banco_url_detectada ? (
                                  <p className="mt-0.5 break-all font-mono text-[11px] text-slate-600">
                                    Instância: {grupoAtual.auditoria_tecnica.banco_url_detectada}
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    Endpoint não detectado explicitamente
                                  </p>
                                )}
                                {grupoAtual.auditoria_tecnica.bd_config_host_detectado && (
                                  <p className="mt-0.5 text-[11px] text-slate-600">
                                    Host DB: <strong>{grupoAtual.auditoria_tecnica.bd_config_host_detectado}</strong>
                                    {grupoAtual.auditoria_tecnica.bd_host_localhost_valido_em_nuvem && (
                                      <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                        Co-hospedado OK
                                      </span>
                                    )}
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Tabelas Online:{' '}
                                  <strong>
                                    {grupoAtual.auditoria_tecnica.tabelas_sql_presentes_online_qtd}/
                                    {grupoAtual.auditoria_tecnica.sql_tabelas_qtd}
                                  </strong>{' '}
                                  • Ciclo:{' '}
                                  <strong>
                                    {grupoAtual.auditoria_tecnica.tabelas_ciclo_completo_qtd}/
                                    {grupoAtual.auditoria_tecnica.sql_tabelas_qtd}
                                  </strong>
                                  {grupoAtual.auditoria_tecnica.sql_correspondencia_der_pct !== undefined && (
                                    <>
                                      {' '}• DER:{' '}
                                      <strong>{grupoAtual.auditoria_tecnica.sql_correspondencia_der_pct}%</strong>
                                    </>
                                  )}
                                </p>
                              </div>

                              {/* Card 3: Repositório GitHub (Item 2.5) */}
                              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                    Repositório GitHub (2.5)
                                  </span>
                                  <span
                                    className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      grupoAtual.auditoria_tecnica.github_online_ok
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {grupoAtual.auditoria_tecnica.github_online_ok
                                      ? '✅ GitHub OK'
                                      : '⚠️ Sem Link Online'}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-900">
                                  Repositório:{' '}
                                  <span className="text-indigo-700">
                                    {grupoAtual.auditoria_tecnica.github_url
                                      ? grupoAtual.auditoria_tecnica.github_url
                                          .replace('https://github.com/', '')
                                          .replace('.git', '')
                                      : 'Não informado'}
                                  </span>
                                </p>
                                {grupoAtual.auditoria_tecnica.github_url ? (
                                  <a
                                    href={grupoAtual.auditoria_tecnica.github_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 break-all font-mono text-[11px] font-semibold text-indigo-700 hover:underline"
                                  >
                                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                    {grupoAtual.auditoria_tecnica.github_url}
                                  </a>
                                ) : (
                                  <p className="mt-1 text-xs font-bold text-red-600">
                                    URL do GitHub em branco / ausente em links.txt
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Commits: {grupoAtual.auditoria_tecnica.github_commits_total} •
                                  README:{' '}
                                  {grupoAtual.auditoria_tecnica.zip_possui_readme ||
                                  grupoAtual.auditoria_tecnica.github_readme_online
                                    ? 'Sim'
                                    : 'Não detectado'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-600">
                                  Status código:{' '}
                                  <strong
                                    className={
                                      grupoAtual.auditoria_tecnica.github_sistema_funcional
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'
                                    }
                                  >
                                    {grupoAtual.auditoria_tecnica.github_sistema_funcional
                                      ? 'Sistema Funcional'
                                      : 'Verificar Estrutura'}
                                  </strong>
                                  {grupoAtual.auditoria_tecnica.github_ultimo_commit_sha && (
                                    <span className="ml-1 font-mono text-[10px] text-slate-500">
                                      ({grupoAtual.auditoria_tecnica.github_ultimo_commit_sha.slice(0, 7)})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* 1º GRANDE CARD: Parecer Técnico Detalhado da Auditoria & Observações */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition">
                              <button
                                type="button"
                                onClick={() => setBlocoParecerAberto((prev) => !prev)}
                                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 truncate">
                                      1. Parecer Técnico Detalhado da Auditoria &amp; Observações
                                    </h4>
                                    <p className="text-[11px] text-slate-500 hidden sm:block">
                                      {grupoAtual.parecer_estruturado?.length || 0} dimensões avaliadas • {grupoAtual.pontos_fortes.length} pontos fortes • {grupoAtual.pontos_atencao.length} pendências para arguição
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="hidden md:inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                                    {blocoParecerAberto ? 'Recolher' : 'Expandir'}
                                  </span>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    {blocoParecerAberto ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {blocoParecerAberto && (
                                <div className="border-t border-slate-100 p-5 pt-3">
                                  <p className="text-xs text-slate-500 pb-2">
                                    Análise integral dividida por dimensão técnica com sub-cards
                                    estruturados — todos os itens listados sem cortes para a banca.
                                  </p>

                                  {/* Auditoria Profunda v2: Capítulos 14/14, ABNT, Slides e Aderência Frontend/Backend/DER */}
                                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                                    {/* Sub-painel 1: Mapa Explícito de Capítulos do TCC (Presentes vs Faltantes) */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900">
                                          Capítulos do TCC (
                                          {(grupoAtual.auditoria_tecnica.secoes_abnt_presentes || []).length}
                                          /14)
                                        </h5>
                                        <div className="flex flex-wrap gap-1">
                                          {grupoAtual.auditoria_tecnica.fonte_texto_monografia && (
                                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                              Fonte: {grupoAtual.auditoria_tecnica.fonte_texto_monografia}
                                            </span>
                                          )}
                                          {grupoAtual.auditoria_tecnica.docx_somente_imagens && (
                                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                              DOCX em Imagens (PDF fallback)
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="mt-2.5 space-y-2">
                                        <div>
                                          <p className="text-[10px] font-bold uppercase text-red-700">
                                            Capítulos Faltantes (
                                            {(grupoAtual.auditoria_tecnica.secoes_abnt_faltantes || []).length}
                                            ):
                                          </p>
                                          {(grupoAtual.auditoria_tecnica.secoes_abnt_faltantes || []).length >
                                          0 ? (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {(grupoAtual.auditoria_tecnica.secoes_abnt_faltantes || []).map(
                                                (cap) => (
                                                  <span
                                                    key={cap}
                                                    className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800"
                                                  >
                                                    Ausente: {cap}
                                                  </span>
                                                ),
                                              )}
                                            </div>
                                          ) : (
                                            <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                              Nenhum capítulo faltante (14/14 identificados).
                                            </p>
                                          )}
                                        </div>

                                        <div>
                                          <p className="text-[10px] font-bold uppercase text-emerald-700">
                                            Capítulos Analisados (
                                            {(grupoAtual.auditoria_tecnica.secoes_abnt_presentes || []).length}
                                            ):
                                          </p>
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {(grupoAtual.auditoria_tecnica.secoes_abnt_presentes || []).map(
                                              (cap) => (
                                                <span
                                                  key={cap}
                                                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
                                                >
                                                  {cap}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Sub-painel 2: Checklist de Formatação ABNT */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900">
                                          Normas &amp; Formatação ABNT
                                        </h5>
                                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                          {grupoAtual.auditoria_tecnica.abnt_score_pct !== undefined
                                            ? `${grupoAtual.auditoria_tecnica.abnt_score_pct.toFixed(1)}%`
                                            : 'N/D'}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[10px] text-slate-500">
                                        Desvios reduzem apenas a rubrica 1.1 Monografia ABNT (sem trava paralela).
                                      </p>
                                      {(grupoAtual.auditoria_tecnica.checklist_abnt || []).length > 0 ? (
                                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-[11px]">
                                          {(grupoAtual.auditoria_tecnica.checklist_abnt || []).map(
                                            (chk, idx) => (
                                              <li
                                                key={idx}
                                                className="flex items-start justify-between gap-2 rounded border border-slate-200/80 bg-white px-2 py-1"
                                              >
                                                <span className="font-semibold text-slate-800">
                                                  {chk.conforme ? '✅' : '⚠️'} {chk.regra}
                                                </span>
                                                <span className="shrink-0 font-mono text-[10px] text-slate-600">
                                                  {chk.valor_detectado}
                                                </span>
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      ) : (
                                        <p className="mt-2 text-[11px] text-slate-500">
                                          {(grupoAtual.auditoria_tecnica.pendencias_formatacao_abnt || [])
                                            .length > 0
                                            ? grupoAtual.auditoria_tecnica.pendencias_formatacao_abnt!.join(
                                                ' • ',
                                              )
                                            : 'Checklist ABNT detalhado indisponível nesta versão.'}
                                        </p>
                                      )}
                                    </div>

                                    {/* Sub-painel 3: Apresentação (Slides) — Qualidade & Objetividade */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900">
                                          Slides ({grupoAtual.auditoria_tecnica.slides_qtd} lâminas)
                                        </h5>
                                        <div className="flex flex-wrap gap-1">
                                          {grupoAtual.auditoria_tecnica.slides_objetividade_nivel && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                              Objetividade:{' '}
                                              {grupoAtual.auditoria_tecnica.slides_objetividade_nivel}
                                            </span>
                                          )}
                                          {grupoAtual.auditoria_tecnica.slides_fonte_texto && (
                                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                              {grupoAtual.auditoria_tecnica.slides_fonte_texto}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                                        {grupoAtual.auditoria_tecnica.slides_qualidade_resumo ||
                                          'Análise de qualidade e objetividade dos slides não disponível.'}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
                                        <span>
                                          Média:{' '}
                                          {grupoAtual.auditoria_tecnica.slides_media_palavras_por_slide ??
                                            '—'}{' '}
                                          pal/slide
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Imagens: {grupoAtual.auditoria_tecnica.slides_imagens_qtd ?? '—'}
                                        </span>
                                        {(grupoAtual.auditoria_tecnica.slides_etapas_faltantes || [])
                                          .length > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="text-amber-800">
                                              Faltam:{' '}
                                              {grupoAtual.auditoria_tecnica.slides_etapas_faltantes!.join(
                                                ', ',
                                              )}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Sub-painel 4: Aderência Frontend/Backend, DER <-> SQL & Deploy vs GitHub */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h5 className="font-extrabold text-slate-900">
                                          Sistema, DER &amp; Deploy vs GitHub
                                        </h5>
                                        {grupoAtual.auditoria_tecnica.sistema_aderencia_proposto_pct !==
                                          undefined && (
                                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                            Aderência:{' '}
                                            {grupoAtual.auditoria_tecnica.sistema_aderencia_proposto_pct}%
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                                        {grupoAtual.auditoria_tecnica.sistema_aderencia_proposto_resumo ||
                                          grupoAtual.auditoria_tecnica.deploy_versao_diagnostico ||
                                          'Verificação técnica de aderência e rotas registrada nos blocos abaixo.'}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                        <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                          Rotas API:{' '}
                                          {(grupoAtual.auditoria_tecnica.backend_rotas_detectadas || []).length}
                                        </span>
                                        <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                          Páginas UI:{' '}
                                          {(grupoAtual.auditoria_tecnica.frontend_paginas_detectadas || []).length}
                                        </span>
                                        <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-700">
                                          DER ↔ SQL:{' '}
                                          {grupoAtual.auditoria_tecnica.sql_correspondencia_der_pct ?? '—'}%
                                        </span>
                                        <span
                                          className={`rounded border px-2 py-0.5 ${
                                            grupoAtual.auditoria_tecnica.github_sistema_funcional
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                              : 'border-amber-200 bg-amber-50 text-amber-800'
                                          }`}
                                        >
                                          GitHub:{' '}
                                          {grupoAtual.auditoria_tecnica.github_sistema_funcional
                                            ? 'Sistema Funcional'
                                            : 'Estrutura Parcial'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Cards de Parecer Estruturado */}
                                  {grupoAtual.parecer_estruturado &&
                                  grupoAtual.parecer_estruturado.length > 0 ? (
                                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                                      {grupoAtual.parecer_estruturado.map((bloco, bIdx) => (
                                        <div
                                          key={bIdx}
                                          className={`rounded-xl border p-4 ${
                                            bloco.status === 'conforme'
                                              ? 'border-emerald-200 bg-emerald-50/30'
                                              : bloco.status === 'critico'
                                              ? 'border-red-200 bg-red-50/30'
                                              : 'border-amber-200 bg-amber-50/30'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <h5 className="text-xs font-extrabold text-slate-900">
                                              {bloco.titulo}
                                            </h5>
                                            <span
                                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                bloco.status === 'conforme'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : bloco.status === 'critico'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-amber-100 text-amber-900'
                                              }`}
                                            >
                                              {bloco.status === 'conforme'
                                                ? 'Conforme'
                                                : bloco.status === 'critico'
                                                ? 'Pendência Crítica'
                                                : 'Atenção'}
                                            </span>
                                          </div>
                                          <p className="mt-2 whitespace-normal break-words text-xs font-medium leading-relaxed text-slate-800">
                                            {bloco.resumo}
                                          </p>
                                          {bloco.itens && bloco.itens.length > 0 && (
                                            <ul className="mt-2.5 space-y-1.5 border-t border-slate-200/60 pt-2 text-xs text-slate-700">
                                              {bloco.itens.map((it, i) => (
                                                <li
                                                  key={i}
                                                  className="flex items-start gap-1.5 whitespace-normal break-words leading-relaxed"
                                                >
                                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                                                  <span>{it}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                                      {grupoAtual.parecer_tecnico}
                                    </p>
                                  )}

                                  {/* Listas Completas de Pontos Fortes e Pontos de Atenção (Sem Cortes) */}
                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4">
                                      <h5 className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-800">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Pontos Fortes Verificados ({grupoAtual.pontos_fortes.length})
                                      </h5>
                                      <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                                        {grupoAtual.pontos_fortes.map((pf, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2 whitespace-normal break-words leading-relaxed"
                                          >
                                            <span className="font-bold text-emerald-600">✓</span>
                                            <span>{pf}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="rounded-xl border border-red-200 bg-red-50/20 p-4">
                                      <h5 className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-red-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        Pendências & Observações para Cobrança em Banca (
                                        {grupoAtual.pontos_atencao.length})
                                      </h5>
                                      <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                                        {grupoAtual.pontos_atencao.map((pa, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start gap-2 whitespace-normal break-words leading-relaxed"
                                          >
                                            <span className="font-bold text-red-600">•</span>
                                            <span>{pa}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 2º GRANDE CARD: Anexos Obrigatórios & Padrão CTDS-2026-02 */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition">
                              <button
                                type="button"
                                onClick={() => setBlocoAnexosAberto((prev) => !prev)}
                                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 truncate">
                                      2. Anexos Obrigatórios &amp; Padrão CTDS-2026-02
                                    </h4>
                                    <p className="text-[11px] text-slate-500 hidden sm:block">
                                      Pasta: {grupoAtual.nome_pasta_entregue} • {grupoAtual.arquivos_entregues.filter((a) => a.encontrado).length}/7 arquivos ({grupoAtual.conformidade_nomenclatura_pct}%)
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="hidden md:inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                    {grupoAtual.arquivos_entregues.filter((a) => a.encontrado).length}/7 arquivos
                                  </span>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    {blocoAnexosAberto ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {blocoAnexosAberto && (
                                <div className="border-t border-slate-100 p-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                                          <th className="pb-2">Tipo</th>
                                          <th className="pb-2">Arquivo Entregue</th>
                                          <th className="pb-2">Status Nomenclatura</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {grupoAtual.arquivos_entregues.map((arq) => (
                                          <tr key={arq.tipo}>
                                            <td className="py-2 font-semibold text-slate-800">
                                              {arq.tipo}
                                            </td>
                                            <td className="py-2 font-mono text-[11px] text-slate-600">
                                              {arq.nome_arquivo || '—'}
                                            </td>
                                            <td className="py-2">
                                              {arq.nomenclatura_conforme ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                                  <CheckCircle2 className="h-3.5 w-3.5" /> Conforme
                                                </span>
                                              ) : arq.possui_apenas_aviso_leve ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                                                  ℹ️ Ponto de Atenção (Sufixo adicional — Nota Integral)
                                                </span>
                                              ) : (
                                                <span className="font-medium text-amber-700">
                                                  ⚠️{' '}
                                                  {arq.alertas_nomenclatura.join(' ') ||
                                                    'Não encontrado'}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 3º GRANDE CARD: Rastreabilidade das Tabelas (.sql ↔ Banco Online ↔ Gravação & Consumo) */}
                            <div
                              className={`overflow-hidden rounded-xl border-2 shadow-2xs transition ${
                                grupoAtual.auditoria_tecnica
                                  .inviabiliza_finalizacao_persistencia ||
                                !grupoAtual.auditoria_tecnica.sql_atende_min_20_por_tabela
                                  ? 'border-red-300 bg-red-50/20'
                                  : 'border-emerald-300 bg-emerald-50/20'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setBlocoTabelasAberto((prev) => !prev)}
                                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
                                    <Server className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 truncate">
                                      3. Rastreabilidade das Tabelas (.sql ↔ Banco Online ↔ Código)
                                    </h4>
                                    <p className="text-[11px] text-slate-500 hidden sm:block">
                                      {grupoAtual.auditoria_tecnica.sql_tabelas_qtd} tabelas .sql • {grupoAtual.auditoria_tecnica.tabelas_sql_presentes_online_qtd} presentes online • {grupoAtual.auditoria_tecnica.tabelas_ciclo_completo_qtd} ciclo completo
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`hidden md:inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      grupoAtual.auditoria_tecnica.usa_localstorage_indevido ||
                                      !grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem
                                        ? 'bg-red-600 text-white'
                                        : grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem &&
                                          grupoAtual.auditoria_tecnica.sql_atende_min_20_por_tabela
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-amber-500 text-white'
                                    }`}
                                  >
                                    {grupoAtual.auditoria_tecnica.usa_localstorage_indevido ||
                                    !grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem
                                      ? '❌ Pendência de Persistência'
                                      : `${grupoAtual.auditoria_tecnica.tabelas_ciclo_completo_qtd}/${grupoAtual.auditoria_tecnica.sql_tabelas_qtd} Tabelas 100% OK`}
                                  </span>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    {blocoTabelasAberto ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {blocoTabelasAberto && (
                                <div className="border-t border-slate-200/80 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                                    <span className="text-xs font-bold text-slate-800">
                                      Status da Rastreabilidade e Persistência
                                    </span>
                                    <span
                                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                                        grupoAtual.auditoria_tecnica.usa_localstorage_indevido ||
                                        !grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem
                                          ? 'bg-red-600 text-white'
                                          : grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem &&
                                            grupoAtual.auditoria_tecnica.sql_atende_min_20_por_tabela
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-amber-500 text-white'
                                      }`}
                                    >
                                      {grupoAtual.auditoria_tecnica.usa_localstorage_indevido ||
                                      !grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem
                                        ? '❌ BLOQUEIO: Persistência do Tema Incompleta no Banco Online'
                                        : grupoAtual.auditoria_tecnica.banco_exclusivo_nuvem &&
                                          grupoAtual.auditoria_tecnica.sql_atende_min_20_por_tabela
                                        ? '✅ 100% Nuvem • Ciclo Completo (INSERT + SELECT)'
                                        : '⚠️ Banco Online OK • Falta Povoamento .SQL'}
                                    </span>
                                  </div>

                                  <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <span className="text-[10px] font-bold uppercase text-slate-500">
                                    Onde a Aplicação está Publicada (Item 2.4 — Deploy)
                                  </span>
                                  <p className="mt-1 text-xs font-bold text-slate-900">
                                    Provedor:{' '}
                                    <span className="text-indigo-700">
                                      {grupoAtual.auditoria_tecnica.deploy_provedor ||
                                        'Não identificado'}
                                    </span>
                                  </p>
                                  {grupoAtual.auditoria_tecnica.deploy_url ? (
                                    <a
                                      href={grupoAtual.auditoria_tecnica.deploy_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-flex items-center gap-1 break-all font-mono text-[11px] font-semibold text-emerald-700 hover:underline"
                                    >
                                      <Globe className="h-3.5 w-3.5 shrink-0" />
                                      {grupoAtual.auditoria_tecnica.deploy_url} (HTTP{' '}
                                      {grupoAtual.auditoria_tecnica.deploy_status_http} •{' '}
                                      {grupoAtual.auditoria_tecnica.deploy_tempo_ms}ms)
                                    </a>
                                  ) : (
                                    <p className="mt-1 text-xs font-bold text-red-600">
                                      URL de Deploy não informada!
                                    </p>
                                  )}
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    Rodando 100% a partir do deploy online:{' '}
                                    <strong
                                      className={
                                        grupoAtual.auditoria_tecnica
                                          .deploy_rodando_inteiramente_nuvem
                                          ? 'text-emerald-700'
                                          : 'text-red-600'
                                      }
                                    >
                                      {grupoAtual.auditoria_tecnica
                                        .deploy_rodando_inteiramente_nuvem
                                        ? 'SIM (Grava e consome 100% do banco em nuvem)'
                                        : 'NÃO (Entidades do tema lidas/gravadas localmente)'}
                                    </strong>
                                  </p>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <span className="text-[10px] font-bold uppercase text-slate-500">
                                    Onde o Banco de Dados está Publicado (Item 2.3)
                                  </span>
                                  <p className="mt-1 text-xs font-bold text-slate-900">
                                    SGBD / Nuvem:{' '}
                                    <span className="text-indigo-700">
                                      {grupoAtual.auditoria_tecnica.banco_provedor_nuvem ||
                                        'Não identificado'}
                                    </span>
                                  </p>
                                  {grupoAtual.auditoria_tecnica.banco_url_detectada && (
                                    <p className="mt-0.5 break-all font-mono text-[11px] text-slate-600">
                                      Instância: {grupoAtual.auditoria_tecnica.banco_url_detectada}
                                    </p>
                                  )}
                                  {grupoAtual.auditoria_tecnica.bd_config_host_detectado && (
                                    <p className="mt-0.5 text-[11px] text-slate-700">
                                      Host configurado no código:{' '}
                                      <code className="font-bold">
                                        {grupoAtual.auditoria_tecnica.bd_config_host_detectado}
                                      </code>
                                      {grupoAtual.auditoria_tecnica.bd_host_localhost_valido_em_nuvem && (
                                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                          Válido online (VM Oracle / InfinityFree)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {grupoAtual.auditoria_tecnica.bd_diagnostico_deploy_online && (
                                    <p className="mt-0.5 text-[11px] text-slate-600">
                                      {grupoAtual.auditoria_tecnica.bd_diagnostico_deploy_online}
                                    </p>
                                  )}
                                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                      Online:{' '}
                                      <strong>
                                        {
                                          grupoAtual.auditoria_tecnica
                                            .tabelas_sql_presentes_online_qtd
                                        }
                                        /{grupoAtual.auditoria_tecnica.sql_tabelas_qtd}
                                      </strong>
                                    </span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                      Grava (INSERT/UPDATE):{' '}
                                      <strong>
                                        {
                                          grupoAtual.auditoria_tecnica
                                            .tabelas_sql_gravadas_pelo_codigo_qtd
                                        }
                                        /{grupoAtual.auditoria_tecnica.sql_tabelas_qtd}
                                      </strong>
                                    </span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                      Consome (SELECT):{' '}
                                      <strong>
                                        {
                                          grupoAtual.auditoria_tecnica
                                            .tabelas_sql_consumidas_pelo_codigo_qtd
                                        }
                                        /{grupoAtual.auditoria_tecnica.sql_tabelas_qtd}
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <p className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800">
                                <strong>Diagnóstico de Persistência (2.3 / 2.4):</strong>{' '}
                                {grupoAtual.auditoria_tecnica.diagnostico_persistencia_2_3_2_4}
                              </p>

                              {/* Chaves localStorage de UI/Preferências Permitidas (Não Penalizam) */}
                              {(grupoAtual.auditoria_tecnica.chaves_localstorage_permitidas_ui || [])
                                .length > 0 && (
                                <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/90 p-2.5 text-xs text-emerald-950">
                                  <p className="font-bold text-emerald-900">
                                    ✅ Persistência Local Permitida (Itens de Menor Importância:
                                    Tema Claro/Escuro, UI e Sessão — Não Penalizam):
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {grupoAtual.auditoria_tecnica.chaves_localstorage_permitidas_ui.map(
                                      (ch) => (
                                        <span
                                          key={ch}
                                          className="rounded border border-emerald-300 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800"
                                        >
                                          {ch}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Alertas de Persistência Local Indevida do Tema do Projeto */}
                              {(grupoAtual.auditoria_tecnica.usa_localstorage_indevido ||
                                grupoAtual.auditoria_tecnica
                                  .usa_arquivos_json_locais_no_servidor) && (
                                <div className="mt-2.5 rounded-lg border border-red-200 bg-red-100/70 p-2.5 text-xs text-red-900">
                                  <p className="font-bold">
                                    <ShieldAlert className="mr-1 inline h-4 w-4 text-red-700" />
                                    Persistência Local Indevida de Dados do Tema do Projeto (Retém a
                                    liberação da nota nos itens 2.3 e 2.4):
                                  </p>
                                  {grupoAtual.auditoria_tecnica.chaves_localstorage_negocio.length >
                                    0 && (
                                    <p className="mt-1 text-[11px]">
                                      <strong>
                                        Chaves de negócio salvas em localStorage/sessionStorage:
                                      </strong>{' '}
                                      <code className="font-bold">
                                        {grupoAtual.auditoria_tecnica.chaves_localstorage_negocio.join(
                                          ', ',
                                        )}
                                      </code>
                                    </p>
                                  )}
                                  {(
                                    grupoAtual.auditoria_tecnica.entidades_tema_sem_tabela_banco ||
                                    []
                                  ).length > 0 && (
                                    <p className="mt-1 text-[11px]">
                                      <strong>
                                        Entidades do tema ausentes no .sql e no banco online:
                                      </strong>{' '}
                                      <code className="font-bold">
                                        {grupoAtual.auditoria_tecnica.entidades_tema_sem_tabela_banco.join(
                                          ', ',
                                        )}
                                      </code>
                                    </p>
                                  )}
                                  {grupoAtual.auditoria_tecnica
                                    .usa_arquivos_json_locais_no_servidor && (
                                    <p className="mt-1 text-[11px]">
                                      <strong>
                                        Arquivos JSON locais usados para leitura/gravação em vez de
                                        SELECT no banco online:
                                      </strong>{' '}
                                      <code className="font-bold">
                                        {grupoAtual.auditoria_tecnica.arquivos_json_locais_detectados.join(
                                          ', ',
                                        )}
                                      </code>
                                    </p>
                                  )}
                                  {grupoAtual.auditoria_tecnica.arquivos_localstorage_detectados
                                    .length > 0 && (
                                    <p className="mt-1 text-[11px]">
                                      <strong>Arquivos de código inspecionados:</strong>{' '}
                                      <span className="font-mono">
                                        {grupoAtual.auditoria_tecnica.arquivos_localstorage_detectados.join(
                                          ', ',
                                        )}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Matriz de Rastreabilidade por Tabela (.sql ↔ Banco Online ↔ Gravação & Consumo no Código) */}
                              <div className="mt-3 border-t border-slate-200/80 pt-3">
                                <p className="text-xs font-bold text-slate-800">
                                  Matriz de Rastreabilidade das Tabelas do Script{' '}
                                  <code>{grupoAtual.auditoria_tecnica.sql_arquivo || '.sql'}</code>{' '}
                                  no Banco Online e no Código:
                                </p>
                                {(grupoAtual.auditoria_tecnica.tabelas_auditoria_online || [])
                                  .length > 0 ? (
                                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-left text-[11px]">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                                          <th className="px-2.5 py-2">Tabela (.sql)</th>
                                          <th className="px-2 py-2 text-center">Regs .sql</th>
                                          <th className="px-2 py-2 text-center">DER</th>
                                          <th className="px-2.5 py-2 text-center">Banco Online</th>
                                          <th className="px-2 py-2 text-center">INSERT</th>
                                          <th className="px-2 py-2 text-center">UPDATE</th>
                                          <th className="px-2 py-2 text-center">SELECT</th>
                                          <th className="px-2 py-2 text-center">DELETE</th>
                                          <th className="px-2.5 py-2">Evidência no Código</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {grupoAtual.auditoria_tecnica.tabelas_auditoria_online.map(
                                          (tAud) => {
                                            const fazIns =
                                              tAud.codigo_faz_insert ?? tAud.codigo_faz_gravacao;
                                            const fazUpd =
                                              tAud.codigo_faz_update ?? tAud.codigo_faz_gravacao;
                                            const fazSel =
                                              tAud.codigo_faz_select ??
                                              tAud.codigo_faz_consumo_leitura;
                                            const fazDel = Boolean(tAud.codigo_faz_delete);
                                            return (
                                              <tr
                                                key={tAud.tabela}
                                                className={
                                                  tAud.conforme_ciclo_completo
                                                    ? 'bg-emerald-50/20'
                                                    : 'bg-red-50/30'
                                                }
                                              >
                                                <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">
                                                  {tAud.tabela}
                                                </td>
                                                <td className="px-2 py-1.5 text-center font-mono">
                                                  <span
                                                    className={
                                                      tAud.registros_no_sql >= 20
                                                        ? 'font-bold text-emerald-700'
                                                        : 'font-bold text-red-600'
                                                    }
                                                  >
                                                    {tAud.registros_no_sql}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      tAud.presente_no_der === false
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                  >
                                                    {tAud.presente_no_der === false ? 'Ausente' : 'DER OK'}
                                                  </span>
                                                </td>
                                                <td className="px-2.5 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      tAud.presente_no_banco_online
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                                    title={tAud.status_banco_online}
                                                  >
                                                    {tAud.presente_no_banco_online
                                                      ? '✅ Online'
                                                      : '❌ Ausente'}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      fazIns
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                                  >
                                                    {fazIns ? '✅' : '❌'}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      fazUpd
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                  >
                                                    {fazUpd ? '✅' : '—'}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      fazSel
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                                  >
                                                    {fazSel ? '✅' : '❌'}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <span
                                                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                      fazDel
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                  >
                                                    {fazDel ? '✅' : '—'}
                                                  </span>
                                                </td>
                                                <td className="px-2.5 py-1.5 text-[10px] text-slate-600">
                                                  {tAud.evidencia_codigo}
                                                </td>
                                              </tr>
                                            );
                                          },
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {Object.entries(
                                      grupoAtual.auditoria_tecnica.sql_inserts_por_tabela,
                                    ).map(([tab, qtd]) => (
                                      <span
                                        key={tab}
                                        className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold ${
                                          qtd >= 20
                                            ? 'border-emerald-300 bg-white text-emerald-800'
                                            : 'border-red-300 bg-white text-red-700'
                                        }`}
                                      >
                                        {tab}: <strong>{qtd}</strong> reg
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                            {/* 4. Pontuação Oficial do Pilar 4 (PDFs anexados em ./tcc) */}
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition">
                              <button
                                type="button"
                                onClick={() => setBlocoPilar4Aberto((prev) => !prev)}
                                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                                    <Award className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 truncate">
                                      4. Notas Individuais da Parte 4 (Sprints &amp; Participação)
                                    </h4>
                                    <p className="text-[11px] text-slate-500 hidden sm:block">
                                      Extraídas de {grupoAtual.turma.toLowerCase()}-entregas-participação.pdf • 4.1 Sprints (8,0) + 4.2 Participação (7,0) = 15,0 pts
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="hidden md:inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                                    {grupoAtual.integrantes_notas.length} Integrantes
                                  </span>
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    {blocoPilar4Aberto ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {blocoPilar4Aberto && (
                                <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                                          <th className="pb-2">Aluno</th>
                                          <th className="pb-2 text-center">4.1 Relatórios Semanais</th>
                                          <th className="pb-2 text-center">4.2 Participação Aulas</th>
                                          <th className="pb-2 text-center w-28 min-w-[100px]">Total P4 (15,0)</th>
                                          <th className="pb-2 text-center">Nota Final</th>
                                          <th className="pb-2 text-center">Status Liberação</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/70">
                                        {grupoAtual.integrantes_notas.map((ind) => (
                                          <tr key={ind.nome}>
                                            <td className="py-2">
                                              <p className="font-bold text-slate-900">{ind.nome}</p>
                                              <p className="text-[10px] text-slate-500">
                                                {ind.nome_completo_planilha} • Mat. {ind.matricula}
                                              </p>
                                            </td>
                                            <td className="py-2 text-center">
                                              <span
                                                className={`font-mono font-bold ${
                                                  ind.nivel_4_1 === 'Insuficiente'
                                                    ? 'text-red-600'
                                                    : 'text-slate-900'
                                                }`}
                                              >
                                                {ind.nota_4_1_sprints.toFixed(2)} / 8.00
                                              </span>
                                              <span className="block text-[10px] text-slate-500">
                                                {ind.relatorios_entregues}/{ind.total_relatorios}{' '}
                                                entregues ({ind.nivel_4_1})
                                              </span>
                                            </td>
                                            <td className="py-2 text-center">
                                              <span className="font-mono font-bold text-slate-900">
                                                {ind.nota_4_2_participacao.toFixed(2)} / 7.00
                                              </span>
                                              <span className="block text-[10px] text-slate-500">
                                                {ind.aulas_participadas}/{ind.total_aulas_turma} aulas (
                                                {ind.nivel_4_2})
                                              </span>
                                            </td>
                                            <td className="py-2 text-center font-mono font-extrabold text-sm text-indigo-700 w-28 min-w-[100px]">
                                              {ind.p4_nota.toFixed(2)} / 15.0
                                            </td>
                                            <td className="py-2 text-center font-mono text-sm font-black text-slate-900">
                                              {ind.nota_final.toFixed(2)} pts
                                            </td>
                                            <td className="py-2 text-center">
                                              <span
                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                                                  ind.resultado === 'Aprovado'
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : ind.resultado === 'Nota Retida (Pendências)' || ind.resultado === 'Nota Retida'
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                                }`}
                                              >
                                                {ind.resultado === 'Aprovado' ? 'Aprovado' : ind.resultado === 'Nota Retida (Pendências)' ? 'Nota Retida' : 'Nova Chance'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Console de Logs ao Vivo */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-xs">
                      <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <Terminal className="h-4 w-4 text-red-400" />
                          Console de Auditoria ao Vivo{' '}
                          {status.tarefa_atual ? `— ${status.tarefa_atual}` : ''}
                        </span>
                        <span className="text-xs text-slate-500">{status.logs.length} linhas</span>
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-slate-300">
                        {status.logs.length === 0 ? (
                          <p className="text-slate-500">
                            Pronto. Clique em &quot;Reauditar ./tcc&quot; para inspecionar as pastas
                            das turmas ao vivo.
                          </p>
                        ) : (
                          status.logs.map((ln, i) => <div key={i}>{ln}</div>)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* ABA 2: FICHA MSEP OFICIAL INTERATIVA + PERGUNTAS DE ARGUIÇÃO        */}
            {/* =================================================================== */}
            {abaAtiva === 'ficha' && grupoAtual && (
              <div className="space-y-6">
                {/* Seletor de Grupo no Topo da Ficha */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Selecionar Banca (Ordem de Apresentação):
                    </label>
                    <select
                      value={grupoAtual.id}
                      onChange={(e) => setGrupoSelecionadoId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-red-500 focus:outline-none"
                    >
                      {[...bancas]
                        .sort(compararBancasTurmaDataHorario)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            [{b.turma}] #{b.ordem_apresentacao}º • {b.data_banca} ({b.horario}) — {b.grupo}:{' '}
                            {b.projeto} (
                            {b.entregue_na_pasta
                              ? `Entregue • ${b.media_nota_final_grupo.toFixed(1)} pts`
                              : 'Pendente'}
                            )
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSalvarFicha()}
                      disabled={salvandoFicha || !podeEditarFicha}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {salvandoFicha
                        ? 'Salvando...'
                        : modoEdicaoReaberto
                        ? 'Salvar Alterações & Recalcular Médias'
                        : 'Salvar Ficha & Sincronizar Firebase'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExportarFichaPdf(grupoAtual.id)}
                      disabled={exportandoPdf}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Imprimir Ficha MSEP Oficial (.PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExportarDossie(grupoAtual.id)}
                      disabled={exportandoDossie}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Baixar Dossiê (.PDF / .MD)
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetarBanca()}
                      disabled={salvandoFicha}
                      className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 shadow-2xs transition hover:bg-red-100 hover:border-red-400 disabled:opacity-50 cursor-pointer"
                      title="Excluir as avaliações dos professores, zerar médias e reiniciar a banca deste grupo"
                    >
                      <RotateCcw className="h-4 w-4 text-red-600" />
                      Resetar / Excluir Banca
                    </button>
                  </div>
                </div>

                {/* PAINEL DE CONSOLIDAÇÃO DA BANCA (2 PROFESSORES SIMULTÂNEOS - FIRESTORE) */}
                <PainelBancaConsolidada
                  banca={bancaConsolidada}
                  sessaoAoVivo={sessaoAoVivo}
                  grupoAtual={grupoAtual}
                  professorLogadoUid={usuarioAuth?.uid}
                  isProfessorTitular={isProfessorTitular}
                  onIniciarBanca={handleIniciarBanca}
                  onEncerrarMinhaAvaliacao={handleEncerrarMinhaAvaliacao}
                  onEncerrarEConsolidarBanca={handleEncerrarEConsolidarBanca}
                  onResetarBanca={handleResetarBanca}
                  onReabrirEdicao={() => setModoEdicaoReaberto(true)}
                  onAtualizarPendencias={handleAtualizarPendencias}
                  modoEdicaoReaberto={modoEdicaoReaberto}
                  salvando={salvandoFicha}
                />

                {/* Banners Informativos de Bloqueio ou Edição Reaberta */}
                {!podeEditarFicha && statusSessaoBancaAtual === 'aguardando_inicio' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200 text-amber-900 shrink-0">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Modo Somente Leitura — Banca Ainda Não Iniciada
                        </p>
                        <p className="text-xs text-amber-800">
                          A atribuição e alteração de notas, rubricas e pareceres só é permitida após o início oficial da banca.
                        </p>
                      </div>
                    </div>
                    {isProfessorTitular && (
                      <button
                        type="button"
                        onClick={() => void handleIniciarBanca()}
                        disabled={salvandoFicha}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-emerald-700"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        Iniciar Banca Agora
                      </button>
                    )}
                  </div>
                )}

                {!podeEditarFicha && statusSessaoBancaAtual === 'concluida' && !modoEdicaoReaberto && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-4 text-xs text-indigo-950 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-200 text-indigo-900 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indigo-950">
                          Ata Oficial Consolidada &amp; Encerrada (Modo Somente Leitura)
                        </p>
                        <p className="text-xs text-indigo-800">
                          Esta banca já foi apresentada e homologada. Para retificar qualquer critério ou parecer, clique no botão de edição.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModoEdicaoReaberto(true)}
                      className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-xs font-bold text-indigo-900 shadow-xs transition hover:bg-indigo-100 cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4 text-indigo-600" />
                      Editar Minha Avaliação / Editar Banca
                    </button>
                  </div>
                )}

                {modoEdicaoReaberto && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-100 p-4 text-xs text-amber-950 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 text-amber-950 shrink-0">
                        <Edit3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-amber-950">
                          Modo de Edição Ativo (Banca Reaberta)
                        </p>
                        <p className="text-xs text-amber-900">
                          Faça os ajustes desejados nas rubricas, notas e parecer técnico. Ao salvar, as médias e descrições serão recalculadas e reconsolidadas automaticamente no Firebase.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModoEdicaoReaberto(false)}
                        className="rounded-lg border border-amber-400 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSalvarFicha()}
                        disabled={salvandoFicha}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        Salvar Alterações &amp; Recalcular Médias
                      </button>
                    </div>
                  </div>
                )}

                {/* Cabeçalho Visual Idêntico à Ficha SENAI */}
                <div className="overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-sm">
                  <div className="grid grid-cols-12 bg-slate-900 text-white">
                    <div className="col-span-2 flex items-center justify-center bg-red-600 p-4 text-2xl font-black tracking-wider">
                      SENAI
                    </div>
                    <div className="col-span-7 p-4">
                      <p className="text-sm font-bold">Escola SENAI Ourinhos (Unidade 7.94)</p>
                      <p className="text-[11px] font-bold text-amber-400">
                        TECNOLOGIA DE INFORMAÇÃO E COMUNICAÇÃO | TÉCNICO EM DESENVOLVIMENTO DE
                        SISTEMAS
                      </p>
                      <p className="text-xs font-semibold text-slate-200">
                        MÓDULO ESPECÍFICO II: PROJETOS DE SOFTWARE III (PSOF3) — RUBRICAS MSEP
                      </p>
                    </div>
                    <div className="col-span-3 flex flex-col items-center justify-center border-l border-slate-700 bg-white p-3 text-slate-900">
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        Média Calculada
                      </span>
                      <span className="text-2xl font-black text-red-600">
                        {(
                          integrantesEdit.reduce(
                            (acc, ind) => acc + calcularStatusFinalAluno(ind).nf,
                            0,
                          ) / Math.max(1, integrantesEdit.length)
                        ).toFixed(2)}{' '}
                        pts
                      </span>
                    </div>
                  </div>

                  {/* Metadados da Banca */}
                  <div className="grid gap-3 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs sm:grid-cols-3">
                    <div>
                      <strong>Projeto:</strong> {grupoAtual.projeto} ({grupoAtual.grupo})
                    </div>
                    <div>
                      <strong>Turma:</strong> {grupoAtual.turma} • <strong>Data:</strong>{' '}
                      {grupoAtual.data_banca} ({grupoAtual.horario})
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>Avaliador:</strong>
                      <input
                        type="text"
                        value={avaliadorEdit}
                        disabled={!podeEditarFicha}
                        onChange={(e) => setAvaliadorEdit(e.target.value)}
                        className={`w-full rounded border px-2 py-0.5 text-xs font-semibold ${
                          !podeEditarFicha
                            ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tabelas de Rubricas por Pilar (Pilares 1, 2 e 3) */}
                  <div className="space-y-6 p-6">
                    {[
                      {
                        pilar: 1,
                        titulo: '1. Pilar Documentação Técnica / TCC (Peso: 30,0 pts)',
                        total: p1TotalEdit,
                        max: 30,
                      },
                      {
                        pilar: 2,
                        titulo: '2. Pilar Sistema e Aplicação Desenvolvida (Peso: 40,0 pts)',
                        total: p2TotalEdit,
                        max: 40,
                      },
                      {
                        pilar: 3,
                        titulo:
                          '3. Pilar Apresentação e Defesa para a Banca (Peso: 15,0 pts — 3.1 Arguição Individual [6,0] + 3.2 Pitch [5,0] + 3.3 Slides [4,0])',
                        total: p3BaseEdit,
                        max: 9,
                      },
                    ].map((bloco) => (
                      <div
                        key={bloco.pilar}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-white">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {bloco.titulo}
                          </span>
                          <span className="rounded bg-red-600 px-2.5 py-0.5 text-xs font-bold">
                            Subtotal Coletivo: {bloco.total.toFixed(2)} / {bloco.max},00
                          </span>
                        </div>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                              <th className="p-3" style={{ width: '19%' }}>
                                Critério / Item
                              </th>
                              <th className="p-3" style={{ width: '43%' }}>
                                Diagnóstico & Evidências Extraídas pelo Agente (Lista Completa)
                              </th>
                              <th className="p-3 text-center" style={{ width: '20%' }}>
                                Nível MSEP (Rest. + Insu / Plen / Avan)
                              </th>
                              <th className="p-3 text-center" style={{ width: '8%' }}>
                                Peso Máx
                              </th>
                              <th className="p-3 text-center" style={{ width: '10%' }}>
                                Nota
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {rubricasEdit
                              .filter((r) => r.pilar === bloco.pilar)
                              .map((r) => {
                                const is31Individual = r.codigo === '3.1';
                                const isPendenteAoVivo = r.nivel === 'Pendente';
                                const foiAlterado =
                                  r.nivel !== r.nivel_sugerido_ia ||
                                  Math.abs(Number(r.nota || 0) - Number(r.nota_sugerida_ia || 0)) >
                                    0.01;

                                if (is31Individual) {
                                  const todosPendentes31 = integrantesEdit.every(
                                    (i) => i.nivel_3_1 === 'Pendente',
                                  );
                                  return (
                                    <tr
                                      key={r.codigo}
                                      className={
                                        todosPendentes31
                                          ? 'border-l-4 border-l-amber-500 bg-amber-50/90'
                                          : 'bg-slate-50/60'
                                      }
                                    >
                                      <td className="p-3 font-bold text-slate-900">
                                        <div>{r.titulo}</div>
                                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-200/90 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-950">
                                          ⚠️ Preencher na Tabela Individual Abaixo
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-700">
                                        <p className="whitespace-normal break-words font-semibold text-amber-950">
                                          {r.justificativa_ia}
                                        </p>
                                        {r.evidencias.length > 0 && (
                                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
                                            {r.evidencias.map((ev, eIdx) => (
                                              <li
                                                key={eIdx}
                                                className="whitespace-normal break-words"
                                              >
                                                {ev}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className="inline-flex animate-pulse items-center gap-1 rounded-lg border border-amber-400 bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
                                          Individual por Aluno ↓
                                        </span>
                                      </td>
                                      <td className="p-3 text-center font-mono font-bold text-slate-500">
                                        {r.peso_max.toFixed(2)}
                                      </td>
                                      <td className="p-3 text-center font-mono text-[11px] font-bold text-amber-900">
                                        Na Tabela ↓
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr
                                    key={r.codigo}
                                    className={
                                      isPendenteAoVivo
                                        ? 'border-l-4 border-l-amber-500 bg-amber-50/90 hover:bg-amber-100/70'
                                        : 'hover:bg-slate-50/80'
                                    }
                                  >
                                    <td className="p-3 font-bold text-slate-900">
                                      <div>{r.titulo}</div>
                                      {isPendenteAoVivo && (
                                        <span className="mt-1 inline-flex animate-pulse items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-2xs">
                                          ⚠️ Preenchimento Obrigatório
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-slate-600">
                                      <p className="whitespace-normal break-words font-medium leading-relaxed text-slate-800">
                                        {r.justificativa_ia}
                                      </p>
                                      {r.evidencias.length > 0 && (
                                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
                                          {r.evidencias.map((ev, eIdx) => (
                                            <li
                                              key={eIdx}
                                              className="whitespace-normal break-words"
                                            >
                                              {ev}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                                        {/* Botão Rest. — Só aparece se o usuário mudou o valor original analisado automaticamente */}
                                        {foiAlterado && (
                                          <button
                                            type="button"
                                            disabled={!podeEditarFicha}
                                            onClick={() => restaurarRubricaAutomatica(r.codigo)}
                                            title={`Restaurar valor calculado automaticamente (${r.nivel_sugerido_ia}: ${r.nota_sugerida_ia.toFixed(
                                              2,
                                            )})`}
                                            className="inline-flex items-center gap-0.5 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-2xs transition hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                            Rest.
                                          </button>
                                        )}

                                        {(['Insuficiente', 'Pleno', 'Avançado'] as NivelMSEP[]).map(
                                          (nv) => (
                                            <button
                                              key={nv}
                                              type="button"
                                              disabled={!podeEditarFicha}
                                              onClick={() =>
                                                aplicarPresetNivelRubrica(r.codigo, nv, r.peso_max)
                                              }
                                              className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                                                !podeEditarFicha ? 'cursor-not-allowed opacity-80 ' : ''
                                              }${
                                                r.nivel === nv
                                                  ? nv === 'Avançado'
                                                    ? 'bg-emerald-600 text-white'
                                                    : nv === 'Pleno'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-red-600 text-white'
                                                  : 'text-slate-600 hover:text-slate-900'
                                              }`}
                                            >
                                              {nv.slice(0, 4)}
                                            </button>
                                          ),
                                        )}
                                      </div>
                                      {isPendenteAoVivo && (
                                        <span className="mt-1 block text-[10px] font-extrabold text-amber-800">
                                          Aguardando nota da banca
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-slate-500">
                                      {r.peso_max.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center">
                                      <input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={r.peso_max}
                                        disabled={!podeEditarFicha}
                                        placeholder={isPendenteAoVivo ? '—' : '0.0'}
                                        value={isPendenteAoVivo ? '' : r.nota}
                                        onChange={(e) =>
                                          atualizarNotaRubrica(
                                            r.codigo,
                                            parseFloat(e.target.value),
                                            r.peso_max,
                                          )
                                        }
                                        className={`w-20 rounded-lg border px-2 py-1 text-center font-mono text-xs font-bold focus:outline-none ${
                                          !podeEditarFicha
                                            ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                            : isPendenteAoVivo
                                            ? 'border-2 border-amber-500 bg-amber-100/80 text-amber-950 placeholder:text-amber-700'
                                            : 'border-slate-300 bg-white text-slate-900 focus:border-red-500'
                                        }`}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Consolidação Individual dos Integrantes (Itens 3.1 [Vazio/Chamativo], 4.1, 4.2 + Nota Final + Regra de Retenção) */}
                    <div className="overflow-hidden rounded-xl border-2 border-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-white">
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          CONSOLIDAÇÃO FINAL DAS NOTAS INDIVIDUAIS DOS INTEGRANTES (P1 + P2 + P3 +
                          P4 = 100 pts)
                        </h3>
                        <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                          3.1 Arguição Individual deve ser preenchida ao vivo • 4.1 e 4.2 vieram do
                          PDF oficial
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700">
                              <th className="p-3">Aluno / Integrante</th>
                              <th className="p-3 text-center">P1 (30 pts)</th>
                              <th className="p-3 text-center">P2 (40 pts)</th>
                              <th className="border-x-2 border-amber-300 bg-amber-100/80 p-3 text-center text-amber-950">
                                3.1 Arguição Individual (Máx 6,0) ⚠️
                              </th>
                              <th className="p-3 text-center">P3 Total (15 pts)</th>
                              <th className="p-3 text-center">4.1 Sprints PDF (Máx 8,0)</th>
                              <th className="p-3 text-center">4.2 Partic. PDF (Máx 7,0)</th>
                              <th className="p-3 text-center">P4 Total (15 pts)</th>
                              <th className="p-3 text-center">Nota Final</th>
                              <th className="p-3 text-center">Status / Liberação de Nota</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {integrantesEdit.map((ind, idx) => {
                              const calc = calcularStatusFinalAluno(ind);
                              const pendente31 = ind.nivel_3_1 === 'Pendente';
                              const alterado31 =
                                ind.nivel_3_1 !== (ind.nivel_3_1_sugerido ?? 'Pendente') ||
                                Math.abs(
                                  Number(ind.nota_3_1_arguicao || 0) -
                                    Number(ind.nota_3_1_sugerida || 0),
                                ) > 0.01;
                              const alterado41 =
                                Math.abs(
                                  Number(ind.nota_4_1_sprints || 0) -
                                    Number(ind.nota_4_1_sugerida || 0),
                                ) > 0.01;
                              const alterado42 =
                                Math.abs(
                                  Number(ind.nota_4_2_participacao || 0) -
                                    Number(ind.nota_4_2_sugerida || 0),
                                ) > 0.01;

                              return (
                                <tr key={ind.nome} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <p className="font-bold text-slate-900">
                                      {idx + 1}. {ind.nome}
                                    </p>
                                    <span className="block text-[10px] text-slate-500">
                                      {ind.nome_completo_planilha} (Mat. {ind.matricula})
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    {p1TotalEdit.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    {p2TotalEdit.toFixed(2)}
                                  </td>

                                  {/* Item 3.1 Arguição Individual — Vazio e Chamativo quando Pendente + Botões Rest./Insu/Plen/Avan */}
                                  <td
                                    className={`border-x-2 border-amber-300 p-3 text-center ${
                                      pendente31 ? 'bg-amber-50/90' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                                        {alterado31 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              restaurarItemIntegrante(idx, 'nota_3_1_arguicao')
                                            }
                                            disabled={!podeEditarFicha}
                                            title="Restaurar estado inicial (Pendente)"
                                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white transition ${
                                              !podeEditarFicha
                                                ? 'bg-amber-300 cursor-not-allowed opacity-60'
                                                : 'bg-amber-500 hover:bg-amber-600'
                                            }`}
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Rest.
                                          </button>
                                        )}
                                        {(['Insuficiente', 'Pleno', 'Avançado'] as NivelMSEP[]).map(
                                          (nv) => (
                                            <button
                                              key={nv}
                                              type="button"
                                              disabled={!podeEditarFicha}
                                              onClick={() =>
                                                aplicarNivelIntegrante(
                                                  idx,
                                                  'nota_3_1_arguicao',
                                                  nv,
                                                  6.0,
                                                )
                                              }
                                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                                                !podeEditarFicha ? 'cursor-not-allowed opacity-75' : ''
                                              } ${
                                                ind.nivel_3_1 === nv
                                                  ? nv === 'Avançado'
                                                    ? 'bg-emerald-600 text-white'
                                                    : nv === 'Pleno'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-red-600 text-white'
                                                  : 'text-slate-600 hover:text-slate-900'
                                              }`}
                                            >
                                              {nv.slice(0, 4)}
                                            </button>
                                          ),
                                        )}
                                      </div>

                                      <input
                                        type="number"
                                        step="0.2"
                                        min={0}
                                        max={6}
                                        disabled={!podeEditarFicha}
                                        placeholder={pendente31 ? 'Preencher' : '0.0'}
                                        value={pendente31 ? '' : ind.nota_3_1_arguicao}
                                        onChange={(e) =>
                                          atualizarNotaIntegrante(
                                            idx,
                                            'nota_3_1_arguicao',
                                            parseFloat(e.target.value),
                                            6.0,
                                          )
                                        }
                                        className={`w-24 rounded-lg border px-2 py-1 text-center font-mono text-xs font-bold ${
                                          !podeEditarFicha
                                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                                            : pendente31
                                            ? 'border-2 border-amber-500 bg-amber-100 text-amber-950 placeholder:text-[10px] placeholder:font-extrabold placeholder:text-amber-800'
                                            : 'border-slate-300 bg-white text-slate-900'
                                        }`}
                                      />
                                      {pendente31 && (
                                        <span className="animate-pulse text-[9px] font-extrabold uppercase text-amber-800">
                                          ⚠️ Obrigatório
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-center font-mono font-semibold">
                                    {calc.p3.toFixed(2)}
                                  </td>

                                  {/* 4.1 Sprints com opção Rest. */}
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1">
                                        {alterado41 && (
                                          <button
                                            type="button"
                                            disabled={!podeEditarFicha}
                                            onClick={() =>
                                              restaurarItemIntegrante(idx, 'nota_4_1_sprints')
                                            }
                                            title={`Restaurar nota do PDF (${ind.nota_4_1_sugerida.toFixed(
                                              2,
                                            )})`}
                                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white transition ${
                                              !podeEditarFicha
                                                ? 'bg-amber-300 cursor-not-allowed opacity-60'
                                                : 'bg-amber-500 hover:bg-amber-600'
                                            }`}
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Rest.
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.2"
                                          min={0}
                                          max={8}
                                          disabled={!podeEditarFicha}
                                          value={ind.nota_4_1_sprints}
                                          onChange={(e) =>
                                            atualizarNotaIntegrante(
                                              idx,
                                              'nota_4_1_sprints',
                                              parseFloat(e.target.value),
                                              8.0,
                                            )
                                          }
                                          className={`w-16 rounded border px-1.5 py-1 text-center font-mono font-bold ${
                                            !podeEditarFicha
                                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                                              : 'border-slate-300 bg-white text-slate-900'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-[10px] text-slate-500">
                                        {ind.relatorios_entregues}/{ind.total_relatorios} rel. (
                                        {ind.nivel_4_1.slice(0, 4)})
                                      </span>
                                    </div>
                                  </td>

                                  {/* 4.2 Participação com opção Rest. */}
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1">
                                        {alterado42 && (
                                          <button
                                            type="button"
                                            disabled={!podeEditarFicha}
                                            onClick={() =>
                                              restaurarItemIntegrante(idx, 'nota_4_2_participacao')
                                            }
                                            title={`Restaurar nota do PDF (${ind.nota_4_2_sugerida.toFixed(
                                              2,
                                            )})`}
                                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white transition ${
                                              !podeEditarFicha
                                                ? 'bg-amber-300 cursor-not-allowed opacity-60'
                                                : 'bg-amber-500 hover:bg-amber-600'
                                            }`}
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Rest.
                                          </button>
                                        )}
                                        <input
                                          type="number"
                                          step="0.2"
                                          min={0}
                                          max={7}
                                          disabled={!podeEditarFicha}
                                          value={ind.nota_4_2_participacao}
                                          onChange={(e) =>
                                            atualizarNotaIntegrante(
                                              idx,
                                              'nota_4_2_participacao',
                                              parseFloat(e.target.value),
                                              7.0,
                                            )
                                          }
                                          className={`w-16 rounded border px-1.5 py-1 text-center font-mono font-bold ${
                                            !podeEditarFicha
                                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                                              : 'border-slate-300 bg-white text-slate-900'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-[10px] text-slate-500">
                                        {ind.aulas_participadas}/{ind.total_aulas_turma} aulas (
                                        {ind.nivel_4_2.slice(0, 4)})
                                      </span>
                                    </div>
                                  </td>

                                  <td className="p-3 text-center font-mono font-semibold">
                                    {calc.p4.toFixed(2)}
                                  </td>
                                  <td className="p-3 text-center font-mono text-sm font-black text-slate-900">
                                    {calc.nf.toFixed(2)} pts
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      {badgeResultadoFinal(calc.resultado)}
                                      {calc.insufInd.length > 0 && (
                                        <span className="text-[10px] font-semibold text-amber-900">
                                          Pendências: {calc.insufInd.join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Parecer Técnico e Observações Estruturadas (Sem cortes + Editável) */}
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Parecer Técnico & Observações Estruturadas da Banca (Exibição Integral sem
                          Cortes):
                        </h4>
                        {grupoAtual.parecer_estruturado &&
                          grupoAtual.parecer_estruturado.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {grupoAtual.parecer_estruturado.map((bloco, bIdx) => (
                                <div
                                  key={bIdx}
                                  className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-extrabold text-slate-900">{bloco.titulo}</p>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                        bloco.status === 'conforme'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : bloco.status === 'critico'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-amber-100 text-amber-900'
                                      }`}
                                    >
                                      {bloco.status === 'conforme'
                                        ? 'Conforme'
                                        : bloco.status === 'critico'
                                        ? 'Pendência'
                                        : 'Atenção'}
                                    </span>
                                  </div>
                                  <p className="mt-1 whitespace-normal break-words text-xs leading-relaxed text-slate-700">
                                    {bloco.resumo}
                                  </p>
                                  {bloco.itens && bloco.itens.length > 0 && (
                                    <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                                      {bloco.itens.map((it, i) => (
                                        <li key={i} className="whitespace-normal break-words">
                                          {it}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Texto Consolidado do Parecer (Considerações da Banca):
                          </label>
                          {grupoAtual.parecer_tecnico && (
                            <button
                              type="button"
                              disabled={!podeEditarFicha}
                              onClick={() => setParecerEdit(grupoAtual.parecer_tecnico)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Sparkles className="h-3 w-3" />
                              Carregar síntese da auditoria como rascunho
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={6}
                          value={parecerEdit}
                          readOnly={!podeEditarFicha}
                          onChange={(e) => setParecerEdit(e.target.value)}
                          placeholder="Digite aqui as considerações finais e o parecer consolidado da banca avaliadora para impressão na Ficha MSEP..."
                          className={`mt-1.5 w-full rounded-xl border p-3 text-xs leading-relaxed placeholder:text-slate-400 focus:outline-none ${
                            !podeEditarFicha
                              ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                              : 'border-slate-300 bg-white text-slate-800 focus:border-red-500'
                          }`}
                        />

                        {/* ========================================================================= */}
                        {/* BARRA DE STATUS INTEGRADA (LIBERADA / RETIDA / NOVA APRESENTAÇÃO + ALUNOS) */}
                        {/* ========================================================================= */}
                        <div className="mt-3.5 rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 to-white p-3.5 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {/* Botão de Status Geral da Nota */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setDetalhesStatusAberto((prev) => !prev)}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                                  statusGrupoTipo === 'liberada'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                                    : statusGrupoTipo === 'retida'
                                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-amber-500/20'
                                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
                                }`}
                                title="Clique para expandir e ver os motivos ou pendências do resultado"
                              >
                                {statusGrupoTipo === 'liberada' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                {statusGrupoTipo === 'retida' && <AlertTriangle className="h-4 w-4 shrink-0" />}
                                {statusGrupoTipo === 'nova_apresentacao' && <XCircle className="h-4 w-4 shrink-0" />}
                                <span>
                                  {statusGrupoTipo === 'liberada'
                                    ? '✅ NOTA LIBERADA'
                                    : statusGrupoTipo === 'retida'
                                    ? '⚠️ NOTA RETIDA'
                                    : '❌ NECESSÁRIO NOVA APRESENTAÇÃO'}
                                </span>
                                {statusManualLiberacao && (
                                  <span className="rounded bg-black/20 px-1.5 py-0.5 text-[9px] font-bold text-white tracking-normal">
                                    Manual
                                  </span>
                                )}
                                {detalhesStatusAberto ? (
                                  <ChevronUp className="h-3.5 w-3.5 opacity-80" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                                )}
                              </button>

                              {/* Na frente: Status individual de cada aluno (Aprovado ou Retido) */}
                              <div className="flex flex-wrap items-center gap-1.5 pl-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-0.5">
                                  Alunos:
                                </span>
                                {integrantesEdit.map((ind) => {
                                  const calc = calcularStatusFinalAluno(ind);
                                  const isAprovado = calc.resultado === 'Aprovado';
                                  const isRetido = calc.resultado === 'Nota Retida (Pendências)';

                                  return (
                                    <div
                                      key={ind.nome}
                                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs transition ${
                                        isAprovado
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                                          : isRetido
                                          ? 'border-amber-300 bg-amber-50 text-amber-950'
                                          : 'border-red-300 bg-red-50 text-red-950'
                                      }`}
                                    >
                                      <span className="font-bold text-slate-900">{ind.nome}:</span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                                          isAprovado
                                            ? 'bg-emerald-600 text-white'
                                            : isRetido
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'bg-red-600 text-white'
                                        }`}
                                      >
                                        {isAprovado ? 'Aprovado' : isRetido ? 'Retido' : 'Nova Apresentação'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Resumo Rápido da Média */}
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Média Geral</span>
                              <p className="text-xs font-black text-slate-800">{mediaGrupoEdit.toFixed(2)} pts</p>
                            </div>
                          </div>

                          {/* Seletor Rápido de Decisão Soberana da Banca (Alterar Diretamente para Aprovado / Retido / Nova Apresentação) */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                Decisão da Banca (Alterar Diretamente):
                              </span>
                              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  disabled={!podeEditarFicha}
                                  onClick={() => setStatusManualLiberacao('Aprovado')}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    !podeEditarFicha ? 'cursor-not-allowed' : 'cursor-pointer'
                                  } ${
                                    statusGrupoTipo === 'liberada' && statusManualLiberacao === 'Aprovado'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
                                  }`}
                                  title="Aprovar diretamente todos os integrantes e liberar a nota, sobrepondo qualquer trava de retenção ou reapresentação"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Aprovado (Liberada)
                                </button>
                                <button
                                  type="button"
                                  disabled={!podeEditarFicha}
                                  onClick={() => setStatusManualLiberacao('Nota Retida (Pendências)')}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    !podeEditarFicha ? 'cursor-not-allowed' : 'cursor-pointer'
                                  } ${
                                    statusGrupoTipo === 'retida' && statusManualLiberacao === 'Nota Retida (Pendências)'
                                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                                      : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                                  }`}
                                  title="Reter a nota do grupo até que sejam entregues pendências indicadas pela banca"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Nota Retida
                                </button>
                                <button
                                  type="button"
                                  disabled={!podeEditarFicha}
                                  onClick={() => setStatusManualLiberacao('Nova Chance (Data Futura)')}
                                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    !podeEditarFicha ? 'cursor-not-allowed' : 'cursor-pointer'
                                  } ${
                                    statusGrupoTipo === 'nova_apresentacao' && statusManualLiberacao === 'Nova Chance (Data Futura)'
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'text-slate-700 hover:bg-red-50 hover:text-red-900'
                                  }`}
                                  title="Indicar necessidade de reapresentação do TCC em data futura"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Nova Apresentação
                                </button>
                              </div>
                            </div>

                            {/* Botão para Restaurar a Sugestão Automática Calculada */}
                            {statusManualLiberacao && (
                              <button
                                type="button"
                                disabled={!podeEditarFicha}
                                onClick={() => setStatusManualLiberacao(null)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-2xs transition hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reverter a escolha manual e restaurar o status calculado automaticamente pelo sistema"
                              >
                                <RotateCcw className="h-3 w-3 text-indigo-600" />
                                Restaurar Sugestão Automática ({statusSugeridoCalculado === 'liberada' ? 'Liberada' : statusSugeridoCalculado === 'retida' ? 'Retida' : 'Nova Apresentação'})
                              </button>
                            )}
                          </div>

                          {/* Painel Expansível de Detalhes e Justificativas */}
                          {detalhesStatusAberto && (
                            <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3.5 text-xs text-slate-800 shadow-inner">
                              {/* Alerta de Decisão Manual Ativa */}
                              {statusManualLiberacao && (
                                <div className="mb-2.5 flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 p-2 text-xs font-semibold text-indigo-900">
                                  <Info className="h-4 w-4 shrink-0 text-indigo-600" />
                                  <span>
                                    <strong>Decisão Soberana da Banca:</strong> O status foi alterado manualmente pelo professor para{' '}
                                    <span className="underline font-bold uppercase">{statusManualLiberacao}</span>, sobrepondo a sugestão inicial do sistema ({statusSugeridoCalculado}).
                                  </span>
                                </div>
                              )}

                              {/* Motivo de Nota Retida */}
                              {statusSugeridoCalculado === 'retida' && todasPendenciasRetencao.length > 0 && (
                                <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-amber-950">
                                  <div className="flex items-center gap-2 font-bold text-amber-900">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                    <span>Motivo da Sugestão de Retenção — Pendências nos Pilares 1, 2 ou 3:</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                                    O grupo atingiu nota &ge; 50,0 pts, porém possui itens com classificação <strong>Insuficiente</strong> que motivaram a sugestão de retenção:
                                  </p>
                                  <ul className="mt-2 space-y-1 text-[11px] text-amber-900 list-disc list-inside">
                                    {todasPendenciasRetencao.map((pend, pIdx) => (
                                      <li key={pIdx} className="font-medium">
                                        {pend}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="mt-2 text-[10px] italic text-amber-800 border-t border-amber-200/80 pt-1.5">
                                    ℹ️ <strong>Diretriz SENAI:</strong> Notas no <strong>Pilar 4 (Sprints e Frequência)</strong> compõem a média, mas <strong>NÃO</strong> causam a retenção da nota.
                                  </p>
                                </div>
                              )}

                              {/* Motivo de Nova Apresentação (Reapresentação) */}
                              {statusSugeridoCalculado === 'nova_apresentacao' && (
                                <div className="rounded-lg border border-red-300 bg-red-50/90 p-3 text-red-950">
                                  <div className="flex items-center gap-2 font-bold text-red-900">
                                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                                    <span>Motivo da Sugestão de Reapresentação (Data Futura):</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-red-800 leading-relaxed">
                                    {motivoReapresentacao}
                                  </p>
                                </div>
                              )}

                              {/* Caso a sugestão tenha sido originalmente Liberada */}
                              {statusSugeridoCalculado === 'liberada' && (
                                <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 p-3 text-emerald-950">
                                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>Sugestão Automática de Aprovação Plena:</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                                    O grupo atingiu média de {mediaGrupoEdit.toFixed(2)} pts (&ge; 50,0 pts) e não possui nenhum item classificado como Insuficiente nos Pilares 1, 2 e 3.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roteiro de Perguntas de Sabatina Técnica Focadas no Entendimento da Tecnologia */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <HelpCircle className="h-5 w-5 text-red-600" />
                        Sabatina Técnica Individual — Entendimento da Tecnologia & Arquitetura
                        (Rubrica 3.1)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Perguntas conceituais e arquiteturais sobre o funcionamento da tecnologia,
                        comunicação Cliente-Servidor, Persistência em Banco de Dados em Nuvem vs{' '}
                        <code>localStorage</code>, Autenticação e Deploy.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {grupoAtual.perguntas_arguicao.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                              Direcionada a: {p.integrante_sugerido}
                            </span>
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                              {p.categoria}
                            </span>
                          </div>
                          <p className="mt-2 font-mono text-[11px] text-slate-600">
                            <Code2 className="mr-1 inline h-3.5 w-3.5 text-indigo-600" />
                            Contexto Tecnológico: {p.arquivo_referencia}
                          </p>
                          <p className="mt-2 whitespace-normal break-words text-xs font-bold leading-relaxed text-slate-900">
                            &ldquo;{p.pergunta}&rdquo;
                          </p>
                          <p className="mt-2 whitespace-normal break-words text-xs leading-relaxed text-emerald-900">
                            <strong>Entendimento Esperado:</strong> {p.resposta_esperada}
                          </p>
                        </div>

                        {p.trecho_codigo && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200">
                            {p.trecho_codigo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* ABA 3: TELA CONSOLIDADA POR TURMA + EXPORTAÇÃO XLSX                 */}
            {/* =================================================================== */}
            {abaAtiva === 'consolidado' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Quadro Consolidado de Notas por Turma — PSOF3 (Rubricas MSEP)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visão unificada de todos os 63 alunos das 25 bancas examinadoras (I2DEV-A e
                      I2DEV-B) com notas oficiais do Pilar 4 carregadas dos PDFs e regra de retenção
                      por pendências.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {(['Todas', 'I2DEV-A', 'I2DEV-B'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTurmaFiltro(t)}
                        className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                          turmaFiltro === t
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'Todas' ? 'Todas as Turmas' : t}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => void handleSincronizarTodosFirebase()}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-800 transition hover:bg-indigo-100"
                    >
                      <CloudUpload className="h-4 w-4" />
                      Sincronizar Firebase
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleExportarConsolidadoXlsx(turmaFiltro)}
                      disabled={exportandoXlsx}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {exportandoXlsx
                        ? 'Gerando Planilha...'
                        : `Exportar Consolidado (${turmaFiltro}) em .XLSX`}
                    </button>
                  </div>
                </div>

                {/* Tabela Consolidada de Todos os Integrantes */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-[11px] font-bold uppercase text-white">
                          <th className="p-3">Ordem</th>
                          <th className="p-3">Turma</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Grupo</th>
                          <th className="p-3">Projeto TCC</th>
                          <th className="p-3">Aluno / Integrante</th>
                          <th className="p-3 text-center">Entrega</th>
                          <th className="p-3 text-center">P1 (30 pts)</th>
                          <th className="p-3 text-center">P2 (40 pts)</th>
                          <th className="p-3 text-center">P3 (15 pts)</th>
                          <th className="p-3 text-center">P4 PDF (15 pts)</th>
                          <th className="p-3 text-center">Nota Final</th>
                          <th className="p-3 text-center">Status / Liberação</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {[...bancas]
                          .filter((b) => turmaFiltro === 'Todas' || b.turma === turmaFiltro)
                          .sort(compararBancasTurmaDataHorario)
                          .flatMap((b) =>
                            b.integrantes_notas.map((ind, iIdx) => (
                              <tr
                                key={`${b.id}_${ind.nome}`}
                                className={
                                  b.entregue_na_pasta
                                    ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                                    : 'hover:bg-slate-50'
                                }
                              >
                                <td className="p-3 font-mono font-bold text-slate-500">
                                  #{b.ordem_apresentacao}º
                                </td>
                                <td className="p-3 font-bold text-slate-800">{b.turma}</td>
                                <td className="p-3 text-slate-600">{b.data_banca}</td>
                                <td className="p-3 font-semibold text-slate-700">{b.grupo}</td>
                                <td className="p-3 font-bold text-slate-900">{b.projeto}</td>
                                <td className="p-3">
                                  <span className="font-semibold text-slate-900">{ind.nome}</span>
                                  <span className="block text-[10px] text-slate-500">
                                    Rel: {ind.relatorios_entregues}/{ind.total_relatorios} • Aulas:{' '}
                                    {ind.aulas_participadas}/{ind.total_aulas_turma}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {b.entregue_na_pasta ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                      Entregue
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {b.entregue_na_pasta ? ind.p1_nota.toFixed(2) : '—'}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {b.entregue_na_pasta ? ind.p2_nota.toFixed(2) : '—'}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {b.entregue_na_pasta ? ind.p3_nota.toFixed(2) : '—'}
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-indigo-700">
                                  {ind.p4_nota.toFixed(2)}
                                </td>
                                <td className="p-3 text-center font-mono font-black text-slate-900">
                                  {b.entregue_na_pasta
                                    ? `${ind.nota_final.toFixed(2)} pts`
                                    : `${ind.p4_nota.toFixed(2)} pts (P4)`}
                                </td>
                                <td className="p-3 text-center">
                                  {b.entregue_na_pasta ? (
                                    badgeResultadoFinal(ind.resultado)
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Aguardando</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  {iIdx === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGrupoSelecionadoId(b.id);
                                        setAbaAtiva('ficha');
                                      }}
                                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Ficha
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )),
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* ABA 4: REGRAS OFICIAIS (OS 4 DOCUMENTOS DE ./tcc/regras)            */}
            {/* =================================================================== */}
            {abaAtiva === 'regras' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Documentos Oficiais de Regras da Banca Examinadora (./tcc/regras)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Todos os documentos normativos lidos pelo Agente para parametrizar as Rubricas
                    MSEP, os pesos dos entregáveis, o cronograma de 25 bancas e a padronização
                    digital <code>CTDS-2026-02</code>.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {(regrasOficiais?.documentos_regras || []).map((doc) => (
                      <div
                        key={doc.nome}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{doc.nome}</p>
                            <p className="text-[11px] text-slate-500">
                              {(doc.tamanho_bytes / 1024).toFixed(1)} KB • PDF Oficial SENAI
                            </p>
                          </div>
                        </div>
                        <a
                          href={api.getRegraPdfUrl(doc.nome)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Abrir PDF
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* ABA 5: CONFIGURAÇÕES (.ENV, FIREBASE, GITHUB TOKEN & GEMINI API)    */}
            {/* =================================================================== */}
            {abaAtiva === 'configuracoes' && (
              <form
                onSubmit={handleSalvarConfig}
                className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Configurações do Agente & Credenciais (.env)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gerencie os diretórios de leitura (<code>./tcc</code>), exportação de
                    relatórios, integração com Firebase Firestore, GitHub API e Gemini LLM.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Unidade Escolar
                    </label>
                    <input
                      type="text"
                      value={env.escola}
                      onChange={(e) => setEnv({ ...env, escola: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Disciplina
                    </label>
                    <input
                      type="text"
                      value={env.disciplina}
                      onChange={(e) => setEnv({ ...env, disciplina: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Docente / Avaliador Padrão
                    </label>
                    <input
                      type="text"
                      value={env.avaliador_padrao}
                      onChange={(e) => setEnv({ ...env, avaliador_padrao: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Pasta de Entregas TCC
                    </label>
                    <input
                      type="text"
                      value={env.pasta_tcc}
                      onChange={(e) => setEnv({ ...env, pasta_tcc: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Pasta de Destino dos Relatórios (PDF / MD / XLSX)
                    </label>
                    <input
                      type="text"
                      value={env.pasta_destino}
                      onChange={(e) => setEnv({ ...env, pasta_destino: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700">GitHub Token (.env)</span>
                    <p className="mt-1 font-mono text-xs text-emerald-700">
                      {env.github_token_configurado
                        ? `✅ Ativo (${env.github_token_preview})`
                        : 'Não configurado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      Firebase Project ID (.env)
                    </span>
                    <p className="mt-1 font-mono text-xs text-indigo-700">
                      {env.firebase_project_id || 'Não configurado'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Chave Opcional Gemini API (Enriquecimento de Parecer)
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy... (Opcional)"
                      value={env.gemini_api_key}
                      onChange={(e) => setEnv({ ...env, gemini_api_key: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-red-700"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Configurações
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </main>

      {/* Modal de Autenticação / Identificação do Professor Avaliador */}
      <AuthModal
        aberto={rotaAtual === 'professor' && (authModalAberto || (!usuarioAuth && authPronto))}
        obrigatorio={!usuarioAuth}
        onVoltarPortal={() => navegarPara('alunos')}
        onClose={() => {
          if (usuarioAuth) setAuthModalAberto(false);
        }}
        onSucesso={(usuario: User) => {
          setUsuarioAuth(usuario);
          setAuthModalAberto(false);
          if (usuario.displayName) {
            setAvaliadorEdit(usuario.displayName);
          }
          setAviso({
            tipo: 'ok',
            texto: `Avaliador identificado: ${usuario.displayName || usuario.email}!`,
          });
        }}
      />

      {/* Modal de Reauditoria Criteriosa de Entregas TCC */}
      <ModalReauditoria
        aberto={modalReauditoriaAberto}
        onClose={() => setModalReauditoriaAberto(false)}
        bancas={bancas}
        mapaSessoesBanca={mapaSessoesBanca}
        turmaFiltroInicial={turmaFiltro}
        carregando={status.estado === 'running'}
        onConfirmarReauditoria={(grupoIds, turma) => {
          void handleAuditarAgora(grupoIds, turma);
        }}
      />

      {/* Modal de Upload / Gerenciamento de Arquivos da Entrega por Grupo e Revisados Pós-Banca */}
      {grupoAtual && (
        <ModalEntregaArquivos
          aberto={modalArquivosAberto}
          onClose={() => setModalArquivosAberto(false)}
          grupo={grupoAtual}
          abaInicial={abaModalArquivos}
          bancaConcluida={bancaJaRealizadaAtual}
          auditoriaEmAndamento={status.estado === 'running'}
          isProfessorTitular={isProfessorTitular}
          professorNome={
            usuarioAuth?.displayName ||
            avaliadorEdit ||
            usuarioAuth?.email?.split('@')[0] ||
            'Prof. Titular'
          }
          revisaoInicial={
            sessaoAtual?.revisao_pos_banca || grupoAtual.revisao_pos_banca || null
          }
          statusTrabalhoAtual={statusFinalGrupoAtual as ResultadoFinalTipo}
          onAtualizarBancas={carregarTudo}
          onDispararAuditoriaGrupo={async (gid) => {
            await handleAuditarAgora([gid], null);
          }}
          onReabrirBanca={handleReabrirBancaParaEntregue}
          onSincronizarRevisaoFirestore={async (revisao, novoStatus) => {
            if (!usuarioAuth) return;
            const resSync = await sincronizarRevisaoPosBancaFirestore(
              grupoAtual,
              sessaoAtual || null,
              consolidadaAtual || null,
              usuarioAuth,
              revisao,
              novoStatus,
            );
            if (!resSync.ok) {
              setAviso({ tipo: 'erro', texto: resSync.mensagem });
            }
          }}
        />
      )}
    </div>
  );
}
export default App;
