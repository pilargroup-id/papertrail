import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded'

import { Trash03 } from '../../../layoute/TemplateIcons.jsx'
import {
  autocompleteSlotProps,
  autocompleteSlots,
} from '../../dialog-frp/tabs-create-frp/autocompleteStyles.js'
import { formatRupiah, getItemFrpAmount } from './frpItemsFromRpUtils.js'

const tableSx = {
  minWidth: 1080,
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

// Sel teks diberi padding atas agar sejajar dengan input (size small) di baris yang sama.
const textCellSx = { pt: '14px !important', overflowWrap: 'anywhere' }
const numberCellSx = { pt: '14px !important', whiteSpace: 'nowrap' }

const iconButtonSx = {
  width: 28,
  height: 28,
  borderRadius: '6px',
}

const tealIconButtonSx = {
  ...iconButtonSx,
  color: 'var(--accent-teal, #2a9d8f)',
  bgcolor: 'rgba(42, 157, 143, 0.08)',
  '&:hover': { bgcolor: 'rgba(42, 157, 143, 0.16)' },
}

const deleteIconButtonSx = {
  ...iconButtonSx,
  color: 'text.secondary',
  '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' },
}

const outlinedButtonSx = {
  flexShrink: 0,
  height: 34,
  px: 1.75,
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  color: 'var(--accent-teal, #2a9d8f)',
  borderColor: 'rgba(42, 157, 143, 0.5)',
  '&:hover': {
    borderColor: 'var(--accent-teal, #2a9d8f)',
    bgcolor: 'rgba(42, 157, 143, 0.06)',
  },
}

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function getItemLabel(item) {
  return [item.budgetCode, item.projectName].filter(Boolean).join(' - ') || '-'
}

function RpItemCells({ item, index, fieldErrors, isFormDisabled, updateItem, copyItemAmount }) {
  const frpAmountError = fieldErrors[`items.${index}.frp_amount`]

  return (
    <>
      <TableCell sx={textCellSx}>{getItemLabel(item)}</TableCell>
      <TableCell sx={textCellSx}>{item.memo || '-'}</TableCell>
      <TableCell align="right" sx={numberCellSx}>
        {item.quantity}
      </TableCell>
      <TableCell align="right" sx={numberCellSx}>
        {formatRupiah(item.unitPrice)}
      </TableCell>
      <TableCell align="right" sx={{ ...numberCellSx, fontWeight: 600 }}>
        <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', mt: '-5px' }}>
          <Box component="span" sx={{ pt: '5px' }}>
            {formatRupiah(item.rpAmount)}
          </Box>
          <Tooltip title="Salin ke FRP Amount" placement="top" arrow>
            <span>
              <IconButton
                size="small"
                aria-label={`Salin RP amount item ${index + 1}`}
                disabled={isFormDisabled}
                onClick={() => copyItemAmount(index)}
                sx={tealIconButtonSx}
              >
                <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
      <TableCell>
        <TextField
          fullWidth
          size="small"
          type="number"
          required
          placeholder="0"
          value={item.frpAmount}
          disabled={isFormDisabled}
          error={Boolean(frpAmountError)}
          helperText={frpAmountError}
          onChange={(event) => updateItem(index, { frpAmount: event.target.value })}
          slotProps={{
            htmlInput: { min: 0, step: 1, 'aria-label': `FRP amount item ${index + 1}` },
          }}
        />
      </TableCell>
    </>
  )
}

