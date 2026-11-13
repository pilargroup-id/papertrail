import DetailFields from '../../details/DetailFields.jsx'
import DetailSection from '../../details/DetailSection.jsx'

import {
  formatDateTime,
  formatDateValue,
  formatRupiah,
  formatStatusLabel,
  getFirstValue,
} from './detailRpUtils.jsx'

function TabsInformation({ rpDetail }) {
  const summaryFields = [
    {
      label: 'RP Number',
      value: getFirstValue(rpDetail, ['rp_number', 'rpNumber', 'id']),
    },
    {
      label: 'Request By',
      value: getFirstValue(
        rpDetail,
        ['requested_by_name', 'request_by_name', 'request_by', 'created_by_name', 'created_by'],
      ),
    },
    {
      label: 'Company',
      value: [
        getFirstValue(rpDetail, ['company_code_snapshot', 'company_code'], ''),
        getFirstValue(rpDetail, ['company_name_snapshot', 'company_name'], ''),
      ].filter(Boolean).join(' - ') || '-',
    },
    {
      label: 'Division',
      value: [
        getFirstValue(rpDetail, ['department_code_snapshot', 'department_code'], ''),
        getFirstValue(rpDetail, ['department_name_snapshot', 'department_name'], ''),
      ].filter(Boolean).join(' - ') || '-',
    },
    {
      label: 'RP Date',
      value: formatDateValue(getFirstValue(rpDetail, ['date_required', 'dateRequired'], '')),
    },
    {
      label: 'Status',
      value: formatStatusLabel(getFirstValue(rpDetail, ['status'], '')),
    },
    {
      label: 'Total Amount',
      value: formatRupiah(getFirstValue(rpDetail, ['total_amount', 'totalAmount'], '')),
    },
    {
      label: 'Created At',
      value: formatDateTime(getFirstValue(rpDetail, ['created_at', 'createdAt'], '')),
    },
    {
      label: 'Updated At',
      value: formatDateTime(getFirstValue(rpDetail, ['updated_at', 'updatedAt'], '')),
    },
    {
      label: 'Description',
      value: getFirstValue(rpDetail, ['description']),
      fullWidth: true,
    },
  ]

  return (
    <DetailSection title="RP Information">
      <DetailFields fields={summaryFields} />
    </DetailSection>
  )
}

export default TabsInformation
