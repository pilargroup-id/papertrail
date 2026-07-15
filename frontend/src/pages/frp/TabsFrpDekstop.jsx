import { Box, Tab, Tabs } from '@mui/material'

import { frpMobileStatusTabs } from '../../mobile/mobile-button/frp/MobileTabsFrp.jsx'

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function getStatusTabClassName(status) {
  return String(status).toLowerCase().replace(/_/g, '-')
}

function TabsFrpDekstop({
  activeStatus = frpMobileStatusTabs[0].id,
  ariaLabel = 'Filter status FRP',
  className,
  onStatusChange,
  tabs = frpMobileStatusTabs,
}) {
  const selectedStatus = tabs.some((tab) => tab.id === activeStatus)
    ? activeStatus
    : tabs[0]?.id

  const handleChange = (_event, nextStatus) => {
    onStatusChange?.(nextStatus)
  }

  return (
    <Box className={joinClassNames('frp-desktop-tabs', className)} sx={{ width: '100%' }}>
      <Tabs
        value={selectedStatus}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={ariaLabel}
        className="frp-desktop-tabs__tabs"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={joinClassNames(
              'frp-desktop-tabs__tab',
              `frp-desktop-tabs__tab--${getStatusTabClassName(tab.id)}`,
            )}
            label={tab.label}
            value={tab.id}
          />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabsFrpDekstop
