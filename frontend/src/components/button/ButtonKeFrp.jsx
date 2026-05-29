import { useState } from 'react'

function ButtonKeFrp({
  children,
  className = '',
  tone = 'primary',
  type = 'button',
  ...buttonProps
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type={type}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        color: '#2563eb',
        border: `1.5px solid ${isHovered ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.4)'}`,
        borderRadius: '24px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: isHovered ? '0 6px 16px rgba(59,130,246,0.1)' : '0 4px 12px rgba(59,130,246,0.05)',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...buttonProps}
    >
      <span className="material-icons-round" style={{ fontSize: '16px' }}>
        arrow_forward
      </span>
      {children}
    </button>
  )
}

export default ButtonKeFrp
