import { useState } from 'react'

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import AddRoundedIcon from '@mui/icons-material/AddRounded'

import RpFieldHint from './RpFieldHint.jsx'
import SectionHeader from './SectionHeader.jsx'
import { autocompleteSlotProps, autocompleteSlots } from './autocompleteStyles.js'

const filterVendorOptions = createFilterOptions()

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function normalizeVendorName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function getVendorOptionName(option) {
  return normalizeVendorName(option?.meta?.name ?? option?.meta?.vendor_name ?? option?.label)
}

function TabsVendor({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  filteredVendorBankOptions,
  paymentMethodOptions,
  updateValue,
  handleVendorBankChange,
  onCreateVendor,
  rpHints = {},
}) {
  const [isCreatingVendor, setIsCreatingVendor] = useState(false)
  const [createVendorError, setCreateVendorError] = useState('')
  const canCreateVendor = typeof onCreateVendor === 'function'

  const selectVendor = (vendorId) => {
    updateValue('vendor_id', vendorId ?? '')
    updateValue('vendor_bank_account_id', '')
  }

  const createVendor = async (name) => {
    const vendorName = normalizeVendorName(name)

    if (!vendorName || isCreatingVendor) {
      return
    }

    // Kalau nama sudah ada (beda huruf besar/kecil), pilih vendor yang ada saja.
    const existingOption = vendorOptions.find(
      (option) => getVendorOptionName(option).toLowerCase() === vendorName.toLowerCase(),
    )

    if (existingOption) {
      selectVendor(existingOption.value)
      return
    }

    setIsCreatingVendor(true)
    setCreateVendorError('')

    try {
      const createdOption = await onCreateVendor(vendorName)

      if (createdOption?.value !== undefined && createdOption?.value !== null) {
        selectVendor(createdOption.value)
      }
    } catch (error) {
      setCreateVendorError(error?.message || 'Gagal menambahkan vendor.')
    } finally {
      setIsCreatingVendor(false)
    }
  }

  const vendorHelperText = createVendorError || fieldErrors.vendor_id
  const isVendorDisabled = isFormDisabled || isCreatingVendor

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader
        title="Vendor & Bank Account"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          alignItems: 'start',
          mb: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Autocomplete
            slots={autocompleteSlots}
            slotProps={autocompleteSlotProps}
            fullWidth
            size="small"
            options={vendorOptions}
            value={getOptionByValue(vendorOptions, formValues.vendor_id)}
            getOptionLabel={(option) => option?.label ?? ''}
            isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
            disabled={isVendorDisabled}
            loading={isOptionsLoading || isCreatingVendor}
            noOptionsText={canCreateVendor ? 'Ketik nama vendor baru untuk menambahkan.' : 'Vendor tidak ditemukan.'}
            filterOptions={(options, params) => {
              const filtered = filterVendorOptions(options, params)
              const inputName = normalizeVendorName(params.inputValue)

              if (!canCreateVendor || !inputName) {
                return filtered
              }

              const isExisting = options.some(
                (option) => getVendorOptionName(option).toLowerCase() === inputName.toLowerCase(),
              )

              if (isExisting) {
                return filtered
              }

              return [
                ...filtered,
                {
                  value: '__create_vendor__',
                  label: inputName,
                  isCreateOption: true,
                },
              ]
            }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props

              if (!option.isCreateOption) {
                return (
                  <li key={key} {...optionProps}>
                    {option.label}
                  </li>
                )
              }

              return (
                <li
                  key={key}
                  {...optionProps}
                  style={{ borderTop: '1px solid rgba(15, 23, 42, 0.08)', color: '#2a9d8f' }}
                >
                  <AddRoundedIcon fontSize="small" sx={{ flexShrink: 0 }} />
                  <span>
                    Tambah vendor baru: <strong>&ldquo;{option.label}&rdquo;</strong>
                  </span>
                </li>
              )
            }}
            onChange={(_, option) => {
              setCreateVendorError('')

              if (option?.isCreateOption) {
                createVendor(option.label)
                return
              }

              selectVendor(option?.value)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Vendor"
                placeholder={
                  isOptionsLoading
                    ? 'Memuat vendor...'
                    : canCreateVendor
                      ? 'Pilih atau ketik vendor baru'
                      : 'Pilih vendor'
                }
                error={Boolean(vendorHelperText)}
                helperText={isCreatingVendor ? 'Menambahkan vendor...' : vendorHelperText}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {isCreatingVendor ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
          <RpFieldHint hint={rpHints.vendor_id} disabled={isFormDisabled} />
        </Box>

        <Autocomplete

          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={filteredVendorBankOptions}
          value={getOptionByValue(filteredVendorBankOptions, formValues.vendor_bank_account_id)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => handleVendorBankChange(option?.value ?? '', option)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vendor Bank Account"
              placeholder={isOptionsLoading ? 'Memuat rekening...' : 'Pilih rekening vendor'}
              error={Boolean(fieldErrors.vendor_bank_account_id)}
              helperText={fieldErrors.vendor_bank_account_id}
            />
          )}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <TextField
          fullWidth
          size="small"
          required
          label="Destination Bank"
          placeholder="Input destination bank"
          value={formValues.destination_bank_name}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.destination_bank_name)}
          helperText={fieldErrors.destination_bank_name}
          onChange={(event) => updateValue('destination_bank_name', event.target.value)}
        />

        <TextField
          fullWidth
          size="small"
          required
          label="Destination Account"
          placeholder="Input destination account"
          value={formValues.destination_bank_account}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.destination_bank_account)}
          helperText={fieldErrors.destination_bank_account}
          onChange={(event) => updateValue('destination_bank_account', event.target.value)}
        />

        <TextField
          fullWidth
          size="small"
          required
          label="Destination Account Name"
          placeholder="Input destination account name"
          value={formValues.destination_bank_account_name}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.destination_bank_account_name)}
          helperText={fieldErrors.destination_bank_account_name}
          onChange={(event) => updateValue('destination_bank_account_name', event.target.value)}
        />

        <Autocomplete

          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={paymentMethodOptions}
          value={getOptionByValue(paymentMethodOptions, formValues.payment_method_id)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => updateValue('payment_method_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Payment Method"
              placeholder={isOptionsLoading ? 'Memuat payment method...' : 'Pilih payment method'}
              error={Boolean(fieldErrors.payment_method_id)}
              helperText={fieldErrors.payment_method_id}
            />
          )}
        />

        <Box sx={{ minWidth: 0 }}>
          <TextField
            fullWidth
            size="small"
            required
            label="Payment Date"
            type="date"
            value={formValues.payment_date}
            disabled={isFormDisabled}
            error={Boolean(fieldErrors.payment_date)}
            helperText={fieldErrors.payment_date}
            onChange={(event) => updateValue('payment_date', event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <RpFieldHint hint={rpHints.payment_date} disabled={isFormDisabled} />
        </Box>
      </Box>
    </Box>
  )
}

export default TabsVendor
