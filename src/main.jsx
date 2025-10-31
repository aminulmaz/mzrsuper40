import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // This imports our custom font/styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)