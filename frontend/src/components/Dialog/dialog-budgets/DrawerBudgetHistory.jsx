import { useEffect, useId, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import api from '../../../services/api.js'
import DetailDrawer from '../details/DetailDrawer.jsx'
import DetailFields from '../details/DetailFields.jsx'
import DetailSection from '../details/DetailSection.jsx'
import { formatBalance, getRowsFromResponse, toCents } from './budgetFormUtils.js'

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50]
const positiveColor = '#14675e'
const negativeColor = '#b42318'

const transactionTypeMeta = {
  TRANSFER: { label: 'Transfer', color: '#1d4ed8', background: 'rgba(29, 78, 216, 0.08)' },
  ADJUSTMENT: { label: 'Adjustment', color: '#7a4b00', background: 'rgba(181, 113, 0, 0.1)' },
}

const movementMeta = {
  TRANSFER_OUT: { label: 'Transfer Keluar', sign: -1 },
  TRANSFER_IN: { label: 'Transfer Masuk', sign: 1 },
  INCREASE: { label: 'Penambahan', sign: 1 },
  DECREASE: { label: 'Pengurangan', sign: -1 },
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date)
}

function formatSignedAmount(amount, sign) {
  const cents = toCents(amount)

  return cents === null ? '—' : `${sign < 0 ? '−' : '+'}${formatBalance(Math.abs(cents))}`
}

function getSign(movementType) {
  return movementMeta[movementType]?.sign ?? 1
}

function getBudgetCode(budgetId, lookup) {
  const budget = lookup.get(String(budgetId))

  return budget ? `${budget.budget_code} — ${budget.project_name}` : `Budget #${budgetId ?? '-'}`
}

function TypeChip({ type }) {
  const meta = transactionTypeMeta[type] ?? { label: type ?? '-', color: 'text.secondary', background: 'action.hover' }

  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{ height: 24, fontWeight: 700, color: meta.color, bgcolor: meta.background, borderRadius: '6px' }}
    />
  )
}

function MovementChip({ type }) {
  const meta = movementMeta[type] ?? { label: type ?? '-', sign: 1 }
  const color = meta.sign < 0 ? negativeColor : positiveColor

  return (
    <Chip
      size="small"
      variant="outlined"
      label={meta.label}
      sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, color, borderColor: color, borderRadius: '6px' }}
    />
  )
}

function BalanceChange({ before, after }) {
  return (
    <>
      <Box component="span" sx={{ color: 'text.secondary' }}>{formatBalance(toCents(before))}</Box>
      {' → '}
      <Box component="span" sx={{ fontWeight: 600 }}>{formatBalance(toCents(after))}</Box>
    </>
  )
}

