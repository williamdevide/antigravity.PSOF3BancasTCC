import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Download,
  FileArchive,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  AgentStatus,
  ArquivoEntregaSalvo,
  AvaliacaoGrupo,
  RegistroHistoricoPendencia,
  ResultadoFinalTipo,
  RevisaoPosBanca,
} from '../types';

const EXTENSOES_PERMITIDAS = new Set([
  '.docx',
  '.pdf',
  '.pptx',
  '.sql',
  '.zip',
  '.txt',
  '.md',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
]);
const MAX_ARQUIVO_BYTES = 200 * 1024 * 1024; // 200 MB

interface ModalEntregaArquivosProps {
  aberto: boolean;
  onClose: () => void;
  grupo: AvaliacaoGrupo;
  abaInicial?: 'originais' | 'revisados';
  bancaConcluida: boolean;
  auditoriaEmAndamento: boolean;
  statusAuditoria?: AgentStatus;
  isProfessorTitular?: boolean;
  professorNome?: string;
  revisaoInicial?: RevisaoPosBanca | null;
  statusTrabalhoAtual?: string;
  historicoPendencias?: RegistroHistoricoPendencia[];
  pendenciasCumpridasAtual?: boolean;
  pendenciasDescricaoAtual?: string;
  onAtualizarBancas: () => Promise<void>;
  onDispararAuditoriaGrupo: (grupoId: string) => Promise<void> | void;
  onReabrirBanca: () => Promise<boolean>;
  onSincronizarRevisaoFirestore?: (
    revisao: RevisaoPosBanca,
    novoStatus?: ResultadoFinalTipo | null,
  ) => Promise<void>;
  onAtualizarPendencias?: (dados: {
    possui_pendencias: boolean;
    pendencias_descricao: string;
    pendencias_cumpridas: boolean;
    novo_status_liberacao: ResultadoFinalTipo;
    origem?: 'banca' | 'revisados';
  }) => Promise<void>;
}

