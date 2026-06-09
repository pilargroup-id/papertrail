import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ButtonApprove from './ButtonApprove.jsx'
import ButtonReject from './ButtonReject.jsx'
import ButtonPrintPdf from './ButtonPrintPdf.jsx'
import ButtonCheckData from './ButtonCheckData.jsx'
import ButtonKeFrp from './ButtonKeFrp.jsx'
import ButtonDetail from './ButtonDetail.jsx'
import ButtonRevert from './ButtonRevert.jsx'

function printRpPreview(rpId) {
  if (!rpId || typeof window === 'undefined') return
  window.open(`/api/rp/${rpId}/preview`, '_blank')
}

export default function ButtonActionApprovalRp({
  rp,
  user,
  userDivision,
  isProcessDivision,
  actionLoading,
  requestAction,
  setSelected,
  onCheckData,
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

  const userJobLevelRank = Number(user?.jobLevelRank || user?.job_level_rank || 0)
  const isAdmin = user?.role === 'administrator'
  const userJobLevelName = String(user?.selectedJobLevel || user?.jobLevelName || '').toLowerCase()
  const canTakeApprovalAction = userJobLevelRank >= 2 && !/\bstaff\b/.test(userJobLevelName)

  const canManagerApprove =
    rp.status === 'waiting_manager' &&
    canTakeApprovalAction

  const canProcess = rp.status === 'division_review' && (isAdmin || isProcessDivision(rp.diprosesOleh))

  const canFinalApprove =
    rp.status === 'final_review' &&
    canTakeApprovalAction

  const canCreateFrp =
    rp.status === 'approved' &&
    (isAdmin || (userDivision && ['it', 'product', 'produk'].includes(userDivision.toLowerCase())))

  const showRevertAction = showRevert && rp.canRevert

  const isStaff = userJobLevelRank === 1

  // At waiting_manager & final_review: always show Detail & Revert directly (no dropdown) for all users
  // At division_review & approved: only staff gets direct buttons; others use dropdown
  const extractDetail = showDetail && (
    rp.status === 'waiting_manager' ||
    rp.status === 'final_review' ||
    (isStaff && (rp.status === 'division_review' || rp.status === 'approved'))
  )
  const extractRevert = showRevertAction && (
    rp.status === 'waiting_manager' ||
    rp.status === 'final_review' ||
    isStaff
  )

  const showDropdownDetail = showDetail && !extractDetail
  const showDropdownRevert = showRevertAction && !extractRevert
  const showDropdown = showDropdownDetail || showDropdownRevert

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
            <ButtonPrintPdf onClick={() => printRpPreview(rp.id)}>Print PDF</ButtonPrintPdf>
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
            <ButtonCheckData onClick={() => (onCheckData ? onCheckData(rp) : navigate(`/rp?process=${rp.id}`))}>Check Data</ButtonCheckData>
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
      {showActions && !canTakeApprovalAction && userJobLevelRank > 1 && (rp.status === 'waiting_manager' || rp.status === 'final_review') && (
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
          <ButtonCheckData onClick={() => (onCheckData ? onCheckData(rp) : navigate(`/rp?process=${rp.id}`))}>Check Data</ButtonCheckData>
        </div>
      )}

      {(extractDetail || extractRevert) && (
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
          {extractRevert && (
            <ButtonRevert disabled={actionLoading} onClick={() => requestAction(rp, 'revert')}>Revert</ButtonRevert>
          )}
          {extractDetail && (
            <ButtonDetail onClick={() => setSelected(rp)}>Detail</ButtonDetail>
          )}
        </div>
      )}
      
      {showDropdown && (
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
              {showDropdownDetail && (
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
              {showDropdownRevert && (
                <button
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
                    cursor: 'pointer',
                    color: '#f59e0b',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>restart_alt</span>
                  Revert
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
