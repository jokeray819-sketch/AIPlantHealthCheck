import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ccc } from "@ckb-ccc/connector-react";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ccc.Provider>
      <App />
    </ccc.Provider>
  </React.StrictMode>,
)

