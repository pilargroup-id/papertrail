import { Box, Tab, Tabs } from '@mui/material'

const rpProcessStatusTabs = [
  { id: 'PENDING_REQUESTER_MANAGER', label: 'Requester Manager' },
  { id: 'PENDING_DESTINATION_CHECKER', label: 'Destination Checker' },
  { id: 'PENDING_DESTINATION_MANAGER', label: 'Destination Manager' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'VOIDED', label: 'Voided' },
]

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function getStatusTabClassName(status) {
  return String(status).toLowerCase().replace(/_/g, '-')
}

function getTabLabel(tab) {
  return typeof tab.count === 'number' ? `${tab.label} (${tab.count})` : tab.label
}

function TabsProcessRp({
  activeStatus = rpProcessStatusTabs[0].id,
  ariaLabel = 'Filter status RP',
  className,
  onStatusChange,
  tabs = rpProcessStatusTabs,
  variant = 'process',
}) {
  const selectedStatus = tabs.some((tab) => tab.id === activeStatus)
    ? activeStatus
    : tabs[0]?.id
  const isDesktopVariant = variant === 'desktop'
  const rootClassName = isDesktopVariant ? 'frp-desktop-tabs' : 'rp-process-tabs'
  const tabsClassName = isDesktopVariant ? 'frp-desktop-tabs__tabs' : 'rp-process-tabs__tabs'
  const tabClassName = isDesktopVariant ? 'frp-desktop-tabs__tab' : 'rp-process-tabs__tab'

  const handleChange = (_event, nextStatus) => {
    onStatusChange?.(nextStatus)
  }

  return (
    <Box className={joinClassNames(rootClassName, className)} sx={{ width: '100%' }}>
      <Tabs
        value={selectedStatus}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={ariaLabel}
        className={tabsClassName}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={joinClassNames(
              tabClassName,
              `${tabClassName}--${getStatusTabClassName(tab.id)}`,
            )}
            label={getTabLabel(tab)}
            value={tab.id}
          />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabsProcessRp
