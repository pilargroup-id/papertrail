import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

function DetailItemsTable({ items, columns, tableLabel, emptyMessage }) {
  return (
    <TableContainer
      tabIndex={0}
      role="region"
      aria-label={tableLabel}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
    >
      <Table
        size="small"
        aria-label={tableLabel}
        sx={{
          minWidth: 1040,
          '& .MuiTableCell-root': {
            px: 1.5,
            py: 1.5,
            verticalAlign: 'top',
            borderColor: 'divider',
            fontSize: '0.8125rem',
            overflowWrap: 'anywhere',
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            py: 1.25,
            bgcolor: 'rgba(52, 73, 104, 0.04)',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            verticalAlign: 'middle',
          },
          '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': { borderBottom: 0 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ width: 44 }}>#</TableCell>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align} sx={{ minWidth: column.minWidth }}>
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item?.id ?? index}>
              <TableCell align="center" sx={{ color: 'text.secondary' }}>{index + 1}</TableCell>
              {columns.map((column) => {
                const value = typeof column.accessor === 'function'
                  ? column.accessor(item, index)
                  : item[column.accessor]
                const displayValue = column.format ? column.format(value) : value
                const subtitle = column.subtitleAccessor?.(item)

                return (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{
                      whiteSpace: column.nowrap ? 'nowrap' : 'pre-wrap',
                      maxWidth: column.nowrap ? undefined : 280,
                      fontVariantNumeric: column.align === 'right' ? 'tabular-nums' : undefined,
                    }}
                  >
                    {column.render ? column.render(item, index) : displayValue ?? '-'}
                    {subtitle ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {subtitle}
                      </Typography>
                    ) : null}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                align="center"
                sx={{ py: '32px !important', color: 'text.secondary' }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default DetailItemsTable
