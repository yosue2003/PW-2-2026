import type { Project } from '../models/Project'
import type { IProjectRepository } from '../models/ports/IProjectRepository'

/** Placeholder for a future REST adapter; no HTTP service is used in this lab phase. */
export class HttpMicroserviceRepository implements IProjectRepository {
  async getAll(): Promise<Project[]> {
    throw new Error('HTTP microservice repository is not implemented yet')
  }

  async getById(_id: string): Promise<Project | undefined> {
    throw new Error('HTTP microservice repository is not implemented yet')
  }

  async save(_project: Project): Promise<void> {
    throw new Error('HTTP microservice repository is not implemented yet')
  }

  async delete(_id: string): Promise<void> {
    throw new Error('HTTP microservice repository is not implemented yet')
  }
}
