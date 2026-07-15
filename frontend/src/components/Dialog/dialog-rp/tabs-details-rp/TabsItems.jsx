import DataTable from '../../../table/DataTable.jsx'
import { DetailSectionHeader, rpItemColumns } from './detailRpUtils.jsx'

function TabsItems({
  items = [],
  rpNumber = '',
  rpId = '',
  emptyMessage = 'Belum ada item RP.',
}) {
  return (
    <section className="frp-accordion-detail__items" aria-label="RP items">
      <DetailSectionHeader title="Items" count={items.length} />
      <DataTable
        rows={items}
        columns={rpItemColumns}
        getRowId={(item, index) => item?.id ?? index}
        tableLabel={`RP ${rpNumber ?? rpId ?? ''} items`}
        emptyMessage={emptyMessage}
        pagination={false}
        mobileCard={false}
        className="frp-accordion-detail__table"
      />
    </section>
  )
}

export default TabsItems
