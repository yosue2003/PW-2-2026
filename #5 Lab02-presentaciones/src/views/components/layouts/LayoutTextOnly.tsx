import type { Slide } from '../../../models/Slide.ts'

export function LayoutTextOnly({ slide }: { slide: Slide }) {
  return (
    <div className="content-layout text-only-layout">
      <div className="slide-copy">
        <span className="eyebrow">IDEA PRINCIPAL</span>
        <h2>{slide.title || 'Título de la diapositiva'}</h2>
        <p>{slide.body || 'Agrega aquí el contenido de esta diapositiva.'}</p>
      </div>
    </div>
  )
}
