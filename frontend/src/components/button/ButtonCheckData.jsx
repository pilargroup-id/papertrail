function ButtonCheckData({
  children,
  className = '',
  tone = 'warning',
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
        manage_search
      </span>
      {children}
    </button>
  )
}

export default ButtonCheckData
