import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import logoUrl from './assets/drshilpas-logo.png'

// Set favicon and title to clinic brand
const link = document.querySelector("link[rel='icon']") || (() => {
  const l = document.createElement('link'); l.setAttribute('rel','icon'); document.head.appendChild(l); return l
})()
link.setAttribute('type', 'image/png')
link.setAttribute('href', logoUrl)
document.title = "Dr. Shilpa's Clinic"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