function TransactionLinesTable({ lines, lookup, budgetId }) {
  return (
    <TableContainer
      tabIndex={0}
      role="region"
      aria-label="Rincian pergerakan budget"
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
    >
      <Table
        size="small"
        sx={{
          minWidth: 640,
          '& .MuiTableCell-root': {
            px: 1.5,
            py: 1,
            borderColor: 'divider',
            fontSize: '0.8125rem',
            verticalAlign: 'top',
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            bgcolor: 'rgba(52, 73, 104, 0.04)',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          },
          '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': { borderBottom: 0 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Budget</TableCell>
            <TableCell>Pergerakan</TableCell>
            <TableCell align="right">Nominal</TableCell>
            <TableCell align="right">Budget Amount</TableCell>
            <TableCell align="right">Budget Remaining</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => {
            const sign = getSign(line.movement_type)
            const isCurrentBudget = String(line.budget_id) === String(budgetId)

            return (
              <TableRow key={line.id}>
                <TableCell sx={{ overflowWrap: 'anywhere', fontWeight: isCurrentBudget ? 600 : 400 }}>
                  {getBudgetCode(line.budget_id, lookup)}
                </TableCell>
                <TableCell><MovementChip type={line.movement_type} /></TableCell>
                <TableCell
                  align="right"
                  sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: sign < 0 ? negativeColor : positiveColor }}
                >
                  {formatSignedAmount(line.amount, sign)}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  <BalanceChange before={line.budget_amount_before} after={line.budget_amount_after} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  <BalanceChange before={line.budget_remaining_before} after={line.budget_remaining_after} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function TransactionCard({ transaction, lookup, budgetId }) {
  const lines = transaction.lines ?? []
  const ownLine = lines.find((line) => String(line.budget_id) === String(budgetId)) ?? lines[0]
  const sign = getSign(ownLine?.movement_type)
  const counterpartId = transaction.transaction_type === 'TRANSFER'
    ? (String(transaction.source_budget_id) === String(budgetId)
        ? transaction.destination_budget_id
        : transaction.source_budget_id)
    : null
  const counterpartLabel = counterpartId === null
    ? null
    : `${sign < 0 ? 'Ke' : 'Dari'} ${getBudgetCode(counterpartId, lookup)}`

  return (
    <Box
      component="article"
      sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: '8px', minWidth: 0 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <TypeChip type={transaction.transaction_type} />
            {ownLine ? <MovementChip type={ownLine.movement_type} /> : null}
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(transaction.created_at)}
            </Typography>
          </Stack>
          {counterpartLabel ? (
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, overflowWrap: 'anywhere' }}>
              {counterpartLabel}
            </Typography>
          ) : null}
          <Typography variant="body2" sx={{ mt: 0.75, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
            {transaction.reason || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Oleh {transaction.created_by_user_name || '-'}
          </Typography>
        </Box>
        <Typography
          variant="subtitle1"
          sx={{
            flexShrink: 0,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            color: ownLine ? (sign < 0 ? negativeColor : positiveColor) : 'text.primary',
          }}
        >
          {ownLine ? formatSignedAmount(ownLine.amount, sign) : formatBalance(toCents(transaction.amount))}
        </Typography>
      </Stack>

      {lines.length > 0 ? (
        <Box sx={{ mt: 1.5 }}>
          <TransactionLinesTable lines={lines} lookup={lookup} budgetId={budgetId} />
        </Box>
      ) : null}
    </Box>
  )
}

function DrawerBudgetHistory({ isOpen, budget, budgetRows = [], onClose }) {
  const titleId = useId()
  const budgetId = budget?.id
  const [transactions, setTransactions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const lookup = new Map(budgetRows.map((row) => [String(row.id), row]))

  useEffect(() => {
    if (!isOpen || budgetId === undefined || budgetId === null) {
      return undefined
    }

    const controller = new AbortController()

    async function loadTransactions() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await api.budgets.budgetTransactions(
          budgetId,
          { page: page + 1, limit: rowsPerPage },
          { signal: controller.signal },
        )

        if (!controller.signal.aborted) {
          setTransactions(getRowsFromResponse(response))
          setTotal(Number(response?.meta?.total) || 0)
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setTransactions([])
        setTotal(0)
        setErrorMessage(error.message || 'Gagal memuat history budget.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()

    return () => controller.abort()
  }, [isOpen, budgetId, page, rowsPerPage])

  const budgetFields = [
    { label: 'Budget Code', value: budget?.budget_code },
    { label: 'Budget Name', value: budget?.project_name },
    { label: 'Budget Type', value: budget?.budget_type_name },
    { label: 'Company', value: budget?.company_name_snapshot },
    { label: 'Department', value: budget?.department_name_snapshot },
    { label: 'Class', value: budget?.department_class_snapshot },
    { label: 'Budget Amount', value: formatBalance(toCents(budget?.budget_amount)) },
    { label: 'Reserved', value: formatBalance(toCents(budget?.budget_reserved)) },
    { label: 'Used', value: formatBalance(toCents(budget?.budget_used)) },
  ]

  return (
    <DetailDrawer
      isOpen={isOpen}
      titleId={titleId}
      eyebrow="Budget History"
      title={`History ${budget?.budget_code ?? 'Budget'}`}
      isLoading={isLoading}
      loadingLabel="Memuat history budget"
      errorMessage={errorMessage}
      onClose={onClose}
      footer={(
        <>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Budget Remaining (IDR)
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
              {formatBalance(toCents(budget?.budget_remaining))}
            </Typography>
          </Box>
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            labelRowsPerPage="Baris"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
            sx={{
              border: 0,
              overflow: 'visible',
              '& .MuiTablePagination-toolbar': { minHeight: 44, px: 0 },
              '& .MuiTablePagination-spacer': { display: 'none' },
            }}
          />
        </>
      )}
    >
      <DetailSection title="Budget Information">
        <DetailFields fields={budgetFields} />
      </DetailSection>
      <DetailSection title={`Riwayat Transfer & Adjustment (${total})`}>
        <Stack spacing={1.5}>
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} lookup={lookup} budgetId={budgetId} />
          ))}
          {!isLoading && !errorMessage && transactions.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
                color: 'text.secondary',
                fontSize: '0.875rem',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: '8px',
              }}
            >
              Belum ada transfer atau adjustment untuk budget ini.
            </Box>
          ) : null}
        </Stack>
      </DetailSection>
    </DetailDrawer>
  )
}

export default DrawerBudgetHistory
