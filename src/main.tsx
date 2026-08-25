import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErroProvider } from './lib/ErroProvider'
import { RepertoriosProvider } from './lib/RepertoriosProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ErroProvider>
        <RepertoriosProvider>
          <App />
        </RepertoriosProvider>
      </ErroProvider>
    </ErrorBoundary>
  </StrictMode>,
)
