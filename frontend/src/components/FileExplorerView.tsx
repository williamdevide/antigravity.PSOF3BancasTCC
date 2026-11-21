import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Lock,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import type {
  ArvoreArquivosResponse,
  NoArvoreArquivo,
  PreviewArquivoResponse,
} from '../types';

interface FileExplorerViewProps {
  onArquivoExcluido?: () => Promise<void> | void;
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconePorExtensao(ext: string) {
  const e = (ext || '').toLowerCase();
  if (e === '.zip') return <FileArchive className="h-4 w-4 shrink-0 text-amber-600" />;
  if (['.sql', '.js', '.ts', '.tsx', '.jsx', '.py', '.php', '.html', '.css', '.json', '.xml'].includes(e)) {
    return <FileCode2 className="h-4 w-4 shrink-0 text-emerald-700" />;
  }
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(e)) {
    return <FileImage className="h-4 w-4 shrink-0 text-sky-600" />;
  }
  if (e === '.pptx') return <FileSpreadsheet className="h-4 w-4 shrink-0 text-red-600" />;
  return <FileText className="h-4 w-4 shrink-0 text-slate-600" />;
}

function coletarPastasIniciais(nos: NoArvoreArquivo[]): Record<string, boolean> {
  const mapa: Record<string, boolean> = {};
  nos.forEach((n) => {
    if (n.tipo === 'pasta') {
      mapa[n.caminho_relativo] = n.nome === 'I2DEV-A' || n.nome === 'I2DEV-B';
    }
  });
  return mapa;
}

function filtrarArvore(nos: NoArvoreArquivo[], termo: string): NoArvoreArquivo[] {
  const q = termo.trim().toLowerCase();
  if (!q) return nos;
  const resultado: NoArvoreArquivo[] = [];
  for (const no of nos) {
    if (no.tipo === 'pasta') {
      const filhosMatch = filtrarArvore(no.filhos || [], q);
      if (no.nome.toLowerCase().includes(q) || filhosMatch.length > 0) {
        resultado.push({
          ...no,
          filhos: no.nome.toLowerCase().includes(q) && filhosMatch.length === 0 ? no.filhos : filhosMatch,
        });
      }
    } else if (
      no.nome.toLowerCase().includes(q) ||
      no.caminho_relativo.toLowerCase().includes(q)
    ) {
      resultado.push(no);
    }
  }
  return resultado;
}

