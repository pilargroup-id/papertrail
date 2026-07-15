import { DetailCard, DetailField, getFirstValue } from './detailRpUtils.jsx'

function TabsVendor({ rpDetail, className = '' }) {
  const vendorFields = [
    {
      label: 'Vendor',
      value: [
        getFirstValue(rpDetail, ['vendor_code_snapshot', 'vendor_code'], ''),
        getFirstValue(rpDetail, ['vendor_name_snapshot', 'vendor_name'], ''),
      ].filter(Boolean).join(' - ') || getFirstValue(rpDetail, ['vendor_id', 'vendorId']),
    },
    {
      label: 'Payment Category',
      value:
        getFirstValue(rpDetail, ['payment_category_name_snapshot', 'payment_category_name'], '') ||
        getFirstValue(rpDetail, ['payment_category_id', 'paymentCategoryId']),
    },
    {
      label: 'Destination Division',
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
      className: 'frp-accordion-detail__field--wide',
    },
  ]

  return (
    <DetailCard title="Vendor & Destination" className={className}>
      <div className="frp-accordion-detail__field-grid frp-accordion-detail__field-grid--document">
        {vendorFields.map((field) => (
          <DetailField
            key={field.label}
            label={field.label}
            value={field.value}
            className={field.className}
          />
        ))}
      </div>
    </DetailCard>
  )
}

export default TabsVendor