function NewItemCells({ item, index, fieldErrors, isFormDisabled, isOptionsLoading, budgetOptions, updateItem }) {
  const budgetError = fieldErrors[`items.${index}.budget_id`]
  const quantityError = fieldErrors[`items.${index}.quantity`]
  const unitPriceError = fieldErrors[`items.${index}.unit_price`]
  const selectedBudget = getOptionByValue(budgetOptions, item.budgetId)

  return (
    <>
      <TableCell>
        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={budgetOptions}
          value={selectedBudget}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => updateItem(index, { budgetId: option?.value ?? '' })}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              placeholder="Pilih budget"
              error={Boolean(budgetError)}
              helperText={
                budgetError ||
                (selectedBudget?.meta?.budgetRemaining !== undefined
                  ? `Sisa ${formatRupiah(selectedBudget.meta.budgetRemaining)}`
                  : '')
              }
            />
          )}
        />
      </TableCell>
      <TableCell>
        <TextField
          fullWidth
          size="small"
          placeholder="Memo"
          value={item.memo}
          disabled={isFormDisabled}
          onChange={(event) => updateItem(index, { memo: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <TextField
          fullWidth
          size="small"
          type="number"
          required
          value={item.quantity}
          disabled={isFormDisabled}
          error={Boolean(quantityError)}
          helperText={quantityError}
          onChange={(event) => updateItem(index, { quantity: event.target.value })}
          slotProps={{ htmlInput: { min: 0, step: 1, 'aria-label': `Qty item ${index + 1}` } }}
        />
      </TableCell>
      <TableCell>
        <TextField
          fullWidth
          size="small"
          type="number"
          required
          placeholder="0"
          value={item.unitPrice}
          disabled={isFormDisabled}
          error={Boolean(unitPriceError)}
          helperText={unitPriceError}
          onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
          slotProps={{
            htmlInput: { min: 0, step: 1, 'aria-label': `Unit price item ${index + 1}` },
          }}
        />
      </TableCell>
      <TableCell align="right" sx={numberCellSx}>
        <Chip
          label="Item baru"
          size="small"
          sx={{
            height: 20,
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#344968',
            bgcolor: 'rgba(52, 73, 104, 0.1)',
          }}
        />
      </TableCell>
      <TableCell align="right" sx={{ ...numberCellSx, fontWeight: 600 }}>
        {formatRupiah(getItemFrpAmount(item))}
      </TableCell>
    </>
  )
}

function FrpItemsFromRpSection({
  items,
  removedRpItems,
  budgetOptions,
  fieldErrors,
  isFormDisabled,
  isOptionsLoading,
  updateItem,
  removeItem,
  restoreRpItem,
  addNewItem,
  copyItemAmount,
  copyAllItemAmounts,
}) {
  const hasRpItems = items.some((item) => item.source === 'rp')

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>
            Items
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Item diambil dari RP. Hapus item yang tidak dibayar, atau tambah item baru bila perlu.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
          disabled={isFormDisabled || !hasRpItems}
          onClick={copyAllItemAmounts}
          sx={outlinedButtonSx}
        >
          Salin Semua Amount RP
        </Button>
      </Stack>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
        <Table size="small" sx={tableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 44 }} align="center">
                #
              </TableCell>
              <TableCell sx={{ width: 260 }}>Budget</TableCell>
              <TableCell>Memo</TableCell>
              <TableCell sx={{ width: 84 }} align="right">
                Qty
              </TableCell>
              <TableCell sx={{ width: 150 }} align="right">
                Unit Price
              </TableCell>
              <TableCell sx={{ width: 180 }} align="right">
                RP Amount
              </TableCell>
              <TableCell sx={{ width: 170 }} align="right">
                FRP Amount (IDR)
              </TableCell>
              <TableCell sx={{ width: 48 }} aria-label="Aksi" />
            </TableRow>
          </TableHead>

          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Belum ada item. Kembalikan item RP atau tambah item baru.
                </TableCell>
              </TableRow>
            ) : null}

            {items.map((item, index) => (
              <TableRow key={item.key}>
                <TableCell align="center" sx={{ ...textCellSx, color: 'text.secondary' }}>
                  {index + 1}
                </TableCell>

                {item.source === 'new' ? (
                  <NewItemCells
                    item={item}
                    index={index}
                    fieldErrors={fieldErrors}
                    isFormDisabled={isFormDisabled}
                    isOptionsLoading={isOptionsLoading}
                    budgetOptions={budgetOptions}
                    updateItem={updateItem}
                  />
                ) : (
                  <RpItemCells
                    item={item}
                    index={index}
                    fieldErrors={fieldErrors}
                    isFormDisabled={isFormDisabled}
                    updateItem={updateItem}
                    copyItemAmount={copyItemAmount}
                  />
                )}

                <TableCell align="center" sx={{ pt: '8px !important' }}>
                  <Tooltip title="Hapus item" placement="top" arrow>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Hapus item ${index + 1}`}
                        disabled={isFormDisabled}
                        onClick={() => removeItem(index)}
                        sx={deleteIconButtonSx}
                      >
                        <Trash03 size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction="row"
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1.5 }}
      >
        <Button
          size="small"
          startIcon={<AddRoundedIcon />}
          disabled={isFormDisabled}
          onClick={addNewItem}
          sx={{
            height: 32,
            px: 1.25,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            color: 'var(--accent-teal, #2a9d8f)',
            '&:hover': { bgcolor: 'rgba(42, 157, 143, 0.08)' },
          }}
        >
          Tambah Item
        </Button>

        {removedRpItems.length > 0 ? (
          <>
            <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Item RP dihapus:
            </Typography>
            {removedRpItems.map((item) => (
              <Chip
                key={item.key}
                size="small"
                variant="outlined"
                label={getItemLabel(item)}
                disabled={isFormDisabled}
                onDelete={() => restoreRpItem(item.rpItemId)}
                deleteIcon={<RestoreRoundedIcon titleAccess="Kembalikan item" />}
                title="Klik ikon untuk mengembalikan item"
                sx={{
                  maxWidth: 260,
                  height: 26,
                  fontSize: '0.75rem',
                  '& .MuiChip-deleteIcon': {
                    fontSize: 16,
                    color: 'var(--accent-teal, #2a9d8f)',
                    '&:hover': { color: 'var(--accent-teal-dark, #21867a)' },
                  },
                }}
              />
            ))}
          </>
        ) : null}
      </Stack>

      {fieldErrors.items ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {fieldErrors.items}
        </Typography>
      ) : null}
    </Box>
  )
}

export default FrpItemsFromRpSection
