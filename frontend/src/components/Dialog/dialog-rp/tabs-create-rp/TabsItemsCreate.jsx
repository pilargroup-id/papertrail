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

import { Copy, Plus, Trash03 } from '../../../layoute/TemplateIcons.jsx'
import SectionHeader from '../../dialog-frp/tabs-create-frp/SectionHeader.jsx'
import {
  autocompleteSlotProps,
  autocompleteSlots,
} from '../../dialog-frp/tabs-create-frp/autocompleteStyles.js'

const itemTableSx = {
  minWidth: 1040,
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

function getBudgetMetaValue(option, metaKey) {
  const value = option?.meta?.[metaKey]

  return value === undefined || value === null || value === '' ? '' : value
}

function TabsItemsCreate({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  budgetOptions,
  updateItemValue,
  removeItem,
  addItem,
  duplicateLastItem,
}) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader title="Item List" />

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
                <TableCell sx={{ minWidth: 260 }}>Budget</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Memo</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Purchase Link</TableCell>
                <TableCell sx={{ width: 90 }} align="right">
                  Qty
                </TableCell>
                <TableCell sx={{ width: 150 }} align="right">
                  Unit Price (IDR)
                </TableCell>
                <TableCell sx={{ width: 140 }} align="right">
                  Amount (IDR)
                </TableCell>
                <TableCell sx={{ width: 52 }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {formValues.items.map((item, index) => {
                const quantity = toNumber(item.quantity)
                const unitPrice = toNumber(item.unit_price)
                const amount = quantity * unitPrice
                const selectedBudgetOption = getOptionByValue(budgetOptions, item.budget_id)
                const budgetAmount = formatRupiah(
                  getBudgetMetaValue(selectedBudgetOption, 'budgetAmount'),
                )
                const budgetRemaining = formatRupiah(
                  getBudgetMetaValue(selectedBudgetOption, 'budgetRemaining'),
                )
                const budgetError = fieldErrors[`items.${index}.budget_id`]
                const memoError = fieldErrors[`items.${index}.memo`]
                const purchaseLinkError = fieldErrors[`items.${index}.purchase_link`]
                const quantityError = fieldErrors[`items.${index}.quantity`]
                const unitPriceError = fieldErrors[`items.${index}.unit_price`]

                return (
                  <TableRow key={`rp-item-${index}`}>
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
                        value={selectedBudgetOption}
                        getOptionLabel={(option) => option?.label ?? ''}
                        isOptionEqualToValue={(option, value) =>
                          String(option.value) === String(value?.value)
                        }
                        disabled={isFormDisabled}
                        loading={isOptionsLoading}
                        noOptionsText="Budget aktif tidak ditemukan."
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
                          {budgetAmount ? (
                            <>
                              Budget {budgetAmount}
                              <Box component="span" sx={{ mx: 0.75, color: 'divider' }}>
                                |
                              </Box>
                            </>
                          ) : null}
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
                        placeholder="https://..."
                        value={item.purchase_link}
                        disabled={isFormDisabled}
                        error={Boolean(purchaseLinkError)}
                        helperText={purchaseLinkError}
                        onChange={(event) =>
                          updateItemValue(index, 'purchase_link', event.target.value)
                        }
                        slotProps={{
                          htmlInput: { 'aria-label': `Purchase link item ${index + 1}` },
                        }}
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
                      {formatRupiah(Number.isFinite(amount) ? amount : 0)}
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

export default TabsItemsCreate
