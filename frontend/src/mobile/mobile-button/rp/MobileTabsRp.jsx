import {
  RP_MOBILE_DEFAULT_STATUS,
  rpMobileStatusTabs,
} from './mobileTabsRpConfig.js'

function MobileTabsRp({
  activeStatus = RP_MOBILE_DEFAULT_STATUS,
  currentUser,
  onStatusChange,
} = {}) {
  const tabs = rpMobileStatusTabs.filter(
    (tab) => tab.id !== 'PENDING_DESTINATION_CHECKER' || Boolean(currentUser),
  )

  return {
    tabs,
    activeTabId: activeStatus,
    onTabChange: onStatusChange,
    ariaLabel: 'Filter status RP',
    variant: 'dropdown',
  }
}

export default MobileTabsRp
