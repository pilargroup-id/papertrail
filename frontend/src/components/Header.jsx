import logoPiagam from '../assets/logo-piagam.png'
import logoPiagamTransparent from '../assets/logo-piagam2.png'

export default function Header({ title = 'Form Request Payment' }) {
  return (
    <header className="header-main">
      <img src={logoPiagamTransparent} alt="" aria-hidden="true" className="header-accent-logo" />
      <div className="header-content">
        <div className="header-left">
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
