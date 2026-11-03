import type { Slide } from '../../../models/Slide.ts'

export function LayoutTextAndImage({ slide }: { slide: Slide }) {
  return (
    <div className="content-layout split-layout">
      <div className="slide-copy">
        <span className="eyebrow">PUNTOS CLAVE</span>
        <h2>{slide.title || 'Título de la diapositiva'}</h2>
        <p>{slide.body || 'Agrega aquí el contenido de esta diapositiva.'}</p>
      </div>
      {slide.imageUrl ? (
        <img className="split-image" src={slide.imageUrl} alt={slide.title || 'Imagen de apoyo'} />
      ) : (
        <div className="image-placeholder split-placeholder"><span aria-hidden="true">▧</span><p>Imagen de apoyo</p></div>
      )}
    </div>
  )
}
