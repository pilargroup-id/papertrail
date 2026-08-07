export const FRP_MOBILE_STATUS_ALL = 'ALL'

export const frpMobileStatusTabs = [
  { id: FRP_MOBILE_STATUS_ALL, label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
]

function MobileCreateFrp({
  activeStatus = FRP_MOBILE_STATUS_ALL,
  onStatusChange,
} = {}) {
  return {
    tabs: frpMobileStatusTabs,
    activeTabId: activeStatus,
    onTabChange: onStatusChange,
    ariaLabel: 'Filter status FRP',
    variant: 'dropdown',
  }
}

export default MobileCreateFrp
