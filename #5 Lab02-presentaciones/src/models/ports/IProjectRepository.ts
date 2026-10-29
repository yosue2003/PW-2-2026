import type { Project } from '../Project'

/** Contrato de persistencia; la vista no depende de IndexedDB ni de HTTP. */
export interface IProjectRepository {
  getAll(): Promise<Project[]>
  getById(id: string): Promise<Project | undefined>
  save(project: Project): Promise<void>
  delete(id: string): Promise<void>
}
