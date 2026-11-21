import type {
  AgentStatus,
  AgentSummary,
  ArvoreArquivosResponse,
  AvaliacaoGrupo,
  ConfigEnv,
  ExecucaoHistorico,
  ListaArquivosEntregaResponse,
  ListaArquivosRevisadosResponse,
  NotaIndividualIntegrante,
  PreviewArquivoResponse,
  RegistroHistoricoPendencia,
  RegrasOficiaisResponse,
  ResultadoFinalTipo,
  RevisaoPosBanca,
  RubricaItemAvaliacao,
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : window.location.origin);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(erro.detail || 'Erro na requisição à API');
  }
  return resp.json() as Promise<T>;
}

export const api = {
  getAgents: () => request<{ agentes: AgentSummary[] }>('/api/agents'),

  getRegras: () => request<RegrasOficiaisResponse>('/api/regras'),

  getRegraPdfUrl: (nomeArquivo: string) =>
    `${API_BASE}/api/regras/pdf/${encodeURIComponent(nomeArquivo)}`,

  getBancas: (turma?: string) =>
    request<{
      total: number;
      entregues: number;
      pendentes: number;
      auditados: number;
      sincronizados_firebase: number;
      bancas: AvaliacaoGrupo[];
    }>(`/api/bancas${turma && turma !== 'Todas' ? `?turma=${encodeURIComponent(turma)}` : ''}`),

  getBancaDetalhe: (grupoId: string) =>
    request<AvaliacaoGrupo>(`/api/bancas/${encodeURIComponent(grupoId)}`),

  auditarBancas: (payload: {
    grupo_ids?: string[] | null;
    turma?: string | null;
    forcar_reauditoria?: boolean;
    sincronizar_firebase?: boolean;
  }) =>
    request<{ mensagem: string; execucao_id: string }>('/api/bancas/auditar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  salvarAvaliacao: (
    grupoId: string,
    payload: {
      avaliador?: string;
      rubricas: RubricaItemAvaliacao[];
      integrantes_notas: NotaIndividualIntegrante[];
      parecer_tecnico: string;
      pontos_fortes?: string[];
      pontos_atencao?: string[];
      status_liberacao_manual?: ResultadoFinalTipo | null;
      sincronizar_firebase?: boolean;
    },
  ) =>
    request<AvaliacaoGrupo>(`/api/bancas/${encodeURIComponent(grupoId)}/avaliacao`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  sincronizarGrupoFirebase: (grupoId: string) =>
    request<{ ok: boolean; mensagem: string; firebase_sync_em: string | null }>(
      `/api/bancas/${encodeURIComponent(grupoId)}/firebase-sync`,
      { method: 'POST' },
    ),

  sincronizarTodosFirebase: () =>
    request<{ ok: boolean; sincronizados: number; erros: string[]; mensagem: string }>(
      '/api/firebase/sync-all',
      { method: 'POST' },
    ),

  exportarFichaPdf: (grupoId: string) =>
    request<{ arquivo: string; caminho: string; url_download: string; mensagem: string }>(
      `/api/bancas/${encodeURIComponent(grupoId)}/exportar/ficha-pdf`,
      { method: 'POST' },
    ),

  exportarDossie: (grupoId: string) =>
    request<{
      arquivo_pdf: string;
      arquivo_md: string;
      url_pdf: string;
      url_md: string;
      mensagem: string;
    }>(`/api/bancas/${encodeURIComponent(grupoId)}/exportar/dossie`, {
      method: 'POST',
    }),

  exportarConsolidadoXlsx: (turma?: string) =>
    request<{ arquivo: string; caminho: string; url_download: string; mensagem: string }>(
      `/api/exportar/consolidado-xlsx${
        turma && turma !== 'Todas' ? `?turma=${encodeURIComponent(turma)}` : ''
      }`,
      { method: 'POST' },
    ),

  getConfig: () => request<ConfigEnv>('/api/config'),

  saveConfig: (cfg: ConfigEnv) =>
    request<ConfigEnv>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(cfg),
    }),

  getStatus: () => request<AgentStatus>('/api/agent/status'),

  getHistory: () => request<{ historico: ExecucaoHistorico[] }>('/api/history'),

  openFolder: (qual: 'relatorios' | 'tcc' = 'relatorios') =>
    request<{ pasta: string; mensagem: string }>(`/api/reports/open-folder?qual=${qual}`, {
      method: 'POST',
    }),

  getDownloadUrl: (filename: string) =>
    `${API_BASE}/api/reports/download/${encodeURIComponent(filename)}`,

  listarArquivosGrupo: (grupoId: string) =>
    request<ListaArquivosEntregaResponse>(
      `/api/bancas/${encodeURIComponent(grupoId)}/arquivos`,
    ),

  uploadArquivosGrupo: async (grupoId: string, arquivos: File[]) => {
    const formData = new FormData();
    arquivos.forEach((arq) => {
      formData.append('arquivos', arq);
    });
    const resp = await fetch(
      `${API_BASE}/api/bancas/${encodeURIComponent(grupoId)}/arquivos`,
      {
        method: 'POST',
        body: formData,
      },
    );
    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(erro.detail || 'Erro ao enviar arquivos da entrega');
    }
    return resp.json() as Promise<{
      ok: boolean;
      mensagem: string;
      pasta_nome: string;
      enviados: string[];
      substituidos: string[];
      arquivos: ListaArquivosEntregaResponse['arquivos'];
      banca: AvaliacaoGrupo;
    }>;
  },

  excluirArquivoGrupo: (grupoId: string, nomeArquivo: string) =>
    request<{
      ok: boolean;
      mensagem: string;
      pasta_vazia: boolean;
      arquivos: ListaArquivosEntregaResponse['arquivos'];
      banca: AvaliacaoGrupo;
    }>(
      `/api/bancas/${encodeURIComponent(grupoId)}/arquivos/${encodeURIComponent(nomeArquivo)}`,
      { method: 'DELETE' },
    ),

  excluirTodosArquivosGrupo: (grupoId: string) =>
    request<{
      ok: boolean;
      mensagem: string;
      removidos_qtd: number;
      arquivos: ListaArquivosEntregaResponse['arquivos'];
      banca: AvaliacaoGrupo;
    }>(`/api/bancas/${encodeURIComponent(grupoId)}/arquivos`, {
      method: 'DELETE',
    }),

  getDownloadArquivoGrupoUrl: (grupoId: string, nomeArquivo: string) =>
    `${API_BASE}/api/bancas/${encodeURIComponent(grupoId)}/arquivos/${encodeURIComponent(nomeArquivo)}`,

  reabrirBancaBackend: (grupoId: string) =>
    request<{ ok: boolean; mensagem: string; banca: AvaliacaoGrupo }>(
      `/api/bancas/${encodeURIComponent(grupoId)}/reabrir`,
      { method: 'POST' },
    ),

  listarArquivosRevisadosGrupo: (grupoId: string) =>
    request<ListaArquivosRevisadosResponse>(
      `/api/bancas/${encodeURIComponent(grupoId)}/revisados`,
    ),

  uploadArquivosRevisadosGrupo: async (grupoId: string, arquivos: File[]) => {
    const formData = new FormData();
    arquivos.forEach((arq) => {
      formData.append('arquivos', arq);
    });
    const resp = await fetch(
      `${API_BASE}/api/bancas/${encodeURIComponent(grupoId)}/revisados`,
      {
        method: 'POST',
        body: formData,
      },
    );
    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(erro.detail || 'Erro ao enviar arquivos revisados');
    }
    return resp.json() as Promise<{
      ok: boolean;
      mensagem: string;
      enviados: string[];
      substituidos: string[];
      arquivos: ListaArquivosRevisadosResponse['arquivos'];
      revisao_pos_banca: RevisaoPosBanca;
      banca: AvaliacaoGrupo;
    }>;
  },

  getDownloadArquivoRevisadoUrl: (grupoId: string, nomeArquivo: string) =>
    `${API_BASE}/api/bancas/${encodeURIComponent(grupoId)}/revisados/${encodeURIComponent(nomeArquivo)}`,

  excluirArquivoRevisadoGrupo: (grupoId: string, nomeArquivo: string) =>
    request<{
      ok: boolean;
      mensagem: string;
      arquivos: ListaArquivosRevisadosResponse['arquivos'];
      revisao_pos_banca: RevisaoPosBanca;
      banca: AvaliacaoGrupo;
    }>(
      `/api/bancas/${encodeURIComponent(grupoId)}/revisados/${encodeURIComponent(nomeArquivo)}`,
      { method: 'DELETE' },
    ),

  avaliarRevisaoPosBanca: (
    grupoId: string,
    payload: {
      aceito: boolean;
      observacao_professor: string;
      avaliador: string;
      novo_status_liberacao?: ResultadoFinalTipo | null;
      pendencias_cumpridas?: boolean;
    },
  ) =>
    request<{
      ok: boolean;
      mensagem: string;
      revisao_pos_banca: RevisaoPosBanca;
      banca: AvaliacaoGrupo;
    }>(`/api/bancas/${encodeURIComponent(grupoId)}/revisados/avaliar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  salvarPendenciasBackend: (
    grupoId: string,
    payload: {
      mensagem: string;
      origem: 'banca' | 'revisados';
      autor: string;
      possui_pendencias: boolean;
      pendencias_cumpridas: boolean;
      novo_status_liberacao?: ResultadoFinalTipo | null;
    },
  ) =>
    request<{
      ok: boolean;
      mensagem: string;
      historico_pendencias: RegistroHistoricoPendencia[];
      banca: AvaliacaoGrupo;
    }>(`/api/bancas/${encodeURIComponent(grupoId)}/pendencias`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getArvoreArquivos: () => request<ArvoreArquivosResponse>('/api/arquivos/arvore'),

  visualizarArquivoTcc: (caminho: string, entradaZip?: string | null) =>
    request<PreviewArquivoResponse>(
      `/api/arquivos/visualizar?caminho=${encodeURIComponent(caminho)}${
        entradaZip ? `&entrada_zip=${encodeURIComponent(entradaZip)}` : ''
      }`,
    ),

  getRawArquivoTccUrl: (caminho: string, download = false) =>
    `${API_BASE}/api/arquivos/raw?caminho=${encodeURIComponent(caminho)}${
      download ? '&download=true' : ''
    }`,

  excluirArquivoTcc: (caminho: string) =>
    request<{ ok: boolean; mensagem: string; grupo_id_afetado: string | null }>(
      `/api/arquivos?caminho=${encodeURIComponent(caminho)}`,
      { method: 'DELETE' },
    ),
};
