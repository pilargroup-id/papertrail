import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ButtonApprove from './ButtonApprove.jsx'
import ButtonReject from './ButtonReject.jsx'
import ButtonRevert from './ButtonRevert.jsx'
import ButtonDetail from './ButtonDetail.jsx'
import ButtonPrintPdf from './ButtonPrintPdf.jsx'
import ButtonCheckData from './ButtonCheckData.jsx'
import ButtonKeFrp from './ButtonKeFrp.jsx'

export default function ButtonActionApprovalRp({
  rp,
  user,
  isAdmin,
  userDivision,
  isProcessDivision,
  isProcessManager,
  actionLoading,
  requestAction,
  setSelected,
  options = {}
}) {
  const navigate = useNavigate()
  const { showDetail = true, showPreview = true, showKeFrp = true, showActions = true, showRevert = true } = options

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    function handleScroll(event) {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("scroll", handleScroll, true)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [dropdownOpen])

  const canManagerApprove =
    rp.status === 'waiting_manager' &&
    (isAdmin || (['Manager', 'Direktur', 'Komisaris'].includes(user?.selectedJobLevel) && userDivision === rp.divisi))
  
  const canProcess = rp.status === 'division_review' && (isAdmin || isProcessDivision(rp.diprosesOleh))
  
  const canFinalApprove = rp.status === 'final_review' && (isAdmin || isProcessManager(rp.diprosesOleh))
  
  const canCreateFrp =
    rp.status === 'approved' &&
    (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

  const showRevertAction = showRevert && rp.canRevert

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {((showPreview && ['approved', 'CREATED_FRP'].includes(rp.status)) || (canCreateFrp && showKeFrp)) && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          {showPreview && ['approved', 'CREATED_FRP'].includes(rp.status) && (
            <ButtonPrintPdf onClick={() => window.open(`/api/rp/${rp.id}/pdf`, '_blank')}>Print PDF</ButtonPrintPdf>
          )}
          {canCreateFrp && showKeFrp && (
            <ButtonKeFrp onClick={() => navigate(`/frp?fromRp=${rp.id}`)}>FRP</ButtonKeFrp>
          )}
        </div>
      )}
      {showActions && canManagerApprove && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'manager-reject')}>Reject</ButtonReject>
          <ButtonApprove disabled={actionLoading} onClick={() => requestAction(rp, 'manager-approve')}>Approve</ButtonApprove>
        </div>
      )}
      {showActions && canProcess && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-reject')}>Reject</ButtonReject>
          <ButtonCheckData onClick={() => navigate(`/rp?process=${rp.id}`)}>Check Data</ButtonCheckData>
        </div>
      )}
      {showActions && canFinalApprove && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <ButtonReject disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-reject')}>Reject</ButtonReject>
          <ButtonApprove disabled={actionLoading} onClick={() => requestAction(rp, 'process-manager-approve')}>Final Approve</ButtonApprove>
        </div>
      )}
      
      {(showDetail || showRevertAction) && (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!dropdownOpen) {
                const rect = e.currentTarget.getBoundingClientRect();
                setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              }
              setDropdownOpen(!dropdownOpen); 
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.2s'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>more_vert</span>
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.05)',
              minWidth: '160px',
              zIndex: 9999,
              padding: '4px'
            }}>
              {showRevertAction && (
                <button
                  disabled={actionLoading}
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); requestAction(rp, 'revert'); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { if(!actionLoading) e.currentTarget.style.background = '#fef2f2' }}
                  onMouseLeave={(e) => { if(!actionLoading) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>history</span>
                  Revert
                </button>
              )}
              {showDetail && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); setSelected(rp); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#3b82f6',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>info</span>
                  Detail
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
