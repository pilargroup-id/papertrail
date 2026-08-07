function getDisplayValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

function createMobileCardRp({
  formatDateTime,
  formatRupiah,
  getFrpStatusLabel,
  getFrpStatusVariant,
  onMoreInfo,
} = {}) {
  return {
    className: 'rp-mobile-card',
    header: {
      id: (rp) => getDisplayValue(rp?.rp_number),
      status: {
        label: (rp) => getFrpStatusLabel?.(rp) ?? getDisplayValue(rp?.status),
        variant: (rp) => getFrpStatusVariant?.(rp) ?? 'default',
      },
    },
    title: '',
    subtitle: () => '',
    rows: [
      {
        key: 'requestBy',
        label: 'Request By',
        value: (rp) => getDisplayValue(rp?.requested_by_name),
      },
      {
        key: 'destination',
        label: 'Destination',
        value: (rp) => getDisplayValue(rp?.pic_name),
      },
      {
        key: 'vendor',
        label: 'Vendor',
        value: (rp) => getDisplayValue(rp?.vendor_name_snapshot),
      },
      {
        key: 'totalAmount',
        label: 'Total Amount',
        value: (rp) =>
          typeof formatRupiah === 'function'
            ? formatRupiah(rp?.total_amount)
            : getDisplayValue(rp?.total_amount),
      },
      {
        key: 'createdAt',
        label: 'Date',
        value: (rp) =>
          typeof formatDateTime === 'function'
            ? formatDateTime(rp?.created_at)
            : getDisplayValue(rp?.created_at),
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
            value: (rp) => getDisplayValue(rp?.description),
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

export default createMobileCardRp
