/**
 * Controle de Versão Oficial — SENAI Ourinhos - Central de Agentes Inteligentes (Avaliador TCC PSOF3)
 */
export const APP_VERSION = '1.0.0';

export const APP_RELEASE_DATE = '2026-11-14';

export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const VERSION_HISTORY: ReleaseNote[] = [
  {
    version: '1.0.0',
    date: '14/11/2026',
    highlights: [
      'Lançamento oficial do Agente Avaliador de Bancas TCC (PSOF3) — SENAI Ourinhos (Unidade 7.94).',
      'Leitura automática das 25 Bancas do Cronograma Oficial (Turmas I2DEV-A e I2DEV-B) e auditoria profunda da pasta ./tcc.',
      'Validação determinística do padrão CTDS-2026-02, Monografia ABNT (.docx/.pdf), Script SQL com contagem de registros por tabela (>= 20/tabela), Código-Fonte (.zip), Slides (.pptx), GitHub API e Deploy Online.',
      'Ficha MSEP Interativa (4 Pilares = 100%), gerador de Perguntas de Arguição Individual, sincronização com Firebase e exportação em PDF Oficial, Dossiê Markdown/PDF e Planilha Consolidada XLSX.',
    ],
  },
];
