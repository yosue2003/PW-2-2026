import { useEffect } from 'react'
import type { Slide } from '../models/Slide.ts'
import { SlideRenderer } from './components/SlideRenderer.tsx'

interface PresentationModeProps {
  slides: Slide[]
  index: number
  onIndexChange: (index: number) => void
  onExit: () => void
}

export function PresentationMode({ slides, index, onIndexChange, onExit }: PresentationModeProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        onIndexChange(Math.min(index + 1, slides.length - 1))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onIndexChange(Math.max(index - 1, 0))
      } else if (event.key === 'Escape') {
        onExit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, onExit, onIndexChange, slides.length])

  if (slides.length === 0) return null

  return (
    <main className="presentation-mode">
      <SlideRenderer slide={slides[index]} slideNumber={index + 1} totalSlides={slides.length} />
      <div className="presentation-controls">
        <button className="presentation-exit" onClick={onExit}>Salir <kbd>Esc</kbd></button>
        <div className="presentation-nav">
          <button aria-label="Diapositiva anterior" onClick={() => onIndexChange(Math.max(index - 1, 0))} disabled={index === 0}>←</button>
          <span>{String(index + 1).padStart(2, '0')} <i>/</i> {String(slides.length).padStart(2, '0')}</span>
          <button aria-label="Diapositiva siguiente" onClick={() => onIndexChange(Math.min(index + 1, slides.length - 1))} disabled={index === slides.length - 1}>→</button>
        </div>
        <span className="keyboard-hint">Usa ← → para navegar</span>
      </div>
    </main>
  )
}
