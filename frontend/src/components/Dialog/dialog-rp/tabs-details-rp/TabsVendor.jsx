import DetailFields from '../../details/DetailFields.jsx'
import DetailSection from '../../details/DetailSection.jsx'
import { getFirstValue } from './detailRpUtils.jsx'

function TabsVendor({ rpDetail }) {
  const vendorFields = [
    {
      label: 'Vendor',
      value: [
        getFirstValue(rpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
        getFirstValue(rpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
      ].filter(Boolean).join(' - ') || getFirstValue(rpDetail, ['vendor_id', 'vendorId']),
    },
    {
      label: 'Category Payment',
      value:
        getFirstValue(rpDetail, ['payment_category_name_snapshot', 'payment_category_name'], '') ||
        getFirstValue(rpDetail, ['payment_category_id', 'paymentCategoryId']),
    },
    {
      label: 'Division To Process',
      value: [
        getFirstValue(rpDetail, ['destination_department_code_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_name_snapshot'], ''),
        getFirstValue(rpDetail, ['destination_department_class_snapshot'], ''),
      ].filter(Boolean).join(' - ') ||
        getFirstValue(rpDetail, ['destination_department_id', 'destinationDepartmentId']),
    },
    {
      label: 'PIC',
      value: getFirstValue(rpDetail, ['pic_name', 'picName']),
    },
    {
      label: 'Vendor Source',
      value: getFirstValue(rpDetail, ['vendor_source', 'vendorSource']),
    },
    {
      label: 'Notes',
      value: getFirstValue(rpDetail, ['notes']),
      fullWidth: true,
    },
  ]

  return (
    <DetailSection title="Vendor & Process Information">
      <DetailFields fields={vendorFields} />
    </DetailSection>
  )
}

export default TabsVendor
