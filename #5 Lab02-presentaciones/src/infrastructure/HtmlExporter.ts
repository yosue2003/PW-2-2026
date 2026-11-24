import type { IExporter } from '../models/ports/IExporter.ts'
import type { Project } from '../models/Project.ts'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

function safeImageUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

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
    const imageUrl = safeImageUrl(slide.imageUrl)
    const image = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" />` : ''
    const cover = slide.type === 'title'
    const metadata = `<header><span>${escapeHtml(slide.topic || project.topic)}</span><span>${escapeHtml(slide.author || project.author)}</span></header>`
    const footer = `<footer><span>${escapeHtml(slide.author || project.author)}</span><span>${index + 1} / ${project.slides.length}</span></footer>`

    if (cover) {
      return `<section class="slide cover">
        <div class="cover-content"><span class="eyebrow">PRESENTACIÓN</span><h1>${title}</h1>
        ${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}
        <footer>${escapeHtml(slide.author || project.author)} · ${escapeHtml(slide.topic || project.topic)}</footer></div>
      </section>`
    }

    let content: string
    if (slide.layout === 'image-only') {
      content = `<div class="content image-only">${image}${slide.title ? `<p class="caption">${title}</p>` : ''}</div>`
    } else if (slide.layout === 'text-and-image') {
      content = `<div class="content split"><div class="copy"><h2>${title}</h2>${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}</div>${image}</div>`
    } else {
      content = `<div class="content text-only"><h2>${title}</h2>${body ? `<p>${body.replace(/\n/g, '<br>')}</p>` : ''}</div>`
    }

    return `<section class="slide ${escapeHtml(slide.layout)}">${metadata}${content}${footer}</section>`
  }).join('\n')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(project.name)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef0eb;color:#26392d;font-family:Arial,sans-serif}.slide{position:relative;width:min(100vw,1120px);aspect-ratio:16/9;margin:24px auto;padding:5%;background:#fff;overflow:hidden;page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto;break-after:auto}.slide header,.slide footer{display:flex;justify-content:space-between;gap:16px;color:#758276;font-size:12px}.slide header{text-transform:uppercase;letter-spacing:1px}.content{height:85%;display:flex;flex-direction:column;justify-content:center}.content h2{font-size:clamp(28px,4vw,52px);margin:0 0 18px}.content p{font-size:clamp(16px,2vw,24px);line-height:1.6;white-space:pre-wrap}.text-only{align-items:flex-start}.split{flex-direction:row;align-items:center;gap:6%}.split .copy{flex:1;min-width:0}.split img{width:44%;max-height:76%;object-fit:cover}.content img{max-width:90%;max-height:78%;object-fit:contain;margin:0 auto}.image-only{align-items:center}.caption{text-align:center;font-size:14px!important}.eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c2dc75}.cover{display:flex;align-items:center;background:#22382c;color:white}.cover-content{max-width:85%}.cover h1{font-size:clamp(40px,7vw,84px);margin:16px 0 20px;overflow-wrap:anywhere}.cover p{font-size:22px;line-height:1.5}.cover footer{justify-content:flex-start;color:#d8f36a;margin-top:28px}.slide:not(.cover)>footer{position:absolute;bottom:4%;left:5%;right:5%;color:#9aa39b}@media print{@page{size:landscape;margin:0}.slide{width:100vw;height:100vh;margin:0;aspect-ratio:auto;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:white}}
</style></head><body>${slides}</body></html>`
}

export const htmlExporter = new HtmlExporter()

/** Office export contracts are present for a future format implementation. */
export class PptxExporterAdapter implements IExporter {
  readonly format = 'pptx' as const

  async export(_project: Project): Promise<Blob> {
    throw new Error('La exportación a PowerPoint todavía no está disponible.')
  }
}

export class OdpExporterAdapter implements IExporter {
  readonly format = 'odp' as const

  async export(_project: Project): Promise<Blob> {
    throw new Error('La exportación a LibreOffice todavía no está disponible.')
  }
}

/** Opens the generated deck in a print window; the browser's PDF destination can save it as PDF. */
export async function printProjectAsPdf(project: Project, openWindow: typeof window.open = window.open.bind(window)) {
  const printWindow = openWindow('', '_blank')
  if (!printWindow) throw new Error('El navegador bloqueó la ventana de impresión.')
  const html = renderProjectHtml(project)
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
