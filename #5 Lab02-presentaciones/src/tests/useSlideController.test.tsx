import { act, renderHook, waitFor } from '@testing-library/react'
import { useSlideController } from '../controllers/useSlideController.ts'
import type { IProjectRepository } from '../models/ports/IProjectRepository.ts'
import type { Project } from '../models/Project.ts'
import type { Slide } from '../models/Slide.ts'

const date = '2026-11-17T12:00:00.000Z'
const cover: Slide = {
  id: 'cover', type: 'title', title: 'Portada', body: '', layout: 'text-only',
  author: 'Ada', topic: 'Ideas', createdAt: date, updatedAt: date,
}
const development: Slide = {
  ...cover, id: 'development', type: 'content', title: 'Desarrollo',
}

function project(id: string, slides: Slide[] = []): Project {
  return {
    id, name: id, author: 'Ada', topic: 'Ideas', slides,
    createdAt: date, updatedAt: date,
  }
}

function makeRepository(initial: Project[]): IProjectRepository {
  let projects = [...initial]
  return {
    getAll: jest.fn(async () => [...projects]),
    getById: jest.fn(async (id: string) => projects.find((item) => item.id === id)),
    save: jest.fn(async (saved: Project) => {
      projects = [...projects.filter((item) => item.id !== saved.id), saved]
    }),
    delete: jest.fn(async (id: string) => {
      projects = projects.filter((item) => item.id !== id)
    }),
  }
}

describe('useSlideController', () => {
  it('keeps a cover first and creates development slides after it', async () => {
    const repository = makeRepository([project('deck')])
    const { result } = renderHook(() => useSlideController(repository))

    await act(async () => result.current.addSlide('deck', { ...development, id: 'first', type: 'content' }))
    await act(async () => result.current.addSlide('deck', { ...cover, id: 'second', type: 'title' }))

    const saved = await repository.getById('deck')
    expect(saved?.slides.map((slide) => slide.type)).toEqual(['title', 'content'])
    expect(saved?.slides.map((slide) => slide.id)).toEqual(['first', 'second'])
  })

  it('copies a slide with a new id and leaves the source unchanged', async () => {
    const repository = makeRepository([project('source', [cover, development]), project('destination')])
    const { result } = renderHook(() => useSlideController(repository))
    let copied: Slide | undefined

    await act(async () => {
      copied = await result.current.copySlideToProject('source', 'development', 'destination')
    })

    expect(copied?.id).not.toBe('development')
    expect(copied?.type).toBe('title')
    expect((await repository.getById('source'))?.slides).toHaveLength(2)
    expect((await repository.getById('destination'))?.slides).toEqual([copied])
  })

  it('moves a slide and promotes the next source slide to cover', async () => {
    const repository = makeRepository([project('source', [cover, development]), project('destination', [cover])])
    const { result } = renderHook(() => useSlideController(repository))

    await act(async () => result.current.moveSlideToProject('source', 'cover', 'destination'))

    const source = await repository.getById('source')
    const destination = await repository.getById('destination')
    expect(source?.slides).toHaveLength(1)
    expect(source?.slides[0]).toMatchObject({ id: 'development', type: 'title' })
    expect(destination?.slides.map((slide) => slide.type)).toEqual(['title', 'content'])
    expect(new Set(destination?.slides.map((slide) => slide.id)).size).toBe(2)
  })

  it('deletes the selected slide and preserves the first-slide rule', async () => {
    const repository = makeRepository([project('deck', [cover, development])])
    const { result } = renderHook(() => useSlideController(repository))
    let slides: Slide[] = []

    await act(async () => {
      slides = await result.current.deleteSlide('deck', 'cover')
    })

    expect(slides).toMatchObject([{ id: 'development', type: 'title' }])
    expect((await repository.getById('deck'))?.slides).toEqual(slides)
  })

  it('reports an error for a missing destination project', async () => {
    const repository = makeRepository([project('source', [cover])])
    const { result } = renderHook(() => useSlideController(repository))
    await waitFor(() => expect(result.current).toBeDefined())

    await expect(result.current.copySlideToProject('source', 'cover', 'missing'))
      .rejects.toThrow('No se encontró el proyecto seleccionado')
  })
})
