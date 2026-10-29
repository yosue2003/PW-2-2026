import type { Project } from '../Project'

export type ExportFormat = 'html' | 'pdf' | 'pptx' | 'odp'

/** Contrato para adaptadores de exportación intercambiables. */
export interface IExporter {
  readonly format: ExportFormat
  export(project: Project): Promise<Blob>
}
