import { useEffect, useRef, useState } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import api from '../../../../services/api.js'
import { Copy, Plus, Trash03 } from '../../../layoute/TemplateIcons.jsx'
import SectionHeader from './SectionHeader.jsx'
import { autocompleteSlotProps, autocompleteSlots } from './autocompleteStyles.js'

const fallbackCurrencyOptions = [{ value: 'IDR', label: 'IDR - Indonesian Rupiah' }]
const currenciesPageSize = 100
const maxCurrencyPages = 100

const itemTableSx = {
  minWidth: 880,
  tableLayout: 'fixed',
  '& .MuiTableCell-root': {
    px: 1,
    py: 1,
    verticalAlign: 'top',
    borderColor: 'divider',
    fontSize: '0.8125rem',
  },
  '& .MuiTableCell-root:first-of-type': { pl: 1.5 },
  '& .MuiTableCell-root:last-of-type': { pr: 1.5 },
  '& .MuiTableHead-root .MuiTableCell-root': {
    py: 1.25,
    bgcolor: 'rgba(52, 73, 104, 0.04)',
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
    borderBottom: 0,
  },
  '& .MuiInputBase-input': { fontSize: '0.8125rem' },
  '& input[type="number"]': { textAlign: 'right' },
  '& .MuiFormHelperText-root': { mx: 0, mt: 0.5, lineHeight: 1.35 },
}

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items
  }

  if (Array.isArray(response?.data?.data?.items)) {
    return response.data.data.items
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function toPositiveInteger(value) {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null
}

function getFirstPositiveInteger(values) {
  for (const value of values) {
    const numberValue = toPositiveInteger(value)

    if (numberValue !== null) {
      return numberValue
    }
  }

  return null
}

function getTotalCurrencyPages(response, fallbackRowsCount) {
  const data = getResponseData(response)
  const pagination = data?.pagination ?? data?.meta ?? response?.pagination ?? response?.meta ?? {}
  const totalPages = getFirstPositiveInteger([
    data?.total_pages,
    data?.totalPages,
    data?.last_page,
    data?.lastPage,
    pagination?.total_pages,
    pagination?.totalPages,
    pagination?.last_page,
    pagination?.lastPage,
  ])

  if (totalPages !== null) {
    return totalPages
  }

  const totalRows = getFirstPositiveInteger([
    data?.total,
    data?.total_rows,
    data?.totalRows,
    data?.total_items,
    data?.totalItems,
    pagination?.total,
    pagination?.total_rows,
    pagination?.totalRows,
    pagination?.total_items,
    pagination?.totalItems,
  ])

  if (totalRows !== null) {
    return Math.max(1, Math.ceil(totalRows / currenciesPageSize))
  }

  return fallbackRowsCount >= currenciesPageSize ? null : 1
}

async function loadAllActiveCurrencies(signal) {
  const currencies = []
  let page = 1
  let totalPages = null

  while (page <= (totalPages ?? maxCurrencyPages)) {
    const response = await api.currencies.list(
      {
        page,
        limit: currenciesPageSize,
        is_active: 1,
      },
      {
        signal,
      },
    )
    const rows = getRowsFromResponse(response)

    currencies.push(...rows)
    totalPages = totalPages ?? getTotalCurrencyPages(response, rows.length)

    if (totalPages === null && rows.length < currenciesPageSize) {
      break
    }

    if (totalPages !== null && page >= totalPages) {
      break
    }

    page += 1
  }

  return currencies
}

function mapCurrencyOptions(currencies) {
  return currencies
    .filter((currency) => Number(currency?.is_active ?? 1) === 1)
    .map((currency) => {
      const code = currency?.code
      const name = currency?.name

      return {
        value: code,
        label: [code, name].filter(Boolean).join(' - ') || code,
      }
    })
    .filter((option) => option.value)
}

function isIntegerInputValue(value) {
  return value === '' || /^\d+$/.test(value)
}

function preventNonIntegerInput(event) {
  if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
    event.preventDefault()
  }
}

function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return ''
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function getSelectedBudgetOption(budgetOptions, budgetId) {
  return budgetOptions.find((option) => String(option.value) === String(budgetId))
}

function getBudgetMetaValue(option, metaKey) {
  const value = option?.meta?.[metaKey]

  return value === undefined || value === null || value === '' ? '' : value
}

