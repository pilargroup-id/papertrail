export const RP_MOBILE_STATUS_ALL = 'ALL'
export const RP_MOBILE_DEFAULT_STATUS = RP_MOBILE_STATUS_ALL

export const rpMobileStatusTabs = [
  { id: RP_MOBILE_STATUS_ALL, label: 'All' },
  { id: 'PENDING_REQUESTER_MANAGER', label: 'Requester Manager' },
  { id: 'PENDING_DESTINATION_CHECKER', label: 'Destination Checker' },
  { id: 'PENDING_DESTINATION_MANAGER', label: 'Destination Manager' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'VOIDED', label: 'Voided' },
]