export const FileExplorerView: React.FC<FileExplorerViewProps> = ({ onArquivoExcluido }) => {
  const [arvore, setArvore] = useState<ArvoreArquivosResponse | null>(null);
  const [pastasAbertas, setPastasAbertas] = useState<Record<string, boolean>>({});
  const [buscaArvore, setBuscaArvore] = useState<string>('');
  const [buscaZip, setBuscaZip] = useState<string>('');
  const [caminhoSelecionado, setCaminhoSelecionado] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewArquivoResponse | null>(null);
  const [carregandoArvore, setCarregandoArvore] = useState<boolean>(true);
  const [carregandoPreview, setCarregandoPreview] = useState<boolean>(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState<boolean>(false);
  const [excluindo, setExcluindo] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregarArvore = useCallback(async (preservarAbertas = true) => {
    setCarregandoArvore(true);
    try {
      const res = await api.getArvoreArquivos();
      setArvore(res);
      if (!preservarAbertas) {
        setPastasAbertas(coletarPastasIniciais(res.filhos || []));
      } else {
        setPastasAbertas((prev) =>
          Object.keys(prev).length === 0 ? coletarPastasIniciais(res.filhos || []) : prev,
        );
      }
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao carregar árvore de arquivos.',
      });
    } finally {
      setCarregandoArvore(false);
    }
  }, []);

  useEffect(() => {
    void carregarArvore(false);
  }, [carregarArvore]);

  const abrirArquivo = async (caminho: string, entradaZip?: string | null) => {
    setCaminhoSelecionado(caminho);
    setConfirmarExclusao(false);
    setCopiado(false);
    if (!entradaZip) setBuscaZip('');
    setCarregandoPreview(true);
    setAviso(null);
    try {
      const res = await api.visualizarArquivoTcc(caminho, entradaZip);
      setPreview(res);
    } catch (err) {
      setPreview(null);
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível visualizar este arquivo.',
      });
    } finally {
      setCarregandoPreview(false);
    }
  };

  const handleExcluirSelecionado = async () => {
    if (!preview || preview.protegido) return;
    setExcluindo(true);
    setAviso(null);
    try {
      const res = await api.excluirArquivoTcc(preview.caminho_relativo);
      setAviso({ tipo: 'ok', texto: res.mensagem });
      setPreview(null);
      setCaminhoSelecionado(null);
      setConfirmarExclusao(false);
      await carregarArvore(true);
      if (onArquivoExcluido) {
        await onArquivoExcluido();
      }
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Falha ao excluir o arquivo selecionado.',
      });
    } finally {
      setExcluindo(false);
    }
  };

  const handleCopiarConteudo = async () => {
    if (!preview?.conteudo_texto) return;
    try {
      await navigator.clipboard.writeText(preview.conteudo_texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Ignorar se área de transferência indisponível
    }
  };

  const nosFiltrados = useMemo(
    () => filtrarArvore(arvore?.filhos || [], buscaArvore),
    [arvore?.filhos, buscaArvore],
  );

  const entradasZip = preview?.entradas_zip;
  const entradasZipFiltradas = useMemo(() => {
    if (!entradasZip) return [];
    const q = buscaZip.trim().toLowerCase();
    if (!q) return entradasZip;
    return entradasZip.filter((e) => e.caminho.toLowerCase().includes(q));
  }, [entradasZip, buscaZip]);

  const togglePasta = (caminho: string) => {
    setPastasAbertas((prev) => ({ ...prev, [caminho]: !prev[caminho] }));
  };

  const renderNo = (no: NoArvoreArquivo, nivel: number): React.ReactNode => {
    if (no.tipo === 'pasta') {
      const aberta = buscaArvore.trim().length > 0 || Boolean(pastasAbertas[no.caminho_relativo]);
      const ehRevisados = no.nome.toLowerCase() === 'revisados';
      return (
        <div key={no.caminho_relativo}>
          <button
            type="button"
            onClick={() => togglePasta(no.caminho_relativo)}
            style={{ paddingLeft: `${8 + nivel * 14}px` }}
            className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-xs transition hover:bg-slate-100 cursor-pointer ${
              ehRevisados ? 'font-extrabold text-emerald-900' : 'font-bold text-slate-800'
            }`}
          >
            {aberta ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            )}
            {aberta ? (
              <FolderOpen
                className={`h-4 w-4 shrink-0 ${
                  ehRevisados ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
            ) : (
              <Folder
                className={`h-4 w-4 shrink-0 ${
                  ehRevisados ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
            )}
            <span className="truncate flex-1" title={no.nome}>
              {no.nome}
            </span>
            <span className="shrink-0 font-mono text-[10px] font-normal text-slate-400">
              {no.filhos.length}
            </span>
          </button>
          {aberta && (
            <div className="space-y-0.5">
              {no.filhos.length === 0 ? (
                <p
                  style={{ paddingLeft: `${26 + nivel * 14}px` }}
                  className="py-1 text-[11px] italic text-slate-400"
                >
                  (Pasta vazia)
                </p>
              ) : (
                no.filhos.map((filho) => renderNo(filho, nivel + 1))
              )}
            </div>
          )}
        </div>
      );
    }

    const selecionado = caminhoSelecionado === no.caminho_relativo;
    return (
      <button
        key={no.caminho_relativo}
        type="button"
        onClick={() => void abrirArquivo(no.caminho_relativo)}
        style={{ paddingLeft: `${24 + nivel * 14}px` }}
        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-xs transition cursor-pointer ${
          selecionado
            ? 'bg-red-50 font-bold text-red-900 ring-1 ring-red-300'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {iconePorExtensao(no.extensao)}
        <span className="truncate flex-1" title={no.nome}>
          {no.nome}
        </span>
        {no.protegido && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
        <span className="shrink-0 font-mono text-[10px] text-slate-400">
          {formatarBytes(no.tamanho_bytes)}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Gestão de Arquivos */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Gestão de Arquivos — Pasta Oficial de Entregas (./tcc)
            </h2>
            <p className="text-xs text-slate-500">
              {arvore ? (
                <>
                  <strong>{arvore.total_pastas}</strong> pasta(s) •{' '}
                  <strong>{arvore.total_arquivos}</strong> arquivo(s) •{' '}
                  <strong>{formatarBytes(arvore.tamanho_total_bytes)}</strong> totais no servidor
                </>
              ) : (
                'Navegue pela árvore de entregas dos alunos à esquerda para inspecionar o conteúdo à direita.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={carregandoArvore}
          onClick={() => void carregarArvore(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${carregandoArvore ? 'animate-spin' : ''}`} />
          Atualizar Árvore
        </button>
      </div>

      {aviso && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
            aviso.tipo === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          {aviso.tipo === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          )}
          <span className="font-semibold">{aviso.texto}</span>
        </div>
      )}

      {/* Layout Split-Pane: Árvore à esquerda (4 cols) + Visualizador à direita (8 cols) */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Coluna Esquerda: Árvore de Diretórios e Arquivos */}
        <aside className="flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs lg:col-span-4">
          <div className="border-b border-slate-200 bg-slate-50 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={buscaArvore}
                onChange={(e) => setBuscaArvore(e.target.value)}
                placeholder="Filtrar pasta, grupo ou arquivo..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
            {carregandoArvore ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-7 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : nosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhum arquivo ou pasta encontrado.
              </div>
            ) : (
              nosFiltrados.map((no) => renderNo(no, 0))
            )}
          </div>
        </aside>

        {/* Coluna Direita: Visualizador de Conteúdo */}
        <section className="flex max-h-[75vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs lg:col-span-8">
          {carregandoPreview ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-xs text-slate-500">
              <RefreshCw className="h-7 w-7 animate-spin text-red-600" />
              <p className="mt-3 font-semibold">Carregando conteúdo do arquivo...</p>
            </div>
          ) : !preview ? (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-slate-500">
              <FolderOpen className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-extrabold text-slate-800">
                Selecione um arquivo na árvore à esquerda
              </h3>
              <p className="mt-1 max-w-md text-xs leading-relaxed">
                Você pode ler scripts <code>.sql</code>, códigos-fonte, <code>links.txt</code>, abrir
                PDFs, visualizar imagens, inspecionar texto extraído de <code>.docx/.pptx</code> e
                navegar por dentro dos pacotes <code>.zip</code> entregues pelos grupos.
              </p>
            </div>
          ) : (
            <>
              {/* Barra Superior do Arquivo Selecionado */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {iconePorExtensao(preview.extensao)}
                    <h3 className="truncate text-sm font-extrabold text-slate-900">
                      {preview.nome}
                    </h3>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {preview.tipo_detectado}
                    </span>
                    {preview.protegido && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        <Lock className="h-3 w-3" />
                        Oficial Protegido
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    ./tcc/{preview.caminho_relativo} • {formatarBytes(preview.tamanho_bytes)} •{' '}
                    {new Date(preview.modificado_em).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {preview.conteudo_texto && (
                    <button
                      type="button"
                      onClick={() => void handleCopiarConteudo()}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {copiado ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </>
                      )}
                    </button>
                  )}

                  <a
                    href={api.getRawArquivoTccUrl(preview.caminho_relativo, true)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </a>

                  {!preview.protegido && !confirmarExclusao && (
                    <button
                      type="button"
                      onClick={() => setConfirmarExclusao(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmação Inline de Exclusão */}
              {confirmarExclusao && !preview.protegido && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-5 py-2.5 text-xs text-red-950">
                  <span className="font-bold">
                    Confirmar exclusão definitiva de <code>{preview.nome}</code>?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={excluindo}
                      onClick={() => void handleExcluirSelecionado()}
                      className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                    >
                      {excluindo ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarExclusao(false)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Área de Renderização por Tipo */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {preview.entrada_zip_atual && (
                  <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-950">
                    <span>
                      Visualizando arquivo interno do ZIP:{' '}
                      <strong className="font-mono">{preview.entrada_zip_atual}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => void abrirArquivo(preview.caminho_relativo, null)}
                      className="rounded border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    >
                      ← Voltar à lista do ZIP
                    </button>
                  </div>
                )}

                {preview.modo === 'texto' || preview.modo === 'documento_extraido' ? (
                  <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
                    {preview.modo === 'documento_extraido' && (
                      <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 font-sans text-[11px] text-amber-200">
                        Texto extraído automaticamente do arquivo <strong>{preview.subtipo}</strong>{' '}
                        para leitura rápida. Para formatação visual completa, utilize o botão Baixar.
                      </div>
                    )}
                    {preview.truncado && (
                      <div className="mb-3 rounded-lg border border-sky-500/40 bg-sky-950/50 px-3 py-2 font-sans text-[11px] text-sky-200">
                        Visualização limitada aos primeiros 250 KB do arquivo. Use Baixar para obter o
                        arquivo completo.
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap break-words">
                      {preview.conteudo_texto || '(Arquivo vazio)'}
                    </pre>
                  </div>
                ) : preview.modo === 'pdf' ? (
                  <iframe
                    src={api.getRawArquivoTccUrl(preview.caminho_relativo, false)}
                    title={preview.nome}
                    className="h-full min-h-[540px] w-full flex-1 border-0 bg-slate-100"
                  />
                ) : preview.modo === 'imagem' ? (
                  <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-6">
                    <img
                      src={api.getRawArquivoTccUrl(preview.caminho_relativo, false)}
                      alt={preview.nome}
                      className="max-h-full max-w-full rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
                    />
                  </div>
                ) : preview.modo === 'zip' ? (
                  <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                        <Archive className="h-4 w-4 text-amber-600" />
                        Conteúdo do Pacote ZIP ({preview.entradas_zip.length} de{' '}
                        {preview.total_entradas_zip} entradas exibidas)
                      </span>
                      <input
                        type="text"
                        value={buscaZip}
                        onChange={(e) => setBuscaZip(e.target.value)}
                        placeholder="Filtrar caminho dentro do .zip..."
                        className="w-64 rounded-lg border border-slate-300 px-3 py-1 text-xs focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200">
                      <ul className="divide-y divide-slate-100 text-xs">
                        {entradasZipFiltradas.map((item) => (
                          <li
                            key={item.caminho}
                            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {iconePorExtensao(item.extensao)}
                              <span className="truncate font-mono text-[11px] text-slate-800">
                                {item.caminho}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                {formatarBytes(item.tamanho_bytes)}
                              </span>
                              {item.visualizavel && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void abrirArquivo(preview.caminho_relativo, item.caminho)
                                  }
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  Ver Código
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-xs text-slate-600">
                    <FileText className="h-10 w-10 text-slate-400" />
                    <p className="mt-3 font-bold text-slate-800">
                      Pré-visualização não suportada diretamente para o formato{' '}
                      <code>{preview.extensao || 'binário'}</code>.
                    </p>
                    {preview.conteudo_texto && (
                      <p className="mt-1 max-w-md text-slate-500">{preview.conteudo_texto}</p>
                    )}
                    <a
                      href={api.getRawArquivoTccUrl(preview.caminho_relativo, true)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Arquivo
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
export default FileExplorerView;