function TabsItems({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  budgetOptions,
  updateValue,
  updateItemValue,
  removeItem,
  addItem,
  duplicateLastItem,
  preserveLoadedExchangeRate = false,
}) {
  const [currencyOptions, setCurrencyOptions] = useState(fallbackCurrencyOptions)
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(false)
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false)
  const [exchangeRateMessage, setExchangeRateMessage] = useState('')
  const currencyCode = String(formValues.currency_code || 'IDR').trim().toUpperCase()
  const exchangeRate = toNumber(formValues.exchange_rate || 1)
  const wasOptionsLoadingRef = useRef(isOptionsLoading)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCurrencies() {
      setIsCurrenciesLoading(true)

      try {
        const currencies = await loadAllActiveCurrencies(controller.signal)
        const nextCurrencyOptions = mapCurrencyOptions(currencies)

        setCurrencyOptions(
          nextCurrencyOptions.length > 0 ? nextCurrencyOptions : fallbackCurrencyOptions,
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setCurrencyOptions(fallbackCurrencyOptions)
      } finally {
        if (!controller.signal.aborted) {
          setIsCurrenciesLoading(false)
        }
      }
    }

    loadCurrencies()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const wasOptionsLoading = wasOptionsLoadingRef.current
    wasOptionsLoadingRef.current = isOptionsLoading

    if (!currencyCode) {
      updateValue('exchange_rate', '')
      setExchangeRateMessage('')
      return undefined
    }

    if (currencyCode === 'IDR') {
      updateValue('exchange_rate', '1')
      setExchangeRateMessage('')
      return undefined
    }

    if (preserveLoadedExchangeRate && wasOptionsLoading && !isOptionsLoading) {
      // An existing FRP just finished loading: keep its saved exchange rate
      // instead of overwriting it with the latest rate.
      return undefined
    }

    const controller = new AbortController()

    async function loadLatestExchangeRate() {
      setIsExchangeRateLoading(true)
      setExchangeRateMessage('')

      try {
        const response = await api.currencies.exchangeRates.latest(
          {
            currency_code: currencyCode,
            max_date: formValues.frp_date,
          },
          {
            signal: controller.signal,
          },
        )
        const rateData = getResponseData(response)
        const latestExchangeRate = rateData?.exchange_rate ?? rateData?.middle_rate

        if (
          latestExchangeRate === undefined ||
          latestExchangeRate === null ||
          latestExchangeRate === ''
        ) {
          updateValue('exchange_rate', '')
          setExchangeRateMessage('Exchange rate tidak ditemukan.')
          return
        }

        updateValue('exchange_rate', String(latestExchangeRate))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        updateValue('exchange_rate', '')
        setExchangeRateMessage(error.message || 'Gagal memuat exchange rate.')
      } finally {
        if (!controller.signal.aborted) {
          setIsExchangeRateLoading(false)
        }
      }
    }

    loadLatestExchangeRate()

    return () => {
      controller.abort()
    }
  }, [currencyCode, formValues.frp_date, isOptionsLoading, preserveLoadedExchangeRate])

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader
        title="Currency & Summary"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          disableClearable
          options={currencyOptions}
          value={getOptionByValue(currencyOptions, formValues.currency_code) ?? fallbackCurrencyOptions[0]}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled || isCurrenciesLoading}
          loading={isCurrenciesLoading}
          onChange={(_, option) => updateValue('currency_code', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Currency"
              placeholder={isCurrenciesLoading ? 'Memuat currency...' : 'Pilih currency'}
              error={Boolean(fieldErrors.currency_code)}
              helperText={fieldErrors.currency_code}
            />
          )}
        />

        <TextField
          fullWidth
          size="small"
          required
          type="number"
          label="Exchange Rate"
          placeholder={isExchangeRateLoading ? 'Memuat exchange rate...' : 'Exchange rate'}
          value={formValues.exchange_rate}
          disabled={isFormDisabled || isExchangeRateLoading}
          error={Boolean(fieldErrors.exchange_rate)}
          helperText={fieldErrors.exchange_rate || exchangeRateMessage}
          onChange={(event) => updateValue('exchange_rate', event.target.value)}
          slotProps={{ htmlInput: { min: 0, step: '0.0001' } }}
        />
      </Box>

      <Box sx={{ height: 32 }} />

      <SectionHeader
        title="Item List"
      />

      <Stack spacing={2}>
        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
          }}
        >
          <Table size="small" sx={itemTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 44 }} align="center">
                  #
                </TableCell>
                <TableCell sx={{ minWidth: 280 }}>Budget</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Memo</TableCell>
                <TableCell sx={{ width: 96 }} align="right">
                  Qty
                </TableCell>
                <TableCell sx={{ width: 170 }} align="right">
                  Unit Price ({currencyCode || 'IDR'})
                </TableCell>
                <TableCell sx={{ width: 150 }} align="right">
                  Amount (IDR)
                </TableCell>
                <TableCell sx={{ width: 52 }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {formValues.items.map((item, index) => {
                const quantity = toNumber(item.quantity)
                const unitPrice = toNumber(item.unit_price)
                const amountIdr = quantity * unitPrice * exchangeRate
                const selectedBudgetOption = getSelectedBudgetOption(budgetOptions, item.budget_id)
                const budgetAmount = formatRupiah(
                  getBudgetMetaValue(selectedBudgetOption, 'budgetAmount'),
                )
                const budgetRemaining = formatRupiah(
                  getBudgetMetaValue(selectedBudgetOption, 'budgetRemaining'),
                )
                const budgetError = fieldErrors[`items.${index}.budget_id`]
                const memoError = fieldErrors[`items.${index}.memo`]
                const quantityError = fieldErrors[`items.${index}.quantity`]
                const unitPriceError = fieldErrors[`items.${index}.unit_price`]

                return (
                  <TableRow key={`frp-item-${index}`}>
                    <TableCell align="center" sx={{ color: 'text.secondary', pt: '14px' }}>
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <Autocomplete
                        slots={autocompleteSlots}
                        slotProps={autocompleteSlotProps}
                        fullWidth
                        size="small"
                        options={budgetOptions}
                        value={getOptionByValue(budgetOptions, item.budget_id)}
                        getOptionLabel={(option) => option?.label ?? ''}
                        isOptionEqualToValue={(option, value) =>
                          String(option.value) === String(value?.value)
                        }
                        disabled={isFormDisabled}
                        loading={isOptionsLoading}
                        onChange={(_, option) =>
                          updateItemValue(index, 'budget_id', option?.value ?? '')
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={isOptionsLoading ? 'Memuat budget...' : 'Pilih budget'}
                            error={Boolean(budgetError)}
                            helperText={budgetError}
                          />
                        )}
                      />
                      {selectedBudgetOption && (budgetAmount || budgetRemaining) ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{ mt: 0.5, lineHeight: 1.4 }}
                        >
                          Budget {budgetAmount || '-'}
                          <Box component="span" sx={{ mx: 0.75, color: 'divider' }}>
                            |
                          </Box>
                          Sisa {budgetRemaining || '-'}
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Memo item"
                        value={item.memo}
                        disabled={isFormDisabled}
                        error={Boolean(memoError)}
                        helperText={memoError}
                        onChange={(event) => updateItemValue(index, 'memo', event.target.value)}
                        slotProps={{ htmlInput: { 'aria-label': `Memo item ${index + 1}` } }}
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0"
                        value={item.quantity}
                        disabled={isFormDisabled}
                        error={Boolean(quantityError)}
                        helperText={quantityError}
                        onKeyDown={preventNonIntegerInput}
                        onPaste={(event) => {
                          if (!isIntegerInputValue(event.clipboardData.getData('text'))) {
                            event.preventDefault()
                          }
                        }}
                        onChange={(event) => {
                          if (isIntegerInputValue(event.target.value)) {
                            updateItemValue(index, 'quantity', event.target.value)
                          }
                        }}
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            step: 1,
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            'aria-label': `Quantity item ${index + 1}`,
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0"
                        value={item.unit_price}
                        disabled={isFormDisabled}
                        error={Boolean(unitPriceError)}
                        helperText={unitPriceError}
                        onChange={(event) =>
                          updateItemValue(index, 'unit_price', event.target.value)
                        }
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            step: 1,
                            'aria-label': `Unit price item ${index + 1}`,
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{ pt: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {formatRupiah(Number.isFinite(amountIdr) ? amountIdr : 0)}
                    </TableCell>

                    <TableCell align="center" sx={{ pt: '8px' }}>
                      <IconButton
                        size="small"
                        aria-label={`Hapus item ${index + 1}`}
                        disabled={isFormDisabled || formValues.items.length === 1}
                        onClick={() => removeItem(index)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                      >
                        <Trash03 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            disabled={isFormDisabled}
            onClick={addItem}
            sx={{ textTransform: 'none' }}
          >
            Add Item
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<Copy size={16} />}
            disabled={isFormDisabled}
            onClick={duplicateLastItem}
            sx={{ textTransform: 'none' }}
          >
            Duplicate
          </Button>
        </Stack>

        {fieldErrors.items ? (
          <Typography variant="caption" color="error">
            {fieldErrors.items}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

export default TabsItems
