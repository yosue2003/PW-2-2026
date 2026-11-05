import { IndexedDbProjectRepository } from '../infrastructure/IndexedDbProjectRepository.ts'
import type { Project } from '../models/Project.ts'

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

  // Comprueba que el repositorio crea la base y comienza sin proyectos.
  it('initializes the database and returns an empty project list', async () => {
    await expect(repository.getAll()).resolves.toEqual([])
  })

  // Comprueba que un proyecto guardado se puede recuperar por ID y aparece en el listado.
  it('saves and reads a project by id', async () => {
    const project = makeProject('project-1', 'Mi primera presentación')

    await repository.save(project)

    await expect(repository.getById(project.id)).resolves.toEqual(project)
    await expect(repository.getAll()).resolves.toEqual([project])
  })

  // Comprueba que buscar un ID inexistente devuelve undefined.
  it('returns undefined when a project does not exist', async () => {
    await expect(repository.getById('missing')).resolves.toBeUndefined()
  })

  // Comprueba que guardar con el mismo ID actualiza y que luego se puede eliminar.
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

  // Comprueba que IndexedDB conserva los datos después de cerrar y reabrir la conexión.
  it('keeps projects available after closing and reopening the repository', async () => {
    const project = makeProject('project-persistent', 'Persistente')
    await repository.save(project)
    await repository.close()

    const reopenedRepository = new IndexedDbProjectRepository(databaseName)
    await expect(reopenedRepository.getById(project.id)).resolves.toEqual(project)
    await reopenedRepository.close()
  })
})
