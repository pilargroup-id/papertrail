function ButtonApprove({
  children,
  className = '',
  tone = 'approve',
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
        check_circle
      </span>
      {children}
    </button>
  )
}

export default ButtonApprove
