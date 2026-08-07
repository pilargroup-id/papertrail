export const LOGS_MOBILE_STATUS_ALL = 'ALL'

export const logsMobileStatusTabs = [
  { id: LOGS_MOBILE_STATUS_ALL, label: 'All' },
  { id: 'FRP_APPROVAL', label: 'FrpApproval' },
  { id: 'RP_APPROVAL', label: 'RpApproval' },
  { id: 'BUDGET', label: 'Budget' },
]

function MobileCreateLogs({
  activeStatus = LOGS_MOBILE_STATUS_ALL,
  onStatusChange,
} = {}) {
  return {
    tabs: logsMobileStatusTabs,
    activeTabId: activeStatus,
    onTabChange: onStatusChange,
    ariaLabel: 'Filter status Logs',
  }
}

export default MobileCreateLogs
