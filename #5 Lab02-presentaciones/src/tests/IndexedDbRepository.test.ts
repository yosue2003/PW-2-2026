import { IndexedDbProjectRepository } from '../infrastructure/IndexedDbProjectRepository'
import type { Project } from '../models/Project'

const makeProject = (id: string, name: string): Project => ({
  id,
  name,
  author: 'Ada Lovelace',
  topic: 'Computación',
  slides: [],
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
})

let databaseSequence = 0

describe('IndexedDbProjectRepository', () => {
  let repository: IndexedDbProjectRepository
  let databaseName: string

  beforeEach(() => {
    databaseName = `projects-test-${++databaseSequence}`
    repository = new IndexedDbProjectRepository(databaseName)
  })

  afterEach(async () => {
    await repository?.close()
    indexedDB.deleteDatabase(databaseName)
  })

  it('initializes the database and returns an empty project list', async () => {
    await expect(repository.getAll()).resolves.toEqual([])
  })

  it('saves and reads a project by id', async () => {
    const project = makeProject('project-1', 'Mi primera presentación')

    await repository.save(project)

    await expect(repository.getById(project.id)).resolves.toEqual(project)
    await expect(repository.getAll()).resolves.toEqual([project])
  })

  it('updates a saved project and deletes it', async () => {
    const project = makeProject('project-1', 'Borrador')
    await repository.save(project)
    await repository.save({ ...project, name: 'Versión final' })

    await expect(repository.getAll()).resolves.toEqual([
      { ...project, name: 'Versión final' },
    ])

    await repository.delete(project.id)
    await expect(repository.getById(project.id)).resolves.toBeUndefined()
  })
})
