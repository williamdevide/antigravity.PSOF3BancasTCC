import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { ArquivoEntregaSalvo, AvaliacaoGrupo } from '../types';

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
  bancaConcluida: boolean;
  auditoriaEmAndamento: boolean;
  onAtualizarBancas: () => Promise<void>;
  onDispararAuditoriaGrupo: (grupoId: string) => Promise<void> | void;
  onReabrirBanca: () => Promise<boolean>;
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
  bancaConcluida,
  auditoriaEmAndamento,
  onAtualizarBancas,
  onDispararAuditoriaGrupo,
  onReabrirBanca,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [arquivosSalvos, setArquivosSalvos] = useState<ArquivoEntregaSalvo[]>([]);
  const [pastaNome, setPastaNome] = useState<string>('');
  const [filaUpload, setFilaUpload] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState<boolean>(false);
  const [carregandoLista, setCarregandoLista] = useState<boolean>(false);
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null);
  const [confirmarReabertura, setConfirmarReabertura] = useState<boolean>(false);
  const [confirmarLimparTodos, setConfirmarLimparTodos] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregarListaArquivos = async () => {
    setCarregandoLista(true);
    try {
      const res = await api.listarArquivosGrupo(grupo.id);
      setArquivosSalvos(res.arquivos || []);
      setPastaNome(res.pasta_nome || '');
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
      setFilaUpload([]);
      setConfirmarReabertura(false);
      setConfirmarLimparTodos(false);
      setFeedback(null);
      setCarregandoLista(true);
      try {
        const res = await api.listarArquivosGrupo(grupo.id);
        if (!cancelado) {
          setArquivosSalvos(res.arquivos || []);
          setPastaNome(res.pasta_nome || '');
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
  }, [aberto, grupo.id]);

  if (!aberto) return null;

  const nomesSalvosSet = new Set(arquivosSalvos.map((a) => a.nome.toLowerCase()));
  const tamanhoTotalSalvo = arquivosSalvos.reduce((acc, a) => acc + a.tamanho_bytes, 0);

  const adicionarArquivosNaFila = (fileList: FileList | File[]) => {
    if (bancaConcluida) return;
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
      setFilaUpload((prev) => {
        const mapa = new Map<string, File>();
        prev.forEach((f) => mapa.set(f.name, f));
        validos.forEach((f) => mapa.set(f.name, f));
        return Array.from(mapa.values());
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastando(false);
    if (bancaConcluida) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      adicionarArquivosNaFila(e.dataTransfer.files);
    }
  };

  const handleEnviarArquivos = async (auditarDepois: boolean) => {
    if (bancaConcluida || filaUpload.length === 0) return;
    setProcessandoAcao(auditarDepois ? 'enviar-auditar' : 'enviar-salvar');
    setFeedback(null);
    try {
      const res = await api.uploadArquivosGrupo(grupo.id, filaUpload);
      setArquivosSalvos(res.arquivos || []);
      setPastaNome(res.pasta_nome || '');
      setFilaUpload([]);
      await onAtualizarBancas();

      if (auditarDepois) {
        await onDispararAuditoriaGrupo(grupo.id);
        setFeedback({
          tipo: 'ok',
          texto: `${res.enviados.length} arquivo(s) salvo(s) em "${res.pasta_nome}". Auditoria técnica do grupo iniciada!`,
        });
      } else {
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
    }
  };

  const handleExcluirArquivo = async (nomeArquivo: string) => {
    if (bancaConcluida) return;
    setProcessandoAcao(`del:${nomeArquivo}`);
    setFeedback(null);
    try {
      const res = await api.excluirArquivoGrupo(grupo.id, nomeArquivo);
      setArquivosSalvos(res.arquivos || []);
      if (res.pasta_vazia) setPastaNome('');
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

  const handleLimparTodos = async () => {
    if (bancaConcluida) return;
    setProcessandoAcao('del-all');
    setFeedback(null);
    try {
      const res = await api.excluirTodosArquivosGrupo(grupo.id);
      setArquivosSalvos([]);
      setPastaNome('');
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
        await carregarListaArquivos();
        setFeedback({
          tipo: 'ok',
          texto:
            'Banca reaberta para "Entregue"! O histórico de notas dos professores foi preservado e você já pode excluir ou enviar novos arquivos.',
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
                  ? `./tcc/${grupo.turma}/${pastaNome}/`
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

          {/* Indicador de Auditoria em Andamento */}
          {auditoriaEmAndamento && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-700" />
                <span>Auditoria técnica do agente em execução no servidor...</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
              >
                Acompanhar no Painel
              </button>
            </div>
          )}

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
                      Banca Concluída — Envio e Exclusão Bloqueados
                    </h4>
                    <p className="mt-0.5 max-w-xl leading-relaxed text-amber-900">
                      A banca deste grupo já foi finalizada. Para excluir arquivos após análise ou
                      enviar uma nova versão da entrega, reabra a banca para o estado{' '}
                      <strong>Entregue</strong>.
                    </p>
                  </div>
                </div>

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

              {confirmarReabertura && (
                <div className="mt-3 rounded-lg border border-amber-400 bg-white p-3">
                  <p className="font-bold text-slate-900">
                    Confirmar reabertura da banca de {grupo.projeto}?
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    A sessão voltará para <strong>Entregue / Aguardando Início</strong> e as notas e
                    rascunhos já lançados pelos professores no Firestore serão{' '}
                    <strong>preservados</strong>. Isso desbloqueia o upload, a exclusão de arquivos
                    e uma nova auditoria.
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
            /* Zona Drag & Drop Ativa (Pendente ou Entregue sem Conclusão) */
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
                onDrop={handleDrop}
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
                      adicionarArquivosNaFila(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-red-600 shadow-2xs">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-extrabold text-slate-900">
                  Arraste e solte aqui os arquivos da entrega ou clique para selecionar
                </p>
                <p className="mt-1 max-w-lg text-xs text-slate-500">
                  Formatos aceitos: <code>.docx</code>, <code>.pdf</code>, <code>.pptx</code>,{' '}
                  <code>.sql</code>, <code>.zip</code>, <code>links.txt</code> e anexos (até 200 MB
                  por arquivo). Nomes iguais substituem o arquivo anterior.
                </p>
              </div>

              {/* Fila de Arquivos Prontos para Envio */}
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
                            <span className="truncate font-semibold text-slate-900">{arq.name}</span>
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
                              setFilaUpload((prev) => prev.filter((item) => item.name !== arq.name))
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

                  {/* Botões de Ação (Enviar e Auditar vs Apenas Salvar) */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={processandoAcao !== null}
                      onClick={() => void handleEnviarArquivos(false)}
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
                      onClick={() => void handleEnviarArquivos(true)}
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

          {/* Lista de Arquivos Já Enviados & Salvos na Pasta */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Arquivos Salvos na Entrega ({arquivosSalvos.length})
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
                  Tem certeza que deseja excluir todos os {arquivosSalvos.length} arquivo(s) desta
                  pasta?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={processandoAcao === 'del-all'}
                    onClick={() => void handleLimparTodos()}
                    className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {processandoAcao === 'del-all' ? 'Excluindo...' : 'Confirmar Exclusão Total'}
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
                Nenhum arquivo salvo ainda para este grupo em <code>./tcc/{grupo.turma}/</code>.
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
                        title="Baixar arquivo"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                      </a>

                      {!bancaConcluida && (
                        <button
                          type="button"
                          disabled={processandoAcao !== null}
                          onClick={() => void handleExcluirArquivo(arq.nome)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                          title="Excluir arquivo"
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
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[11px] text-slate-500">
            Os arquivos enviados ficam armazenados no diretório oficial <code>./tcc/</code> do servidor.
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
