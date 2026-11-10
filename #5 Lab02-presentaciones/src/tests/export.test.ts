import type { Project } from '../models/Project.ts'
import { htmlExporter, printProjectAsPdf, renderProjectHtml } from '../infrastructure/HtmlExporter.ts'

const project: Project = {
  id: 'p1', name: 'Ideas <clave>', author: 'Ada & Grace', topic: 'Tecnología',
  createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z',
  slides: [{
    id: 's1', type: 'title', title: '<script>alert(1)</script>', body: 'Línea uno\nLínea dos',
    layout: 'text-only', author: 'Ada', topic: 'Tecnología',
    createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z',
  }, {
    id: 's2', type: 'content', title: 'Desarrollo', body: 'Contenido', layout: 'text-and-image',
    imageUrl: 'https://example.com/imagen.jpg', author: 'Ada', topic: 'Tecnología',
    createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z',
  }],
}

describe('exportación de presentaciones', () => {
  it('genera HTML descargable con las diapositivas y contenido escapado', async () => {
    const blob = await htmlExporter.export(project)
    const html = renderProjectHtml(project)

    expect(blob.type).toBe('text/html;charset=utf-8')
    expect(html).toContain('<title>Ideas &lt;clave&gt;</title>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('Línea uno<br>Línea dos')
    expect(html).toContain('class="slide cover text-only"')
    expect(html).toContain('class="slide  text-and-image"')
    expect(html).toContain('https://example.com/imagen.jpg')
    expect(html).toContain('@media print')
  })

  it('abre el documento exportado e invoca la impresión para guardar como PDF', async () => {
    const print = jest.fn()
    const fakeWindow = {
      document: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
      print,
      onload: null as (() => void) | null,
    } as unknown as Window
    const openWindow = jest.fn(() => fakeWindow)

    await printProjectAsPdf(project, openWindow as unknown as typeof window.open)

    expect(openWindow).toHaveBeenCalledWith('', '_blank')
    expect(fakeWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('@media print'))
    ;(fakeWindow.onload as unknown as () => void)()
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('informa cuando el navegador bloquea la ventana de impresión', async () => {
    await expect(printProjectAsPdf(project, () => null)).rejects.toThrow('bloqueó')
  })
})
