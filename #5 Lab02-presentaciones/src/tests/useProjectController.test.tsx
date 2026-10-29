import { act, renderHook, waitFor } from '@testing-library/react'
import { useProjectController } from '../controllers/useProjectController'
import type { IProjectRepository } from '../models/ports/IProjectRepository'
import type { Project } from '../models/Project'

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
})
