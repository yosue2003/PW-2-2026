import type { Slide } from '../../models/Slide.ts'
import { HeaderFooter } from './HeaderFooter.tsx'
import { LayoutImageOnly } from './layouts/LayoutImageOnly.tsx'
import { LayoutTextAndImage } from './layouts/LayoutTextAndImage.tsx'
import { LayoutTextOnly } from './layouts/LayoutTextOnly.tsx'

interface SlideRendererProps {
  slide: Slide
  slideNumber: number
  totalSlides: number
}

export function SlideRenderer({ slide, slideNumber, totalSlides }: SlideRendererProps) {
  if (slide.type === 'title') {
    return (
      <article className="slide-canvas title-slide" aria-label="Diapositiva de portada">
        <div className="title-content">
          <span className="eyebrow">PRESENTACIÓN</span>
          <h1>{slide.title || 'Título de la presentación'}</h1>
          <p className="title-subtitle">{slide.body}</p>
          <div className="title-byline">
            <span>{slide.author}</span>
            {slide.author && slide.topic && <span className="byline-dot">·</span>}
            <span>{slide.topic}</span>
          </div>
        </div>
        <span className="cover-index">{String(slideNumber).padStart(2, '0')}</span>
      </article>
    )
  }

  let content
  switch (slide.layout) {
    case 'image-only':
      content = <LayoutImageOnly slide={slide} />
      break
    case 'text-and-image':
      content = <LayoutTextAndImage slide={slide} />
      break
    default:
      content = <LayoutTextOnly slide={slide} />
  }

  return (
    <article className="slide-canvas content-slide" aria-label={`Diapositiva ${slideNumber}`}>
      <HeaderFooter slide={slide} slideNumber={slideNumber} totalSlides={totalSlides} />
      {content}
    </article>
  )
}
