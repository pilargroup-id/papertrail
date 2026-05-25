function ButtonPrintPdf({
  children,
  className = '',
  tone = 'neutral',
  type = 'button',
  ...buttonProps
}) {
  const toneClass = `users-table-card__action--${tone}`

  return (
    <button
      type={type}
      className={['users-table-card__action', toneClass, className].filter(Boolean).join(' ')}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '15px' }}>
        print
      </span>
      {children}
    </button>
  )
}

export default ButtonPrintPdf
