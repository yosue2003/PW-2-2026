import type { IExporter } from '../models/ports/IExporter.ts'
import type { Project } from '../models/Project.ts'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

/** Generates a self-contained HTML document with print-ready slide styles. */
export class HtmlExporter implements IExporter {
  readonly format = 'html' as const

  async export(project: Project): Promise<Blob> {
    return new Blob([renderProjectHtml(project)], { type: 'text/html;charset=utf-8' })
  }
}

export function renderProjectHtml(project: Project): string {
    const slides = project.slides.map((slide, index) => {
      const title = escapeHtml(slide.title || 'Diapositiva sin título')
      const body = escapeHtml(slide.body || '')
      const image = slide.imageUrl
        ? `<img src="${escapeHtml(slide.imageUrl)}" alt="${title}" />`
        : ''
      const cover = slide.type === 'title'
      return `<section class="slide ${cover ? 'cover' : ''} ${escapeHtml(slide.layout)}">
        ${cover ? '<div class="cover-content">' : `<header><span>${escapeHtml(slide.topic || project.topic)}</span><span>${escapeHtml(slide.author || project.author)}</span></header><div class="content">`}
        <h${cover ? '1' : '2'}>${title}</h${cover ? '1' : '2'}>
        ${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}${image}
        ${cover ? `<footer>${escapeHtml(slide.author || project.author)} · ${escapeHtml(slide.topic || project.topic)}</footer></div>` : `</div><footer>${index + 1} / ${project.slides.length}</footer>`}
      </section>`
    }).join('\n')

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(project.name)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef0eb;color:#26392d;font-family:Arial,sans-serif}.slide{position:relative;width:min(100vw,1120px);aspect-ratio:16/9;margin:24px auto;padding:5%;background:#fff;overflow:hidden;page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto;break-after:auto}header,footer{display:flex;justify-content:space-between;color:#758276;font-size:12px}header{text-transform:uppercase;letter-spacing:1px}.content{height:85%;display:flex;flex-direction:column;justify-content:center}.content h2{font-size:clamp(28px,4vw,52px);margin:0 0 18px}.content p{font-size:clamp(16px,2vw,24px);line-height:1.6;white-space:pre-wrap}.slide img{max-width:45%;max-height:70%;object-fit:contain;margin:12px auto}.image-only img{max-width:90%;max-height:80%}.cover{display:flex;align-items:center;background:#22382c;color:white}.cover-content{max-width:85%}.cover h1{font-size:clamp(40px,7vw,84px);margin:0 0 20px}.cover p{font-size:22px}.cover footer{justify-content:flex-start;color:#d8f36a;margin-top:28px}@media print{@page{size:landscape;margin:0}.slide{width:100vw;height:100vh;margin:0;aspect-ratio:auto;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:white}}
</style></head><body>${slides}</body></html>`
}

export const htmlExporter = new HtmlExporter()

/** Opens the generated deck in a print window; the browser's PDF destination can save it as PDF. */
export async function printProjectAsPdf(project: Project, openWindow: typeof window.open = window.open.bind(window)) {
  const printWindow = openWindow('', '_blank')
  if (!printWindow) throw new Error('El navegador bloqueó la ventana de impresión.')
  const html = renderProjectHtml(project)
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => printWindow.print()
}
