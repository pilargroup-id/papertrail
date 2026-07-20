import {
  RP_MOBILE_DEFAULT_STATUS,
  rpMobileStatusTabs,
} from './mobileTabsRpConfig.js'

function MobileTabsRp({
  activeStatus = RP_MOBILE_DEFAULT_STATUS,
  onStatusChange,
} = {}) {
  return {
    tabs: rpMobileStatusTabs,
    activeTabId: activeStatus,
    onTabChange: onStatusChange,
    ariaLabel: 'Filter status RP',
  }
}

export default MobileTabsRp
