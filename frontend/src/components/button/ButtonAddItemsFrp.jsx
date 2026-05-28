import React from 'react'


function ButtonCreateBudgets({
  label, // Destructured to avoid passing it down to the DOM
  value,
  icon,
  children,
  className = '',
  type = 'button',
  ...buttonProps
}) {
  return (
    <button
      type={type}
      className={`frp-btn-primary ${className}`.trim()}
      {...buttonProps}
    >
      {icon || (
        <span className="material-icons-round" style={{ fontSize: '16px' }}>
          add
        </span>
      )}
      {value || children || 'Add Items'}
    </button>
  )
}

export default ButtonCreateBudgets
