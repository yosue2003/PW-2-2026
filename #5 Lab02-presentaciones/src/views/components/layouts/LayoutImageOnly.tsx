import type { Slide } from '../../../models/Slide.ts'

export function LayoutImageOnly({ slide }: { slide: Slide }) {
  return (
    <div className="content-layout image-only-layout">
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt={slide.title || 'Imagen de la diapositiva'} />
      ) : (
        <div className="image-placeholder"><span aria-hidden="true">▧</span><p>Agrega una URL de imagen</p></div>
      )}
      {slide.title && <p className="image-caption">{slide.title}</p>}
    </div>
  )
}
