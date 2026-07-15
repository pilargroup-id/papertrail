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
}) {
  const selectedStatus = tabs.some((tab) => tab.id === activeStatus)
    ? activeStatus
    : tabs[0]?.id

  const handleChange = (_event, nextStatus) => {
    onStatusChange?.(nextStatus)
  }

  return (
    <Box className={joinClassNames('rp-process-tabs', className)} sx={{ width: '100%' }}>
      <Tabs
        value={selectedStatus}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={ariaLabel}
        className="rp-process-tabs__tabs"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={joinClassNames(
              'rp-process-tabs__tab',
              `rp-process-tabs__tab--${getStatusTabClassName(tab.id)}`,
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
