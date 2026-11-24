import { useCallback } from 'react'
import type { IProjectRepository } from '../models/ports/IProjectRepository.ts'
import type { Project } from '../models/Project.ts'
import type { Slide, SlideType } from '../models/Slide.ts'

const now = () => new Date().toISOString()

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `slide-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Keeps one cover at the front and development slides after it. */
export function normalizeSlides(slides: Slide[]): Slide[] {
  return slides.map((slide, index) => ({
    ...slide,
    type: (index === 0 ? 'title' : 'content') as SlideType,
  }))
}

async function requireProject(repository: IProjectRepository, projectId: string): Promise<Project> {
  const project = await repository.getById(projectId)
  if (!project) throw new Error('No se encontró el proyecto seleccionado.')
  return project
}

async function saveSlides(repository: IProjectRepository, project: Project, slides: Slide[]) {
  await repository.save({
    ...project,
    slides: normalizeSlides(slides),
    updatedAt: now(),
  })
}

export function useSlideController(repository: IProjectRepository) {
  const addSlide = useCallback(async (projectId: string, input: Slide): Promise<Slide> => {
    const project = await requireProject(repository, projectId)
    const slide: Slide = {
      ...input,
      type: project.slides.length === 0 ? 'title' : 'content',
      createdAt: input.createdAt || now(),
      updatedAt: now(),
    }
    await saveSlides(repository, project, [...project.slides, slide])
    return { ...slide, type: project.slides.length === 0 ? 'title' : 'content' }
  }, [repository])

  const saveSlide = useCallback(async (projectId: string, slide: Slide): Promise<Slide> => {
    const project = await requireProject(repository, projectId)
    if (!project.slides.some((item) => item.id === slide.id)) {
      throw new Error('No se encontró la diapositiva que intentas guardar.')
    }
    const normalized = normalizeSlides(project.slides.map((item) => (
      item.id === slide.id ? { ...slide, updatedAt: now() } : item
    )))
    await saveSlides(repository, project, normalized)
    return normalized.find((item) => item.id === slide.id)!
  }, [repository])

  const deleteSlide = useCallback(async (projectId: string, slideId: string): Promise<Slide[]> => {
    const project = await requireProject(repository, projectId)
    if (!project.slides.some((slide) => slide.id === slideId)) {
      throw new Error('No se encontró la diapositiva que intentas eliminar.')
    }
    const slides = normalizeSlides(project.slides.filter((slide) => slide.id !== slideId))
    await saveSlides(repository, project, slides)
    return slides
  }, [repository])

  const copySlideToProject = useCallback(async (
    sourceProjectId: string,
    slideId: string,
    destinationProjectId: string,
  ): Promise<Slide> => {
    if (sourceProjectId === destinationProjectId) {
      throw new Error('Elige un proyecto distinto para copiar la diapositiva.')
    }
    const [source, destination] = await Promise.all([
      requireProject(repository, sourceProjectId),
      requireProject(repository, destinationProjectId),
    ])
    const sourceSlide = source.slides.find((slide) => slide.id === slideId)
    if (!sourceSlide) throw new Error('No se encontró la diapositiva que intentas copiar.')

    const copy: Slide = {
      ...sourceSlide,
      id: makeId(),
      type: destination.slides.length === 0 ? 'title' : 'content',
      createdAt: now(),
      updatedAt: now(),
    }
    await saveSlides(repository, destination, [...destination.slides, copy])
    return copy
  }, [repository])

  const moveSlideToProject = useCallback(async (
    sourceProjectId: string,
    slideId: string,
    destinationProjectId: string,
  ): Promise<Slide> => {
    if (sourceProjectId === destinationProjectId) {
      throw new Error('Elige un proyecto distinto para trasladar la diapositiva.')
    }
    const [source, destination] = await Promise.all([
      requireProject(repository, sourceProjectId),
      requireProject(repository, destinationProjectId),
    ])
    const sourceSlide = source.slides.find((slide) => slide.id === slideId)
    if (!sourceSlide) throw new Error('No se encontró la diapositiva que intentas trasladar.')

    const movedSlide: Slide = {
      ...sourceSlide,
      id: destination.slides.some((slide) => slide.id === sourceSlide.id) ? makeId() : sourceSlide.id,
      type: destination.slides.length === 0 ? 'title' : 'content',
      updatedAt: now(),
    }
    const destinationSlides = normalizeSlides([...destination.slides, movedSlide])
    const sourceSlides = normalizeSlides(source.slides.filter((slide) => slide.id !== slideId))

    // Save the destination first. If removing the source fails, restore its previous state.
    await saveSlides(repository, destination, destinationSlides)
    try {
      await saveSlides(repository, source, sourceSlides)
    } catch (error) {
      await repository.save(destination).catch(() => undefined)
      throw error
    }
    return destinationSlides.find((slide) => slide.id === movedSlide.id)!
  }, [repository])

  return { addSlide, saveSlide, deleteSlide, copySlideToProject, moveSlideToProject }
}
