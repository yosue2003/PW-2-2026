import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { projectRepository } from '../infrastructure/projectRepository.ts'
import type { Slide } from '../models/Slide.ts'
import App from '../views/App.tsx'
import { HeaderFooter } from '../views/components/HeaderFooter.tsx'
import { SlideRenderer } from '../views/components/SlideRenderer.tsx'
import { PresentationMode } from '../views/PresentationMode.tsx'

const baseSlide: Slide = {
  id: 'slide-1',
  type: 'content',
  title: 'Ideas clave',
  body: 'Contenido de ejemplo',
  layout: 'text-only',
  imageUrl: 'https://example.com/imagen.jpg',
  author: 'Ada Lovelace',
  topic: 'Tecnología',
  createdAt: '2026-11-05T12:00:00.000Z',
  updatedAt: '2026-11-05T12:00:00.000Z',
}

describe('Fase 3: componentes, layouts y presentación', () => {
  beforeEach(async () => {
    const projects = await projectRepository.getAll()
    await Promise.all(projects.map((project) => projectRepository.delete(project.id)))
  })

  // Comprueba que SlideRenderer identifica una portada y muestra sus datos.
  it('renderiza la portada con título, autor, tema y número', () => {
    const titleSlide: Slide = { ...baseSlide, type: 'title', title: 'Mi presentación' }

    render(<SlideRenderer slide={titleSlide} slideNumber={1} totalSlides={3} />)

    expect(screen.getByRole('article', { name: 'Diapositiva de portada' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mi presentación' })).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Tecnología')).toBeInTheDocument()
    expect(screen.getByText('01', { selector: '.cover-index' })).toBeInTheDocument()
  })

  // Comprueba que el encabezado y pie muestran tema, autor, fecha y numeración.
  it('muestra los metadatos y la numeración en HeaderFooter', () => {
    render(<HeaderFooter slide={baseSlide} slideNumber={2} totalSlides={5} />)

    expect(screen.getByText('Tecnología')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    expect(screen.getByText(new Date(baseSlide.updatedAt).toLocaleDateString())).toBeInTheDocument()
  })

  // Comprueba que el layout de solo texto muestra el título y el cuerpo.
  it('selecciona el layout de solo texto', () => {
    render(<SlideRenderer slide={baseSlide} slideNumber={1} totalSlides={1} />)

    expect(screen.getByRole('heading', { name: 'Ideas clave' })).toBeInTheDocument()
    expect(screen.getByText('Contenido de ejemplo')).toBeInTheDocument()
    expect(document.querySelector('.text-only-layout')).toBeInTheDocument()
  })

  // Comprueba que el layout de solo imagen muestra la imagen y su texto alternativo.
  it('selecciona el layout de solo imagen', () => {
    render(<SlideRenderer slide={{ ...baseSlide, layout: 'image-only' }} slideNumber={1} totalSlides={1} />)

    expect(document.querySelector('.image-only-layout img')).toHaveAttribute('src', baseSlide.imageUrl)
    expect(screen.getByAltText('Ideas clave')).toBeInTheDocument()
  })

  // Comprueba que el layout combinado presenta el texto junto con la imagen.
  it('selecciona el layout de texto e imagen', () => {
    render(<SlideRenderer slide={{ ...baseSlide, layout: 'text-and-image' }} slideNumber={1} totalSlides={1} />)

    expect(document.querySelector('.split-layout')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ideas clave' })).toBeInTheDocument()
    expect(screen.getByAltText('Ideas clave')).toHaveAttribute('src', baseSlide.imageUrl)
  })

  // Comprueba que la presentación navega con flechas y sale con Escape.
  it('navega entre diapositivas y sale del modo presentación', () => {
    const onIndexChange = jest.fn()
    const onExit = jest.fn()
    render(<PresentationMode slides={[baseSlide, { ...baseSlide, id: 'slide-2', title: 'Siguiente' }]} index={0} onIndexChange={onIndexChange} onExit={onExit} />)

    expect(screen.getByRole('main')).toHaveClass('presentation-mode')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndexChange).toHaveBeenCalledWith(1)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onIndexChange).toHaveBeenCalledWith(0)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  // Comprueba que los controles de presentación respetan los límites de navegación.
  it('deshabilita los controles en los extremos y muestra el contador', () => {
    const slides = [baseSlide, { ...baseSlide, id: 'slide-2', title: 'Siguiente' }]
    const onIndexChange = jest.fn()
    render(<PresentationMode slides={slides} index={0} onIndexChange={onIndexChange} onExit={jest.fn()} />)

    expect(document.querySelector('.presentation-nav span')?.textContent).toBe('01 / 02')
    expect(screen.getByRole('button', { name: 'Diapositiva anterior' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Diapositiva siguiente' }))
    expect(onIndexChange).toHaveBeenCalledWith(1)
  })

  // Comprueba el flujo de edición: crear proyecto, añadir slide y cambiar su layout.
  it('permite crear un proyecto, añadir contenido y elegir un layout', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Crear mi primera presentación/i }))
    fireEvent.change(screen.getByLabelText('Nombre de la presentación'), { target: { value: 'Proyecto de prueba' } })
    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: 'Ada' } })
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'Diseño' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))

    await screen.findByRole('heading', { name: 'Proyecto de prueba' })
    fireEvent.click(screen.getAllByRole('button', { name: '＋ Crear portada' })[0])
    await screen.findByRole('button', { name: 'Guardar cambios' })
    fireEvent.click(screen.getByRole('button', { name: '＋ Nueva diapositiva' }))

    const typeSelect = await screen.findByLabelText('Tipo de diapositiva')
    await waitFor(() => expect(typeSelect).toHaveValue('content'))
    const layoutSelect = await screen.findByLabelText('Diseño')
    fireEvent.change(layoutSelect, { target: { value: 'text-and-image' } })

    const editor = screen.getAllByRole('complementary')[1]
    expect(within(editor).getByLabelText('URL de imagen')).toBeInTheDocument()
    fireEvent.click(within(editor).getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Guardado en este dispositivo')
    expect(screen.getByRole('heading', { name: 'Título de la diapositiva' })).toBeInTheDocument()
  })
})
