import { IndexedDbProjectRepository } from './IndexedDbProjectRepository.ts'

/** Shared browser repository used by the application. */
export const projectRepository = new IndexedDbProjectRepository()
