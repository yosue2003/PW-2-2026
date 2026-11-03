import type { Slide } from '../../models/Slide.ts'

interface HeaderFooterProps {
  slide: Slide
  slideNumber: number
  totalSlides: number
}

export function HeaderFooter({ slide, slideNumber, totalSlides }: HeaderFooterProps) {
  return (
    <>
      <header className="slide-meta">
        <span>{slide.topic || 'Presentación'}</span>
        <span>{slide.author || 'Autor'}</span>
      </header>
      <footer className="slide-footer">
        <span>{new Date(slide.updatedAt).toLocaleDateString()}</span>
        <span>{slideNumber} / {totalSlides}</span>
      </footer>
    </>
  )
}
