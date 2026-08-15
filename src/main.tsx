import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RepertoriosProvider } from './lib/RepertoriosProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepertoriosProvider>
      <App />
    </RepertoriosProvider>
  </StrictMode>,
)
