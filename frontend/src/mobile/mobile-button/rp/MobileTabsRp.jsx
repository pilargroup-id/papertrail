import {
  RP_MOBILE_DEFAULT_STATUS,
  rpMobileStatusTabs,
} from './mobileTabsRpConfig.js'
import { isManagerUser } from '../../../components/table/rp/rp-button-access.js'

function MobileTabsRp({
  activeStatus = RP_MOBILE_DEFAULT_STATUS,
  currentUser,
  onStatusChange,
} = {}) {
  const canUseDestinationChecker = Boolean(currentUser) && !isManagerUser(currentUser)
  const tabs = rpMobileStatusTabs.filter(
    (tab) => tab.id !== 'PENDING_DESTINATION_CHECKER' || canUseDestinationChecker,
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