function normalizarStatusTrabalho(status?: string | null): ResultadoFinalTipo {
  if (status === 'Nota Retida (Pendências)' || status === 'Nota Retida') {
    return 'Nota Retida (Pendências)';
  }
  if (status === 'Nova Chance (Data Futura)') {
    return 'Nova Chance (Data Futura)';
  }
  return 'Aprovado';
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconeDoArquivo(extensao: string) {
  const e = extensao.toLowerCase();
  if (e === '.zip') return <FileArchive className="h-4 w-4 text-amber-600 shrink-0" />;
  if (e === '.sql') return <FileCode2 className="h-4 w-4 text-emerald-700 shrink-0" />;
  if (e === '.pptx') return <FileSpreadsheet className="h-4 w-4 text-red-600 shrink-0" />;
  return <FileText className="h-4 w-4 text-slate-600 shrink-0" />;
}

export const ModalEntregaArquivos: React.FC<ModalEntregaArquivosProps> = ({
  aberto,
  onClose,
  grupo,
  abaInicial = 'originais',
  bancaConcluida,
  auditoriaEmAndamento,
  statusAuditoria,
  isProfessorTitular = true,
  professorNome = 'Prof. Titular',
  revisaoInicial = null,
  statusTrabalhoAtual,
  historicoPendencias = [],
  pendenciasCumpridasAtual = false,
  pendenciasDescricaoAtual = '',
  onAtualizarBancas,
  onDispararAuditoriaGrupo,
  onReabrirBanca,
  onSincronizarRevisaoFirestore,
  onAtualizarPendencias,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputRevisadosRef = useRef<HTMLInputElement | null>(null);

  const [abaAtiva, setAbaAtiva] = useState<'originais' | 'revisados'>(abaInicial);

  // Estados da aba Original
  const [arquivosSalvos, setArquivosSalvos] = useState<ArquivoEntregaSalvo[]>([]);
  const [pastaNome, setPastaNome] = useState<string>('');
  const [filaUpload, setFilaUpload] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState<boolean>(false);
  const [confirmarReabertura, setConfirmarReabertura] = useState<boolean>(false);
  const [confirmarLimparTodos, setConfirmarLimparTodos] = useState<boolean>(false);

  // Estados da aba Arquivos Revisados (Pós-Banca)
  const [arquivosRevisados, setArquivosRevisados] = useState<ArquivoEntregaSalvo[]>([]);
  const [revisaoAtual, setRevisaoAtual] = useState<RevisaoPosBanca | null>(revisaoInicial);
  const [filaRevisados, setFilaRevisados] = useState<File[]>([]);
  const [arrastandoRevisados, setArrastandoRevisados] = useState<boolean>(false);
  const [decisaoAceite, setDecisaoAceite] = useState<boolean>(
    Boolean(revisaoInicial?.aceito),
  );
  const [observacaoRevisao, setObservacaoRevisao] = useState<string>(
    revisaoInicial?.observacao_professor || '',
  );
  const [novoStatusEscolhido, setNovoStatusEscolhido] = useState<ResultadoFinalTipo>(
    normalizarStatusTrabalho(
      revisaoInicial?.status_trabalho_aplicado || statusTrabalhoAtual || grupo.status_liberacao_nota,
    ),
  );
  const [pendenciasTextoRev, setPendenciasTextoRev] = useState<string>(
    pendenciasDescricaoAtual || '',
  );
  const [pendenciasCumpridasRev, setPendenciasCumpridasRev] = useState<boolean>(
    Boolean(pendenciasCumpridasAtual),
  );
  const [statusPendRev, setStatusPendRev] = useState<ResultadoFinalTipo>(
    normalizarStatusTrabalho(statusTrabalhoAtual || grupo.status_liberacao_nota),
  );

  const [carregandoLista, setCarregandoLista] = useState<boolean>(false);
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null);
  const [uploadPercentual, setUploadPercentual] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const recarregarListas = async () => {
    setCarregandoLista(true);
    try {
      const [resOrig, resRev] = await Promise.all([
        api.listarArquivosGrupo(grupo.id),
        api.listarArquivosRevisadosGrupo(grupo.id),
      ]);
      setArquivosSalvos(resOrig.arquivos || []);
      setPastaNome(resOrig.pasta_nome || '');
      setArquivosRevisados(resRev.arquivos || []);
      const revDados = revisaoInicial && !resRev.revisao_pos_banca.avaliado_em && revisaoInicial.avaliado_em
        ? revisaoInicial
        : resRev.revisao_pos_banca;
      setRevisaoAtual(revDados);
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao listar arquivos da pasta do grupo.',
      });
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;

    const inicializar = async () => {
      setAbaAtiva(abaInicial);
      setFilaUpload([]);
      setFilaRevisados([]);
      setConfirmarReabertura(false);
      setConfirmarLimparTodos(false);
      setUploadPercentual(null);
      setFeedback(null);
      setCarregandoLista(true);
      try {
        const [resOrig, resRev] = await Promise.all([
          api.listarArquivosGrupo(grupo.id),
          api.listarArquivosRevisadosGrupo(grupo.id),
        ]);
        if (!cancelado) {
          setArquivosSalvos(resOrig.arquivos || []);
          setPastaNome(resOrig.pasta_nome || '');
          setArquivosRevisados(resRev.arquivos || []);
          const revEfetiva =
            revisaoInicial && revisaoInicial.avaliado_em && !resRev.revisao_pos_banca.avaliado_em
              ? revisaoInicial
              : resRev.revisao_pos_banca;
          setRevisaoAtual(revEfetiva);
          setDecisaoAceite(Boolean(revEfetiva.aceito));
          setObservacaoRevisao(revEfetiva.observacao_professor || '');
          setNovoStatusEscolhido(
            normalizarStatusTrabalho(
              revEfetiva.status_trabalho_aplicado ||
                statusTrabalhoAtual ||
                grupo.status_liberacao_nota,
            ),
          );
          setPendenciasTextoRev(pendenciasDescricaoAtual || '');
          setPendenciasCumpridasRev(Boolean(pendenciasCumpridasAtual));
          setStatusPendRev(
            normalizarStatusTrabalho(statusTrabalhoAtual || grupo.status_liberacao_nota),
          );
        }
      } catch (err) {
        if (!cancelado) {
          setFeedback({
            tipo: 'erro',
            texto:
              err instanceof Error
                ? err.message
                : 'Erro ao carregar arquivos já enviados do grupo.',
          });
        }
      } finally {
        if (!cancelado) setCarregandoLista(false);
      }
    };

    void inicializar();
    return () => {
      cancelado = true;
    };
  }, [aberto, grupo.id, abaInicial]);

  if (!aberto) return null;

  const nomesSalvosSet = new Set(arquivosSalvos.map((a) => a.nome.toLowerCase()));
  const nomesRevisadosSet = new Set(arquivosRevisados.map((a) => a.nome.toLowerCase()));
  const tamanhoTotalSalvo = arquivosSalvos.reduce((acc, a) => acc + a.tamanho_bytes, 0);
  const tamanhoTotalRevisados = arquivosRevisados.reduce((acc, a) => acc + a.tamanho_bytes, 0);

  const validarEEnfileirar = (
    fileList: FileList | File[],
    setter: React.Dispatch<React.SetStateAction<File[]>>,
  ) => {
    const candidatos = Array.from(fileList);
    const erros: string[] = [];
    const validos: File[] = [];

    for (const arq of candidatos) {
      const idxDot = arq.name.lastIndexOf('.');
      const ext = idxDot >= 0 ? arq.name.slice(idxDot).toLowerCase() : '';
      if (!EXTENSOES_PERMITIDAS.has(ext)) {
        erros.push(`"${arq.name}": extensão '${ext || 'desconhecida'}' não permitida.`);
        continue;
      }
      if (arq.size > MAX_ARQUIVO_BYTES) {
        erros.push(`"${arq.name}": excede o limite de 200 MB por arquivo.`);
        continue;
      }
      validos.push(arq);
    }

    if (erros.length > 0) {
      setFeedback({ tipo: 'erro', texto: erros.join(' ') });
    } else {
      setFeedback(null);
    }

    if (validos.length > 0) {
      setter((prev) => {
        const mapa = new Map<string, File>();
        prev.forEach((f) => mapa.set(f.name, f));
        validos.forEach((f) => mapa.set(f.name, f));
        return Array.from(mapa.values());
      });
    }
  };

  // --- Handlers da Entrega Original ---
  const handleEnviarArquivosOriginais = async (auditarDepois: boolean) => {
    if (bancaConcluida || filaUpload.length === 0) return;
    setProcessandoAcao(auditarDepois ? 'enviar-auditar' : 'enviar-salvar');
    setUploadPercentual(0);
    setFeedback(null);
    try {
      const res = await api.uploadArquivosGrupo(grupo.id, filaUpload, (pct) => {
        setUploadPercentual(pct);
      });
      setUploadPercentual(100);
      setArquivosSalvos(res.arquivos || []);
      setPastaNome(res.pasta_nome || '');
      setFilaUpload([]);

      if (auditarDepois) {
        await onDispararAuditoriaGrupo(grupo.id);
        await onAtualizarBancas();
        setFeedback({
          tipo: 'ok',
          texto: `${res.enviados.length} arquivo(s) salvo(s) em "${res.pasta_nome}". Análise técnica em execução!`,
        });
      } else {
        await onAtualizarBancas();
        const infoSub =
          res.substituidos.length > 0
            ? ` (${res.substituidos.length} substituído(s))`
            : '';
        setFeedback({
          tipo: 'ok',
          texto: `${res.enviados.length} arquivo(s) salvo(s) com sucesso na pasta "${res.pasta_nome}"${infoSub}.`,
        });
      }
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao enviar arquivos da entrega.',
      });
    } finally {
      setProcessandoAcao(null);
      setUploadPercentual(null);
    }
  };

  const handleExcluirArquivoOriginal = async (nomeArquivo: string) => {
    if (bancaConcluida) return;
    setProcessandoAcao(`del:${nomeArquivo}`);
    setFeedback(null);
    try {
      const res = await api.excluirArquivoGrupo(grupo.id, nomeArquivo);
      setArquivosSalvos(res.arquivos || []);
      if (res.pasta_vazia && arquivosRevisados.length === 0) setPastaNome('');
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: res.pasta_vazia
          ? `Arquivo "${nomeArquivo}" excluído. A pasta ficou vazia e o grupo retornou para "Aguardando Entrega".`
          : `Arquivo "${nomeArquivo}" excluído com sucesso.`,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : `Erro ao excluir "${nomeArquivo}".`,
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleLimparTodosOriginais = async () => {
    if (bancaConcluida) return;
    setProcessandoAcao('del-all');
    setFeedback(null);
    try {
      const res = await api.excluirTodosArquivosGrupo(grupo.id);
      setArquivosSalvos([]);
      if (arquivosRevisados.length === 0) setPastaNome('');
      setConfirmarLimparTodos(false);
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: `${res.removidos_qtd} arquivo(s) removido(s). O grupo voltou para "Aguardando Entrega".`,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao limpar arquivos do grupo.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleConfirmarReabertura = async () => {
    setProcessandoAcao('reabrir');
    setFeedback(null);
    try {
      const ok = await onReabrirBanca();
      if (ok) {
        setConfirmarReabertura(false);
        await recarregarListas();
        setFeedback({
          tipo: 'ok',
          texto:
            'Banca reaberta para "Entregue"! O histórico de notas dos professores foi preservado e você já pode gerenciar os arquivos originais.',
        });
      }
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao reabrir banca.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleAuditarExistentes = async () => {
    if (arquivosSalvos.length === 0 || auditoriaEmAndamento) return;
    setProcessandoAcao('auditar');
    setFeedback(null);
    try {
      await onDispararAuditoriaGrupo(grupo.id);
      setFeedback({
        tipo: 'ok',
        texto: `Auditoria técnica disparada para ${grupo.projeto}. Acompanhe o processamento no painel principal.`,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao iniciar auditoria do grupo.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  // --- Handlers da Aba Revisados (Pós-Banca) ---
  const handleEnviarArquivosRevisados = async () => {
    if (!bancaConcluida || filaRevisados.length === 0) return;
    setProcessandoAcao('enviar-revisados');
    setFeedback(null);
    try {
      const res = await api.uploadArquivosRevisadosGrupo(grupo.id, filaRevisados);
      setArquivosRevisados(res.arquivos || []);
      setRevisaoAtual(res.revisao_pos_banca);
      setDecisaoAceite(Boolean(res.revisao_pos_banca.aceito));
      setFilaRevisados([]);
      if (onSincronizarRevisaoFirestore) {
        await onSincronizarRevisaoFirestore(res.revisao_pos_banca, null);
      }
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: res.mensagem,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao enviar arquivos revisados.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleExcluirArquivoRevisado = async (nomeArquivo: string) => {
    setProcessandoAcao(`del-rev:${nomeArquivo}`);
    setFeedback(null);
    try {
      const res = await api.excluirArquivoRevisadoGrupo(grupo.id, nomeArquivo);
      setArquivosRevisados(res.arquivos || []);
      setRevisaoAtual(res.revisao_pos_banca);
      if (res.revisao_pos_banca.status === 'sem_revisao') {
        setDecisaoAceite(false);
      }
      if (onSincronizarRevisaoFirestore) {
        await onSincronizarRevisaoFirestore(res.revisao_pos_banca, null);
      }
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: res.mensagem,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : `Erro ao excluir "${nomeArquivo}" de revisados.`,
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleConfirmarParecerRevisao = async () => {
    if (!bancaConcluida || arquivosRevisados.length === 0) return;
    setProcessandoAcao('avaliar-revisados');
    setFeedback(null);
    try {
      const statusParaAplicar = decisaoAceite ? novoStatusEscolhido : null;
      const res = await api.avaliarRevisaoPosBanca(grupo.id, {
        aceito: decisaoAceite,
        observacao_professor: observacaoRevisao,
        avaliador: professorNome,
        novo_status_liberacao: statusParaAplicar,
        pendencias_cumpridas:
          decisaoAceite && statusParaAplicar === 'Aprovado' ? true : pendenciasCumpridasRev,
      });
      setRevisaoAtual(res.revisao_pos_banca);
      if (statusParaAplicar) {
        setStatusPendRev(statusParaAplicar);
        if (statusParaAplicar === 'Aprovado') {
          setPendenciasCumpridasRev(true);
        }
      }
      if (onSincronizarRevisaoFirestore) {
        await onSincronizarRevisaoFirestore(res.revisao_pos_banca, statusParaAplicar);
      }
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: decisaoAceite
          ? `Revisão aceita! Status do trabalho definido como "${novoStatusEscolhido}".`
          : 'Revisão marcada como "Novos Ajustes Pendentes".',
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao registrar parecer dos arquivos revisados.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  const handleSalvarPendenciasRevisados = async () => {
    if (!bancaConcluida || !onAtualizarPendencias) return;
    setProcessandoAcao('salvar-pend-rev');
    setFeedback(null);
    try {
      await onAtualizarPendencias({
        possui_pendencias: Boolean(pendenciasTextoRev.trim()) || statusPendRev !== 'Aprovado',
        pendencias_descricao: pendenciasTextoRev,
        pendencias_cumpridas: pendenciasCumpridasRev,
        novo_status_liberacao: statusPendRev,
        origem: 'revisados',
      });
      setNovoStatusEscolhido(statusPendRev);
      await onAtualizarBancas();
      setFeedback({
        tipo: 'ok',
        texto: `Situação da nota e registro datado de pendências atualizados no Portal (${statusPendRev}).`,
      });
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? err.message
            : 'Erro ao salvar pendências e situação na aba de revisados.',
      });
    } finally {
      setProcessandoAcao(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {grupo.turma} • {grupo.grupo}
                </span>
                <span className="font-mono text-xs text-slate-300">
                  #{grupo.ordem_apresentacao}º na ordem
                </span>
              </div>
              <h3 className="mt-1 text-base font-extrabold text-white">
                Entregáveis do Projeto — {grupo.projeto}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                {pastaNome
                  ? abaAtiva === 'revisados'
                    ? `./tcc/${grupo.turma}/${pastaNome}/revisados/`
                    : `./tcc/${grupo.turma}/${pastaNome}/`
                  : `Destino: ./tcc/${grupo.turma}/ (pasta criada no padrão oficial ao enviar)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
            title="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação de Abas: Entrega Original vs Arquivos Revisados (Pós-Banca) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-6 py-2.5">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('originais');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
              abaAtiva === 'originais'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Entrega Original ({arquivosSalvos.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('revisados');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
              abaAtiva === 'revisados'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-900'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Arquivos Revisados • Pós-Banca ({arquivosRevisados.length})
            {revisaoAtual?.status === 'aceito' && (
              <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[9px] uppercase">
                Aceito
              </span>
            )}
          </button>
        </div>

        {/* Corpo com rolagem */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Feedback de ação */}
          {feedback && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                feedback.tipo === 'ok'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-red-300 bg-red-50 text-red-900'
              }`}
            >
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <p className="font-semibold leading-relaxed">{feedback.texto}</p>
            </div>
          )}

          {/* Painel de Barra de Carregamento em 2 Fases (Upload % + Análise MSEP) */}
          {(processandoAcao === 'enviar-auditar' ||
            processandoAcao === 'enviar-salvar' ||
            processandoAcao === 'auditar' ||
            auditoriaEmAndamento) &&
            (() => {
              const emUpload =
                uploadPercentual !== null &&
                (processandoAcao === 'enviar-auditar' || processandoAcao === 'enviar-salvar') &&
                uploadPercentual < 100;
              const analisePct =
                statusAuditoria && statusAuditoria.progresso_total > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (statusAuditoria.progresso_atual / statusAuditoria.progresso_total) * 100,
                      ),
                    )
                  : 10;
              const ultimoLog =
                statusAuditoria && statusAuditoria.logs.length > 0
                  ? statusAuditoria.logs[statusAuditoria.logs.length - 1]
                  : null;
              const barraPct = emUpload
                ? Math.max(5, uploadPercentual ?? 0)
                : Math.max(10, analisePct);

              return (
                <div className="rounded-2xl border-2 border-indigo-300 bg-linear-to-r from-indigo-50 via-white to-amber-50 p-4 shadow-sm space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="h-5 w-5 animate-spin text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {emUpload
                            ? `Fase 1/2 — Enviando arquivos para ./tcc/${grupo.turma}/ (${uploadPercentual ?? 0}%)`
                            : 'Fase 2/2 — Analisando arquivos e calculando rubricas MSEP...'}
                        </p>
                        <p className="text-[11px] font-semibold text-indigo-800">
                          {emUpload
                            ? 'Transferindo monografia, scripts SQL, código ZIP e slides para o servidor...'
                            : statusAuditoria?.progresso_etapa ||
                              'Extraindo evidências de ABNT, DER, SQL, código-fonte e links online...'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-600 px-3 py-0.5 font-mono text-xs font-black text-white">
                        {barraPct}%
                      </span>
                      {!emUpload && (
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-900 hover:bg-indigo-100 cursor-pointer"
                        >
                          Acompanhar no Painel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges das 2 fases */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                        emUpload
                          ? 'bg-indigo-600 text-white'
                          : 'border border-emerald-300 bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {emUpload ? `1. Upload (${uploadPercentual ?? 0}%)` : '1. Upload concluído (100%)'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                        emUpload ? 'bg-slate-200 text-slate-600' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {statusAuditoria && statusAuditoria.progresso_total > 0 && !emUpload
                        ? `2. Análise MSEP (Etapa ${statusAuditoria.progresso_atual}/${statusAuditoria.progresso_total})`
                        : '2. Análise MSEP'}
                    </span>
                  </div>

                  {/* Barra de progresso visual */}
                  <div className="h-3 w-full overflow-hidden rounded-full border border-indigo-200 bg-indigo-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        emUpload
                          ? 'bg-linear-to-r from-indigo-600 to-blue-500'
                          : 'bg-linear-to-r from-red-600 via-amber-500 to-emerald-500'
                      }`}
                      style={{ width: `${barraPct}%` }}
                    />
                  </div>

                  {ultimoLog && !emUpload && (
                    <p className="truncate font-mono text-[11px] text-slate-600">{ultimoLog}</p>
                  )}

                  <p className="text-[11px] text-slate-500">
                    Você pode manter esta janela aberta ou clicar em{' '}
                    <strong>Acompanhar no Painel</strong> para fechar o modal — a barra continua
                    visível no topo de <em>Auditoria &amp; Bancas</em> até as notas serem
                    atualizadas.
                  </p>
                </div>
              );
            })()}

          {abaAtiva === 'originais' ? (
            <>
              {/* Proteção para Banca Já Concluída */}
              {bancaConcluida ? (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-950">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-950">
                          Entrega Original Protegida (Banca Concluída)
                        </h4>
                        <p className="mt-0.5 max-w-xl leading-relaxed text-amber-900">
                          Os arquivos originais da banca permanecem preservados. Para enviar{' '}
                          <strong>arquivos corrigidos pós-banca</strong> sem substituir os originais,
                          use a aba <strong>Arquivos Revisados • Pós-Banca</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAbaAtiva('revisados')}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-emerald-700 cursor-pointer"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        Ir para Arquivos Revisados
                      </button>

                      {!confirmarReabertura && (
                        <button
                          type="button"
                          disabled={processandoAcao !== null}
                          onClick={() => setConfirmarReabertura(true)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reabrir Banca (Voltar para Entregue)
                        </button>
                      )}
                    </div>
                  </div>

                  {confirmarReabertura && (
                    <div className="mt-3 rounded-lg border border-amber-400 bg-white p-3">
                      <p className="font-bold text-slate-900">
                        Confirmar reabertura da banca de {grupo.projeto}?
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        A sessão voltará para <strong>Entregue / Aguardando Início</strong> e as
                        notas e rascunhos já lançados pelos professores no Firestore serão{' '}
                        <strong>preservados</strong>. Isso desbloqueia upload/exclusão dos originais.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={processandoAcao === 'reabrir'}
                          onClick={() => void handleConfirmarReabertura()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                        >
                          {processandoAcao === 'reabrir' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Confirmar Reabertura
                        </button>
                        <button
                          type="button"
                          disabled={processandoAcao !== null}
                          onClick={() => setConfirmarReabertura(false)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Zona Drag & Drop Originais */
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setArrastando(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setArrastando(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setArrastando(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        validarEEnfileirar(e.dataTransfer.files, setFilaUpload);
                      }
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                      arrastando
                        ? 'border-red-500 bg-red-50/70'
                        : 'border-slate-300 bg-slate-50/70 hover:border-red-400 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      multiple
                      accept=".docx,.pdf,.pptx,.sql,.zip,.txt,.md,.csv,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          validarEEnfileirar(e.target.files, setFilaUpload);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-red-600 shadow-2xs">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-slate-900">
                      Arraste e solte aqui os arquivos da entrega original ou clique para selecionar
                    </p>
                    <p className="mt-1 max-w-lg text-xs text-slate-500">
                      Formatos aceitos: <code>.docx</code>, <code>.pdf</code>, <code>.pptx</code>,{' '}
                      <code>.sql</code>, <code>.zip</code>, <code>links.txt</code> e anexos (até 200
                      MB por arquivo). Nomes iguais substituem o arquivo anterior.
                    </p>
                  </div>

                  {/* Fila de Arquivos Originais */}
                  {filaUpload.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Selecionados para Envio ({filaUpload.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setFilaUpload([])}
                          className="text-[11px] font-semibold text-slate-500 hover:text-red-700 cursor-pointer"
                        >
                          Limpar fila
                        </button>
                      </div>

                      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                        {filaUpload.map((arq) => {
                          const vaiSubstituir = nomesSalvosSet.has(arq.name.toLowerCase());
                          return (
                            <li
                              key={arq.name}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Upload className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                <span className="truncate font-semibold text-slate-900">
                                  {arq.name}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-slate-500">
                                  {formatarTamanho(arq.size)}
                                </span>
                                {vaiSubstituir && (
                                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                    Substituirá existente
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setFilaUpload((prev) =>
                                    prev.filter((item) => item.name !== arq.name),
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                                title="Remover da fila"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={processandoAcao !== null}
                          onClick={() => void handleEnviarArquivosOriginais(false)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                        >
                          {processandoAcao === 'enviar-salvar' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 text-slate-600" />
                          )}
                          Apenas Salvar Arquivos
                        </button>

                        <button
                          type="button"
                          disabled={processandoAcao !== null || auditoriaEmAndamento}
                          onClick={() => void handleEnviarArquivosOriginais(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          {processandoAcao === 'enviar-auditar' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 fill-white" />
                          )}
                          Enviar e Auditar Agora
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lista de Arquivos Originais Salvos na Pasta */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      Arquivos Salvos na Entrega Original ({arquivosSalvos.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Espaço ocupado: <strong>{formatarTamanho(tamanhoTotalSalvo)}</strong>
                      {bancaConcluida
                        ? ' • Somente visualização e download (banca concluída)'
                        : ' • Você pode baixar, substituir enviando outro arquivo ou excluir'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!bancaConcluida && arquivosSalvos.length > 0 && (
                      <button
                        type="button"
                        disabled={processandoAcao !== null || auditoriaEmAndamento}
                        onClick={() => void handleAuditarExistentes()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        Auditar / Reauditar Grupo
                      </button>
                    )}

                    {!bancaConcluida && arquivosSalvos.length > 0 && !confirmarLimparTodos && (
                      <button
                        type="button"
                        disabled={processandoAcao !== null}
                        onClick={() => setConfirmarLimparTodos(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir Todos
                      </button>
                    )}
                  </div>
                </div>

                {confirmarLimparTodos && !bancaConcluida && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-900">
                    <span className="font-bold">
                      Tem certeza que deseja excluir todos os {arquivosSalvos.length} arquivo(s)
                      originais desta pasta?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={processandoAcao === 'del-all'}
                        onClick={() => void handleLimparTodosOriginais()}
                        className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                      >
                        {processandoAcao === 'del-all'
                          ? 'Excluindo...'
                          : 'Confirmar Exclusão Total'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarLimparTodos(false)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {carregandoLista ? (
                  <div className="space-y-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : arquivosSalvos.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-500">
                    Nenhum arquivo salvo ainda para este grupo em{' '}
                    <code>./tcc/{grupo.turma}/</code>.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {arquivosSalvos.map((arq) => (
                      <li
                        key={arq.nome}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          {iconeDoArquivo(arq.extensao)}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900" title={arq.nome}>
                              {arq.nome}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                                {arq.tipo_detectado}
                              </span>
                              <span className="font-mono">{formatarTamanho(arq.tamanho_bytes)}</span>
                              <span>•</span>
                              <span>
                                {new Date(arq.modificado_em).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={api.getDownloadArquivoGrupoUrl(grupo.id, arq.nome)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                            title="Baixar arquivo original"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Baixar
                          </a>

                          {!bancaConcluida && (
                            <button
                              type="button"
                              disabled={processandoAcao !== null}
                              onClick={() => void handleExcluirArquivoOriginal(arq.nome)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                              title="Excluir arquivo original"
                            >
                              {processandoAcao === `del:${arq.nome}` ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Excluir
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            /* ABA 2: ARQUIVOS REVISADOS (PÓS-BANCA) */
            <div className="space-y-5">
              {!bancaConcluida ? (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-6 text-center text-xs text-amber-950">
                  <Lock className="mx-auto h-8 w-8 text-amber-600" />
                  <h4 className="mt-2 text-sm font-extrabold">
                    Área Disponível Após a Realização da Banca
                  </h4>
                  <p className="mx-auto mt-1 max-w-lg leading-relaxed text-amber-900">
                    Os arquivos corrigidos pós-banca ficam armazenados na subpasta{' '}
                    <code>revisados/</code> após o encerramento da banca examinadora (seja em status{' '}
                    <strong>Nota Liberada</strong>, <strong>Nota Retida</strong> ou{' '}
                    <strong>Nova Apresentação</strong>).
                  </p>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('originais')}
                    className="mt-3 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Voltar para Entrega Original
                  </button>
                </div>
              ) : (
                <>
                  {/* Banner Explicativo da Subpasta revisados/ */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      Subpasta Exclusiva de Correções (revisados/) — Originais Preservados
                    </p>
                    <p className="mt-1 leading-relaxed text-emerald-900">
                      Os arquivos enviados aqui são gravados como extras em{' '}
                      <code>revisados/</code> dentro da pasta do grupo e{' '}
                      <strong>nunca substituem os arquivos originais</strong> nem alteram as notas
                      numéricas da banca. Após recebidos, o Professor Titular indica se estão{' '}
                      <strong>Aceitos</strong> e pode alterar o status final entre os 3 possíveis.
                    </p>
                  </div>

                  {/* Dropzone para Arquivos Corrigidos */}
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setArrastandoRevisados(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setArrastandoRevisados(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setArrastandoRevisados(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          validarEEnfileirar(e.dataTransfer.files, setFilaRevisados);
                        }
                      }}
                      onClick={() => inputRevisadosRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${
                        arrastandoRevisados
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50/60'
                      }`}
                    >
                      <input
                        ref={inputRevisadosRef}
                        type="file"
                        multiple
                        accept=".docx,.pdf,.pptx,.sql,.zip,.txt,.md,.csv,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            validarEEnfileirar(e.target.files, setFilaRevisados);
                            e.target.value = '';
                          }
                        }}
                      />
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-700 shadow-2xs">
                        <FileCheck2 className="h-5 w-5" />
                      </div>
                      <p className="mt-2.5 text-sm font-extrabold text-slate-900">
                        Arraste aqui os arquivos corrigidos pós-banca ou clique para selecionar
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Salvo em <code>revisados/</code> (até 200 MB por arquivo). Enviar novos
                        arquivos reabre a etapa de validação para aceite do Professor Titular.
                      </p>
                    </div>

                    {filaRevisados.length > 0 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                            Arquivos Corrigidos Prontos para Envio ({filaRevisados.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setFilaRevisados([])}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-700 cursor-pointer"
                          >
                            Limpar fila
                          </button>
                        </div>

                        <ul className="divide-y divide-emerald-100 rounded-lg border border-emerald-200 bg-white">
                          {filaRevisados.map((arq) => {
                            const vaiSubstituirRev = nomesRevisadosSet.has(arq.name.toLowerCase());
                            return (
                              <li
                                key={arq.name}
                                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <Upload className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                                  <span className="truncate font-semibold text-slate-900">
                                    {arq.name}
                                  </span>
                                  <span className="shrink-0 font-mono text-[11px] text-slate-500">
                                    {formatarTamanho(arq.size)}
                                  </span>
                                  {vaiSubstituirRev && (
                                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                      Atualizará arquivo em revisados/
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilaRevisados((prev) =>
                                      prev.filter((item) => item.name !== arq.name),
                                    )
                                  }
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={processandoAcao !== null}
                            onClick={() => void handleEnviarArquivosRevisados()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            {processandoAcao === 'enviar-revisados' ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CloudUpload className="h-4 w-4" />
                            )}
                            Enviar Arquivos Corrigidos para revisados/
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista dos Arquivos Recebidos em revisados/ */}
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                          Arquivos Recebidos em revisados/ ({arquivosRevisados.length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Total em revisados: <strong>{formatarTamanho(tamanhoTotalRevisados)}</strong>
                        </p>
                      </div>

                      {revisaoAtual && revisaoAtual.status !== 'sem_revisao' && (
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            revisaoAtual.status === 'aceito'
                              ? 'bg-emerald-100 text-emerald-800'
                              : revisaoAtual.status === 'ajustes_pendentes'
                              ? 'bg-orange-100 text-orange-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {revisaoAtual.status === 'aceito'
                            ? 'Revisão Aceita pelo Titular'
                            : revisaoAtual.status === 'ajustes_pendentes'
                            ? 'Ajustes Pendentes'
                            : 'Aguardando Validação'}
                        </span>
                      )}
                    </div>

                    {carregandoLista ? (
                      <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                    ) : arquivosRevisados.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-500">
                        Nenhum arquivo corrigido enviado ainda em <code>revisados/</code>.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {arquivosRevisados.map((arq) => (
                          <li
                            key={arq.nome}
                            className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              {iconeDoArquivo(arq.extensao)}
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900" title={arq.nome}>
                                  {arq.nome}
                                </p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                                    Revisado • {arq.tipo_detectado}
                                  </span>
                                  <span className="font-mono">
                                    {formatarTamanho(arq.tamanho_bytes)}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(arq.modificado_em).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <a
                                href={api.getDownloadArquivoRevisadoUrl(grupo.id, arq.nome)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Baixar
                              </a>
                              <button
                                type="button"
                                disabled={processandoAcao !== null}
                                onClick={() => void handleExcluirArquivoRevisado(arq.nome)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                              >
                                {processandoAcao === `del-rev:${arq.nome}` ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Excluir
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Painel de Aceite pelo Professor Titular e Alteração do Status do Trabalho */}
                  {arquivosRevisados.length > 0 && isProfessorTitular && (
                    <div className="space-y-4 rounded-xl border-2 border-slate-300 bg-slate-50 p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div>
                          <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            <ShieldCheck className="h-4 w-4 text-emerald-700" />
                            Validação do Professor Titular ({professorNome})
                          </h4>
                          <p className="text-[11px] text-slate-600">
                            Indique se os arquivos revisados estão aceitos. Quando aceitos, você pode
                            alterar o status final do trabalho entre os 3 possíveis.
                          </p>
                        </div>
                      </div>

                      {/* Decisão: Aceito vs Solicitar Novos Ajustes */}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setDecisaoAceite(true)}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-extrabold transition cursor-pointer ${
                            decisaoAceite
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Arquivos Revisados Aceitos
                        </button>

                        <button
                          type="button"
                          onClick={() => setDecisaoAceite(false)}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-extrabold transition cursor-pointer ${
                            !decisaoAceite
                              ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-orange-400'
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                          Solicitar Novos Ajustes (Não Aceito)
                        </button>
                      </div>

                      {/* Seletor dos 3 Status Possíveis (liberado SOMENTE quando Aceito) */}
                      {decisaoAceite ? (
                        <div className="rounded-xl border border-emerald-300 bg-white p-3.5 space-y-2">
                          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                            Alterar Status do Trabalho (entre os 3 status possíveis):
                          </label>
                          <select
                            value={novoStatusEscolhido}
                            onChange={(e) =>
                              setNovoStatusEscolhido(e.target.value as ResultadoFinalTipo)
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                          >
                            <option value="Aprovado">✅ Nota Liberada (Aprovado)</option>
                            <option value="Nota Retida (Pendências)">
                              ⚠️ Nota Retida (Pendências)
                            </option>
                            <option value="Nova Chance (Data Futura)">
                              ❌ Nova Apresentação (Nova Chance)
                            </option>
                          </select>
                          <p className="text-[11px] text-slate-500">
                            Ao confirmar como <strong>Nota Liberada (Aprovado)</strong>, eventuais
                            pendências são marcadas como cumpridas automaticamente no Portal dos
                            Alunos sem alterar as notas numéricas originais.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] text-orange-900">
                          A alteração do status final do trabalho só é liberada após o Professor
                          Titular marcar os arquivos revisados como <strong>Aceitos</strong>.
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Observação / Consideração do Professor sobre os Arquivos Revisados (Opcional):
                        </label>
                        <textarea
                          rows={2}
                          value={observacaoRevisao}
                          onChange={(e) => setObservacaoRevisao(e.target.value)}
                          placeholder="Ex: Correções do DER e remoção do localStorage conferidas e validadas."
                          className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {revisaoAtual?.avaliado_em && (
                          <span className="text-[11px] text-slate-500">
                            Última validação por <strong>{revisaoAtual.avaliado_por}</strong> em{' '}
                            {new Date(revisaoAtual.avaliado_em).toLocaleString('pt-BR')}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={processandoAcao !== null}
                          onClick={() => void handleConfirmarParecerRevisao()}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                        >
                          {processandoAcao === 'avaliar-revisados' ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Confirmar Parecer da Revisão
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Controle de Pendências & Cumprimento (Portal dos Alunos) — na Aba de Revisados */}
                  {onAtualizarPendencias && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 pb-2.5">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-amber-700" />
                          <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Controle de Pendências &amp; Cumprimento (Portal dos Alunos)
                            </h4>
                            <p className="text-[11px] text-slate-600">
                              Altere diretamente o status final (Nota Liberada / Nota Retida / Nova Apresentação) e registre mensagens datadas na recepção dos arquivos revisados.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!isProfessorTitular}
                          onClick={() => {
                            const proximo = !pendenciasCumpridasRev;
                            setPendenciasCumpridasRev(proximo);
                            if (proximo) {
                              setStatusPendRev('Aprovado');
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition shadow-xs cursor-pointer disabled:opacity-60 ${
                            pendenciasCumpridasRev
                              ? 'border border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200'
                          }`}
                        >
                          {pendenciasCumpridasRev ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Pendências Cumpridas
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-amber-700" />
                              Pendências em Aberto
                            </>
                          )}
                        </button>
                      </div>

                      {historicoPendencias.length > 0 && (
                        <div className="rounded-lg border border-amber-200/80 bg-white/90 p-3 space-y-2">
                          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            Histórico Cronológico (Durante a Banca &amp; Arquivos Revisados) ({historicoPendencias.length})
                          </p>
                          <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                            {historicoPendencias.map((reg) => {
                              const dataFmt = reg.data_hora
                                ? new Date(reg.data_hora).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '';
                              const isRev = reg.origem === 'revisados';
                              return (
                                <div
                                  key={reg.id || `${reg.data_hora}-${reg.mensagem.slice(0, 12)}`}
                                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-[11px]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                          isRev
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-indigo-100 text-indigo-800'
                                        }`}
                                      >
                                        {isRev ? 'Arquivos Revisados' : 'Durante a Banca'}
                                      </span>
                                      <span className="font-bold text-slate-800">{reg.autor}</span>
                                      {reg.status_aplicado && (
                                        <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                                          {reg.status_aplicado}
                                        </span>
                                      )}
                                    </div>
                                    {dataFmt && (
                                      <span className="font-mono text-[10px] font-semibold text-slate-500">
                                        {dataFmt}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-800">
                                    {reg.mensagem}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-12">
                        <div className="md:col-span-8">
                          <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                            Mensagem / Descrição na Recepção dos Arquivos Revisados (com data e hora):
                          </label>
                          <textarea
                            rows={2}
                            disabled={!isProfessorTitular}
                            value={pendenciasTextoRev}
                            onChange={(e) => setPendenciasTextoRev(e.target.value)}
                            placeholder="Ex: Arquivos revisados recebidos e conferidos; pendência do script .sql cumprida."
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none disabled:bg-slate-100"
                          />
                        </div>

                        <div className="md:col-span-4 flex flex-col justify-between gap-2">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                              Situação da Nota:
                            </label>
                            <select
                              disabled={!isProfessorTitular}
                              value={statusPendRev}
                              onChange={(e) =>
                                setStatusPendRev(e.target.value as ResultadoFinalTipo)
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-red-500 focus:outline-none disabled:bg-slate-100"
                            >
                              <option value="Aprovado">✅ Nota Liberada (Aprovado)</option>
                              <option value="Nota Retida (Pendências)">
                                ⚠️ Nota Retida (Pendências)
                              </option>
                              <option value="Nova Chance (Data Futura)">
                                ❌ Nova Apresentação
                              </option>
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={!isProfessorTitular || processandoAcao !== null}
                            onClick={() => void handleSalvarPendenciasRevisados()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                          >
                            {processandoAcao === 'salvar-pend-rev' ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Salvar Pendências no Portal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[11px] text-slate-500">
            {abaAtiva === 'revisados'
              ? 'Arquivos corrigidos salvos separadamente em revisados/ sem alterar a entrega original.'
              : 'Os arquivos enviados ficam armazenados no diretório oficial ./tcc/ do servidor.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
export default ModalEntregaArquivos;
