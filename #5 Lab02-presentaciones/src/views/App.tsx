import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Project } from '../models/Project.ts'
import type { Slide, SlideLayout, SlideType } from '../models/Slide.ts'
import { projectRepository } from '../infrastructure/projectRepository.ts'
import { useProjectController } from '../controllers/useProjectController.ts'
import { useSlideController } from '../controllers/useSlideController.ts'
import { PresentationMode } from './PresentationMode.tsx'
import { SlideRenderer } from './components/SlideRenderer.tsx'
import { htmlExporter, printProjectAsPdf } from '../infrastructure/HtmlExporter.ts'

const timestamp = () => new Date().toISOString()
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `slide-${Date.now()}-${Math.random().toString(16).slice(2)}`

function makeSlide(project: Project, type: SlideType): Slide {
  const now = timestamp()
  return {
    id: makeId(), type, title: type === 'title' ? project.name : '', body: '', layout: 'text-only',
    author: project.author, topic: project.topic, createdAt: now, updatedAt: now,
  }
}

function App() {
  const { projects, loading, error, refreshProjects, createProject, deleteProject } = useProjectController(projectRepository)
  const { addSlide: createSlide, saveSlide: updateSlide, deleteSlide: removeSlideFromProject, copySlideToProject, moveSlideToProject } = useSlideController(projectRepository)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Slide | null>(null)
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectAuthor, setProjectAuthor] = useState('')
  const [projectTopic, setProjectTopic] = useState('')
  const [presenting, setPresenting] = useState(false)
  const [presentationIndex, setPresentationIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [destinationProjectId, setDestinationProjectId] = useState('')

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const activeSlide = activeProject?.slides.find((slide) => slide.id === activeSlideId)
    ?? activeProject?.slides[0] ?? null
  const orderedSlides = useMemo(() => activeProject?.slides ?? [], [activeProject])
  const activeSlideIndex = activeProject?.slides.findIndex((slide) => slide.id === activeSlide?.id) ?? -1

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      const firstProject = projects[0]
      setActiveProjectId(firstProject.id)
      setActiveSlideId(firstProject.slides[0]?.id ?? null)
      setDraft(firstProject.slides[0] ?? null)
    }
  }, [activeProjectId, projects])

  useEffect(() => {
    const firstSlide = activeProject?.slides[0] ?? null
    setActiveSlideId(firstSlide?.id ?? null)
    setDraft(firstSlide)
    setDestinationProjectId(projects.find((project) => project.id !== activeProject?.id)?.id ?? '')
  }, [activeProject?.id])

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const project = await createProject({ name: projectName, author: projectAuthor, topic: projectTopic })
      setActiveProjectId(project.id)
      setActiveSlideId(null)
      setDraft(null)
      setProjectName('')
      setProjectAuthor('')
      setProjectTopic('')
      setProjectFormOpen(false)
      setMessage('Proyecto guardado en este dispositivo')
    } catch {
      setMessage('No se pudo crear el proyecto')
    }
  }

  async function addSlide() {
    if (!activeProject) return
    const type: SlideType = activeProject.slides.length === 0 ? 'title' : 'content'
    const slide = makeSlide(activeProject, type)
    setSaving(true)
    setMessage('')
    try {
      const savedSlide = await createSlide(activeProject.id, slide)
      await refreshProjects({ silent: true })
      setActiveSlideId(savedSlide.id)
      setDraft(savedSlide)
      setMessage('Guardado en este dispositivo')
    } catch {
      setMessage('No se pudo crear la diapositiva')
    } finally {
      setSaving(false)
    }
  }

  async function saveSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeProject || !draft) return
    setSaving(true)
    setMessage('')
    try {
      const savedSlide = await updateSlide(activeProject.id, draft)
      await refreshProjects({ silent: true })
      setDraft(savedSlide)
      setMessage('Guardado en este dispositivo')
    } catch {
      setMessage('No se pudieron guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  async function removeSlide() {
    if (!activeProject || !activeSlide) return
    setSaving(true)
    setMessage('')
    try {
      const remaining = await removeSlideFromProject(activeProject.id, activeSlide.id)
      await refreshProjects({ silent: true })
      const nextSlide = remaining[Math.min(Math.max(activeSlideIndex, 0), remaining.length - 1)] ?? null
      setActiveSlideId(nextSlide?.id ?? null)
      setDraft(nextSlide)
      setMessage('Diapositiva eliminada')
    } catch {
      setMessage('No se pudo eliminar la diapositiva')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!window.confirm(`¿Eliminar “${project.name}” y todas sus diapositivas? Esta acción no se puede deshacer.`)) return
    try {
      const remaining = projects.filter((item) => item.id !== project.id)
      await deleteProject(project.id)
      if (activeProjectId === project.id) {
        const nextProject = remaining[0] ?? null
        setActiveProjectId(nextProject?.id ?? null)
        setActiveSlideId(nextProject?.slides[0]?.id ?? null)
        setDraft(nextProject?.slides[0] ?? null)
      }
      setMessage('Proyecto eliminado')
    } catch {
      setMessage('No se pudo eliminar el proyecto')
    }
  }

  async function transferSlide(action: 'copy' | 'move') {
    if (!activeProject || !activeSlide || !destinationProjectId) return
    setSaving(true)
    setMessage('')
    try {
      if (action === 'copy') {
        await copySlideToProject(activeProject.id, activeSlide.id, destinationProjectId)
      } else {
        await moveSlideToProject(activeProject.id, activeSlide.id, destinationProjectId)
      }
      await refreshProjects({ silent: true })
      if (action === 'move') {
        const remaining = activeProject.slides.filter((slide) => slide.id !== activeSlide.id)
        const nextSlide = remaining[Math.min(Math.max(activeSlideIndex, 0), remaining.length - 1)] ?? null
        setActiveSlideId(nextSlide?.id ?? null)
        setDraft(nextSlide)
      }
      setMessage(action === 'copy' ? 'Diapositiva copiada al proyecto' : 'Diapositiva trasladada al proyecto')
    } catch (transferError) {
      setMessage(transferError instanceof Error ? transferError.message : 'No se pudo transferir la diapositiva')
    } finally {
      setSaving(false)
    }
  }

  function startPresentation() {
    if (!activeProject || activeProject.slides.length === 0) return
    setPresentationIndex(Math.max(activeSlideIndex, 0))
    setPresenting(true)
  }

  async function exportHtml() {
    if (!activeProject) return
    try {
      const blob = await htmlExporter.export(activeProject)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${activeProject.name.trim().replace(/[\\/:*?"<>|]/g, '-') || 'presentacion'}.html`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('HTML descargado')
    } catch {
      setMessage('No se pudo exportar el HTML')
    }
  }

  async function exportPdf() {
    if (!activeProject) return
    try {
      await printProjectAsPdf(activeProject)
      setMessage('Vista de impresión abierta; elige Guardar como PDF')
    } catch (exportError) {
      setMessage(exportError instanceof Error ? exportError.message : 'No se pudo preparar el PDF')
    }
  }

  function selectProject(project: Project) {
    setActiveProjectId(project.id)
    const firstSlide = project.slides[0] ?? null
    setActiveSlideId(firstSlide?.id ?? null)
    setDraft(firstSlide)
    setMessage('')
  }

  if (presenting && activeProject) {
    return <PresentationMode slides={orderedSlides} index={presentationIndex} onIndexChange={setPresentationIndex} onExit={() => setPresenting(false)} />
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Inicio">
          <span className="brand-mark">S</span><span>slidecraft<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="local-badge"><i /> Guardado local</span>
          {activeProject && activeProject.slides.length > 0 && (
            <button className="button button-dark" onClick={startPresentation}><span>▶</span> Presentar</button>
          )}
          <button className="avatar" title="Perfil">{activeProject?.author?.charAt(0).toUpperCase() || 'J'}</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading"><span className="eyebrow">ESPACIO DE TRABAJO</span><button className="icon-button" aria-label="Nuevo proyecto" onClick={() => setProjectFormOpen((open) => !open)}>＋</button></div>
          <button className="nav-link active"><span>▧</span> Mis presentaciones</button>
          <div className="project-list-heading"><span>TUS PROYECTOS</span><span>{projects.length}</span></div>
          <nav className="project-list" aria-label="Proyectos">
            {projects.map((project) => (
              <div className="project-list-item" key={project.id}>
                <button className={`project-link ${project.id === activeProjectId ? 'selected' : ''}`} onClick={() => selectProject(project)}>
                  <span className="project-file-icon">▤</span><span className="project-link-name">{project.name}</span><span className="project-slide-count">{project.slides.length}</span>
                </button>
                <button className="project-delete" aria-label={`Eliminar ${project.name}`} title="Eliminar proyecto" onClick={() => handleDeleteProject(project)}>×</button>
              </div>
            ))}
            {!loading && projects.length === 0 && <p className="sidebar-empty">Todavía no hay proyectos.</p>}
          </nav>
          <div className="sidebar-bottom"><span className="help-icon">?</span><div><strong>¿Necesitas ayuda?</strong><small>Guía rápida del editor</small></div><span className="chevron">↗</span></div>
        </aside>

        <section className="main-panel">
          <div className="page-heading">
            <div><div className="breadcrumb">Mis presentaciones <span>/</span> {activeProject?.name || 'Inicio'}</div><h1>{activeProject?.name || 'Tus ideas, en diapositivas.'}</h1><p>{activeProject ? 'Edita el contenido y presenta tus ideas.' : 'Crea una presentación y empieza a contar tu historia.'}</p></div>
            {activeProject && <button className="button button-primary" onClick={addSlide} disabled={saving}>{activeProject.slides.length ? '＋ Nueva diapositiva' : '＋ Crear portada'}</button>}
          {activeProject && activeProject.slides.length > 0 && <div className="export-actions">
            <button className="button button-light" onClick={exportHtml}>Exportar HTML</button>
            <button className="button button-light" onClick={exportPdf}>Guardar como PDF</button>
          </div>}
          </div>

          {projectFormOpen && (
            <form className="project-form" onSubmit={handleCreateProject}>
              <div className="form-title"><div><span className="eyebrow">EMPIEZA ALGO NUEVO</span><h2>Crear presentación</h2></div><button type="button" className="icon-button" onClick={() => setProjectFormOpen(false)} aria-label="Cerrar">×</button></div>
              <label>Nombre de la presentación<input required autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ej. Ideas para el futuro" /></label>
              <div className="form-row"><label>Autor<input required value={projectAuthor} onChange={(event) => setProjectAuthor(event.target.value)} placeholder="Tu nombre" /></label><label>Tema<input required value={projectTopic} onChange={(event) => setProjectTopic(event.target.value)} placeholder="Ej. Innovación" /></label></div>
              <div className="form-actions"><button type="button" className="button button-light" onClick={() => setProjectFormOpen(false)}>Cancelar</button><button className="button button-primary">Crear proyecto</button></div>
            </form>
          )}

          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {loading ? <div className="loading-state"><span className="spinner" />Cargando tus proyectos…</div> : !activeProject ? (
            <section className="welcome-card">
              <div className="welcome-art"><div className="art-back" /><div className="art-front"><span /><span /><span /></div><div className="art-spark">✦</div></div>
              <span className="eyebrow">TU LIENZO ESTÁ LISTO</span><h2>Una buena idea merece<br />una gran presentación.</h2><p>Crea tu primer proyecto. Todo se guarda localmente en este dispositivo.</p>
              <button className="button button-primary" onClick={() => setProjectFormOpen(true)}>＋ Crear mi primera presentación</button>
            </section>
          ) : (
            <div className="editor-layout">
              <section className="canvas-column" aria-label="Vista previa de diapositiva">
                <div className="canvas-toolbar"><div><span className="eyebrow">VISTA PREVIA</span><span className="canvas-slide-label">{activeSlide ? `Diapositiva ${String(activeSlideIndex + 1).padStart(2, '0')}` : 'Sin diapositivas'}</span></div><div className="canvas-toolbar-actions"><span className="zoom-label">100%</span><button className="icon-button" aria-label="Presentar diapositiva" onClick={startPresentation} disabled={!activeProject.slides.length}>⛶</button></div></div>
                <div className="canvas-stage">
                  {activeSlide ? <SlideRenderer slide={activeSlide} slideNumber={activeSlideIndex + 1} totalSlides={activeProject.slides.length} /> : <div className="empty-canvas"><span>✳</span><h2>Tu lienzo está vacío</h2><p>Agrega una portada para comenzar tu presentación.</p><button className="button button-primary" onClick={addSlide}>＋ Crear portada</button></div>}
                </div>
                {activeProject.slides.length > 0 && <div className="slide-filmstrip"><span className="eyebrow">DIAPOSITIVAS</span>{activeProject.slides.map((slide, index) => <button key={slide.id} className={`filmstrip-item ${slide.id === activeSlide?.id ? 'current' : ''}`} onClick={() => { setActiveSlideId(slide.id); setDraft(slide) }}><span className={`filmstrip-thumb ${slide.type === 'title' ? 'thumb-title' : ''}`}><i /><i /><i /></span><span>{String(index + 1).padStart(2, '0')}</span></button>)}<button className="filmstrip-add" aria-label="Agregar diapositiva" onClick={addSlide} disabled={saving}>＋</button></div>}
              </section>

              <aside className="properties-panel">
                <div className="properties-heading"><div><span className="eyebrow">PANEL DE EDICIÓN</span><h2>Contenido</h2></div><span className="panel-menu">•••</span></div>
                {draft ? (
                  <form className="slide-form" onSubmit={saveSlide}>
                    <label>Tipo de diapositiva<select aria-label="Tipo de diapositiva" value={activeSlideIndex === 0 ? 'title' : 'content'} disabled><option value="title">Portada</option><option value="content">Contenido</option></select></label>
                    {activeSlideIndex > 0 && <label>Diseño<select value={draft.layout} onChange={(event) => setDraft({ ...draft, layout: event.target.value as SlideLayout })}><option value="text-only">Solo texto</option><option value="image-only">Solo imagen</option><option value="text-and-image">Texto e imagen</option></select></label>}
                    <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Escribe un título" /></label>
                    {draft.layout !== 'image-only' && <label>Texto<textarea rows={5} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Desarrolla tu idea aquí…" /> <small className="field-hint">Usa una idea clara y directa.</small></label>}
                    {(draft.layout === 'image-only' || draft.layout === 'text-and-image') && <label>URL de imagen<input type="url" value={draft.imageUrl ?? ''} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://…" /></label>}
                    <div className="slide-form-separator" />
                    <label>Autor<input value={draft.author ?? ''} onChange={(event) => setDraft({ ...draft, author: event.target.value })} placeholder="Autor" /></label>
                    <label>Tema<input value={draft.topic ?? ''} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="Tema" /></label>
                    <button className="button button-primary save-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
                    <button type="button" className="delete-slide-button" onClick={removeSlide}>Eliminar diapositiva</button>
                    {projects.some((project) => project.id !== activeProject.id) && <details className="slide-transfer">
                      <summary>Copiar o mover a otro proyecto</summary>
                      <label>Proyecto de destino<select value={destinationProjectId} onChange={(event) => setDestinationProjectId(event.target.value)}>
                        <option value="">Elige un proyecto</option>
                        {projects.filter((project) => project.id !== activeProject.id).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select></label>
                      <div className="slide-transfer-actions">
                        <button type="button" className="button button-light" disabled={!destinationProjectId || saving} onClick={() => transferSlide('copy')}>Copiar</button>
                        <button type="button" className="button button-light" disabled={!destinationProjectId || saving} onClick={() => transferSlide('move')}>Mover</button>
                      </div>
                    </details>}
                  </form>
                ) : (
                  <div className="add-slide-prompt"><p>Agrega tu primera diapositiva para comenzar.</p><button className="button button-primary" onClick={addSlide}>＋ Crear portada</button></div>
                )}
                <div className="panel-footer"><span className="save-status-dot" />{message || 'Los cambios se guardan en tu dispositivo'}</div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
