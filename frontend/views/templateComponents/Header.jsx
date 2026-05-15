import { useState } from 'react'
import logoPiagam from './assets/logo-piagam.png'
import logoPiagamTransparent from './assets/logo-piagam2.png'
import './templateComponents.css'

function Header({ title = 'Form Request Payment', onMenuToggle, showMenuButton = false }) {
  return (
    <header className="header-main">
      <img
        src={logoPiagamTransparent}
        alt=""
        aria-hidden="true"
        className="header-accent-logo"
      />

      <div className="header-content">
        <div className="header-left">
          {showMenuButton ? (
            <button
              type="button"
              className="header-menu-button"
              aria-label="Open sidebar"
              onClick={onMenuToggle}
            >
              <span className="material-icons-round" style={{ fontSize: '20px' }}>menu</span>
            </button>
          ) : null}

          <div className="header-brand">
            <img src={logoPiagam} alt="Logo Piagam" className="header-brand-logo" />
          </div>
        </div>

        <div className="header-right">
          <span className="header-brand-title">{title}</span>
        </div>
      </div>
    </header>
  )
}

export default Header
