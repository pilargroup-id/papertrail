import Link from '@mui/material/Link'

import DetailItemsTable from '../../details/DetailItemsTable.jsx'
import DetailSection from '../../details/DetailSection.jsx'
import { getFirstValue, rpItemColumns } from './detailRpUtils.jsx'

const itemColumns = rpItemColumns.map((column) => ({
  ...column,
  header: ['unitPrice', 'amount'].includes(column.key) ? `${column.header} (IDR)` : column.header,
  align: ['quantity', 'unitPrice', 'amount'].includes(column.key) ? 'right' : 'left',
  ...(column.key === 'purchaseLink' ? {
    render: (item) => {
      const url = String(getFirstValue(item, ['purchase_link', 'purchaseLink'], '')).trim()

      return url ? (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'var(--accent-teal, #2a9d8f)', fontWeight: 600 }}
        >
          Open Link
        </Link>
      ) : '-'
    },
  } : {}),
}))

function TabsItems({
  items = [],
  rpNumber = '',
  rpId = '',
  emptyMessage = 'Belum ada item RP.',
}) {
  return (
    <DetailSection title={`Item List (${items.length})`}>
      <DetailItemsTable
        items={items}
        columns={itemColumns}
        tableLabel={`RP ${rpNumber ?? rpId ?? ''} items`}
        emptyMessage={emptyMessage}
      />
    </DetailSection>
  )
}

export default TabsItems
