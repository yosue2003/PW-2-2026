import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './views/App.tsx'
import './styles.css'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('La interfaz no pudo renderizarse:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{ margin: '10vh auto', maxWidth: 620, padding: 24, fontFamily: 'system-ui', color: '#572d2d' }}>
          <h1>No se pudo cargar el editor</h1>
          <p>Ocurrió un error al iniciar la interfaz. Recarga la página y revisa el mensaje técnico:</p>
          <pre style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
        </main>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>,
)
