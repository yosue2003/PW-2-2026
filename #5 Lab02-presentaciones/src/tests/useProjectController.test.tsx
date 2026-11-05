import { act, renderHook, waitFor } from '@testing-library/react'
import { useProjectController } from '../controllers/useProjectController.ts'
import type { IProjectRepository } from '../models/ports/IProjectRepository.ts'
import type { Project } from '../models/Project.ts'

function makeRepository(initialProjects: Project[] = []): IProjectRepository {
  let projects = [...initialProjects]
  return {
    getAll: jest.fn(async () => [...projects]),
    getById: jest.fn(async (id: string) => projects.find((project) => project.id === id)),
    save: jest.fn(async (project: Project) => {
      projects = [...projects.filter((item) => item.id !== project.id), project]
    }),
    delete: jest.fn(async (id: string) => {
      projects = projects.filter((project) => project.id !== id)
    }),
  }
}

describe('useProjectController', () => {
  // Comprueba que el hook carga los proyectos iniciales desde el repositorio recibido.
  it('loads projects from the injected repository', async () => {
    const savedProject: Project = {
      id: 'p-1', name: 'Ciencias', author: 'Ada', topic: 'Órbitas', slides: [],
      createdAt: '2026-10-29T12:00:00.000Z', updatedAt: '2026-10-29T12:00:00.000Z',
    }
    const repository = makeRepository([savedProject])
    const { result } = renderHook(() => useProjectController(repository))

    await waitFor(() => expect(result.current.projects).toEqual([savedProject]))
    expect(repository.getAll).toHaveBeenCalledTimes(1)
  })

  // Comprueba que un fallo inicial termina la carga y queda disponible como error.
  it('clears loading and exposes a repository error when the initial load fails', async () => {
    const repository = makeRepository()
    jest.mocked(repository.getAll).mockRejectedValueOnce(new Error('falló la carga'))
    const { result } = renderHook(() => useProjectController(repository))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('falló la carga')
    expect(result.current.projects).toEqual([])
  })

  // Comprueba que refrescar vuelve a consultar los datos y limpia un error anterior.
  it('refreshes the list and clears a previous error', async () => {
    const repository = makeRepository()
    const { result } = renderHook(() => useProjectController(repository))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const project: Project = {
      id: 'p-2', name: 'Arte', author: 'Ada', topic: 'Color', slides: [],
      createdAt: '2026-10-29T12:00:00.000Z', updatedAt: '2026-10-29T12:00:00.000Z',
    }
    await act(async () => repository.save(project))

    await act(async () => result.current.refreshProjects())

    expect(result.current.projects).toEqual([project])
    expect(result.current.error).toBeNull()
    expect(repository.getAll).toHaveBeenCalledTimes(2)
  })

  // Comprueba el flujo exitoso de creación y eliminación a través del repositorio.
  it('creates and removes projects through the repository', async () => {
    const repository = makeRepository()
    const { result } = renderHook(() => useProjectController(repository))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let created: Project
    await act(async () => {
      created = await result.current.createProject({
        name: 'Historia', author: 'Ada', topic: 'Roma',
      })
    })

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Historia', author: 'Ada', topic: 'Roma', slides: [],
    }))
    expect(result.current.projects).toEqual([created!])

    await act(async () => result.current.deleteProject(created!.id))
    expect(repository.delete).toHaveBeenCalledWith(created!.id)
    expect(result.current.projects).toEqual([])
  })

  // Comprueba que los espacios al inicio y al final se quitan antes de guardar.
  it('trims project fields before saving', async () => {
    const repository = makeRepository()
    const { result } = renderHook(() => useProjectController(repository))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.createProject({
      name: '  Historia  ', author: ' Ada ', topic: ' Roma  ',
    }))

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Historia', author: 'Ada', topic: 'Roma',
    }))
  })

  // Comprueba que un error de guardado se informa y el proyecto no entra en la lista.
  it('exposes creation errors and does not add an unsaved project', async () => {
    const repository = makeRepository()
    const failure = new Error('no se pudo guardar')
    jest.mocked(repository.save).mockRejectedValueOnce(failure)
    const { result } = renderHook(() => useProjectController(repository))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.createProject({ name: 'X', author: 'Y', topic: 'Z' }))
        .rejects.toBe(failure)
    })

    expect(result.current.projects).toEqual([])
    expect(result.current.error).toBe(failure.message)
  })

  // Comprueba que un error al eliminar se informa y el proyecto sigue en la lista.
  it('exposes deletion errors and keeps the project in the list', async () => {
    const project: Project = {
      id: 'p-3', name: 'Música', author: 'Ada', topic: 'Ritmo', slides: [],
      createdAt: '2026-10-29T12:00:00.000Z', updatedAt: '2026-10-29T12:00:00.000Z',
    }
    const repository = makeRepository([project])
    const failure = new Error('no se pudo eliminar')
    jest.mocked(repository.delete).mockRejectedValueOnce(failure)
    const { result } = renderHook(() => useProjectController(repository))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.deleteProject(project.id)).rejects.toBe(failure)
    })

    expect(result.current.projects).toEqual([project])
    expect(result.current.error).toBe(failure.message)
  })
})
