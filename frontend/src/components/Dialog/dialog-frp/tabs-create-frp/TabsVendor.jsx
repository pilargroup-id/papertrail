import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'

import SectionHeader from './SectionHeader.jsx'
import { autocompleteSlotProps, autocompleteSlots } from './autocompleteStyles.js'

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
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
}) {
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
          mb: 2,
        }}
      >
        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={vendorOptions}
          value={getOptionByValue(vendorOptions, formValues.vendor_id)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => {
            updateValue('vendor_id', option?.value ?? '')
            updateValue('vendor_bank_account_id', '')
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Vendor"
              placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Pilih vendor'}
              error={Boolean(fieldErrors.vendor_id)}
              helperText={fieldErrors.vendor_id}
            />
          )}
        />

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
      </Box>
    </Box>
  )
}

export default TabsVendor
