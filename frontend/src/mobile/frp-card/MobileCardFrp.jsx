function getDisplayValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

function createMobileCardFrp({
  formatDateTime,
  formatRupiah,
  getFrpStatusLabel,
  getFrpStatusVariant,
  onMoreInfo,
} = {}) {
  return {
    className: 'frp-mobile-card',
    header: {
      id: (frp) => getDisplayValue(frp?.frp_number),
      status: {
        label: (frp) => getFrpStatusLabel?.(frp) ?? getDisplayValue(frp?.status),
        variant: (frp) => getFrpStatusVariant?.(frp) ?? 'default',
      },
    },
    title: '',
    rows: [
      {
        key: 'requestBy',
        label: 'Request By',
        value: (frp) => getDisplayValue(frp?.requested_by_name),
      },
      {
        key: 'vendor',
        label: 'Vendor',
        value: (frp) => getDisplayValue(frp?.vendor_name_snapshot),
      },
      {
        key: 'totalAmount',
        label: 'Total Amount',
        value: (frp) =>
          typeof formatRupiah === 'function'
            ? formatRupiah(frp?.total_amount)
            : getDisplayValue(frp?.total_amount),
      },
      {
        key: 'createdAt',
        label: 'Date',
        value: (frp) =>
          typeof formatDateTime === 'function'
            ? formatDateTime(frp?.created_at)
            : getDisplayValue(frp?.created_at),
      },
    ],
    sections: [
      {
        key: 'description',
        title: 'Description',
        wide: true,
        fields: [
          {
            key: 'description',
            label: 'Description',
            value: (frp) => getDisplayValue(frp?.description),
          },
        ],
      },
    ],
    expandableTitle: 'More Info',
    expandableOnClick: typeof onMoreInfo === 'function' ? onMoreInfo : undefined,
    defaultExpanded: false,
    metadata: { items: [] },
  }
}

export default createMobileCardFrp
