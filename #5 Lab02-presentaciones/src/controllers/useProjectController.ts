import { useCallback, useEffect, useState } from 'react'
import type { Project } from '../models/Project.ts'
import type { IProjectRepository } from '../models/ports/IProjectRepository.ts'

export interface NewProject {
  name: string
  author: string
  topic: string
}

export function useProjectController(repository: IProjectRepository) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjects(await repository.getAll())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los proyectos')
    } finally {
      setLoading(false)
    }
  }, [repository])

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const createProject = useCallback(async (input: NewProject): Promise<Project> => {
    const now = new Date().toISOString()
    const project: Project = {
      id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
      name: input.name.trim(),
      author: input.author.trim(),
      topic: input.topic.trim(),
      slides: [],
      createdAt: now,
      updatedAt: now,
    }
    setError(null)
    try {
      await repository.save(project)
      setProjects((current) => [...current, project])
      return project
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el proyecto')
      throw cause
    }
  }, [repository])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setError(null)
    try {
      await repository.delete(id)
      setProjects((current) => current.filter((project) => project.id !== id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el proyecto')
      throw cause
    }
  }, [repository])

  return { projects, loading, error, refreshProjects, createProject, deleteProject }
}
