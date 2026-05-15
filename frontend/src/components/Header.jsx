export default function Header({ title = 'Form Request Payment' }) {
  return (
    <header className="header-main">
      <div className="header-content">
        <span className="header-brand-title">{title}</span>
      </div>
    </header>
  )
}
