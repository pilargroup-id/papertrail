import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'

import SectionHeader from '../../dialog-frp/tabs-create-frp/SectionHeader.jsx'
import {
  autocompleteSlotProps,
  autocompleteSlots,
} from '../../dialog-frp/tabs-create-frp/autocompleteStyles.js'

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function TabsVendorCreate({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  updateValue,
}) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader title="Vendor & Process Information" />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          required
          label="Vendor"
          placeholder="Masukkan nama vendor"
          value={formValues.vendor_name}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.vendor_name)}
          helperText={fieldErrors.vendor_name}
          onChange={(event) => updateValue('vendor_name', event.target.value)}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />

        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={paymentCategoryOptions}
          value={getOptionByValue(paymentCategoryOptions, formValues.payment_category_id)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          noOptionsText="Category payment aktif tidak ditemukan."
          onChange={(_, option) => updateValue('payment_category_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Category Payment"
              placeholder={isOptionsLoading ? 'Memuat category...' : 'Pilih category payment'}
              error={Boolean(fieldErrors.payment_category_id)}
              helperText={fieldErrors.payment_category_id}
            />
          )}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={destinationDepartmentOptions}
          value={getOptionByValue(
            destinationDepartmentOptions,
            formValues.destination_department_id,
          )}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          noOptionsText="Division tujuan aktif tidak ditemukan."
          onChange={(_, option) => updateValue('destination_department_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Division To Process"
              placeholder={isOptionsLoading ? 'Memuat division...' : 'Pilih division'}
              error={Boolean(fieldErrors.destination_department_id)}
              helperText={fieldErrors.destination_department_id}
            />
          )}
        />

        <TextField
          fullWidth
          size="small"
          required
          label="PIC"
          placeholder="Masukkan nama PIC"
          value={formValues.pic_name}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.pic_name)}
          helperText={fieldErrors.pic_name}
          onChange={(event) => updateValue('pic_name', event.target.value)}
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />

        <TextField
          fullWidth
          size="small"
          required
          label="RP Date"
          type="date"
          value={formValues.date_required}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.date_required)}
          helperText={fieldErrors.date_required}
          onChange={(event) => updateValue('date_required', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <TextField
        fullWidth
        size="small"
        required
        multiline
        minRows={3}
        label="Description"
        placeholder="Request pembelian kebutuhan department"
        value={formValues.description}
        disabled={isFormDisabled}
        error={Boolean(fieldErrors.description)}
        helperText={fieldErrors.description}
        onChange={(event) => updateValue('description', event.target.value)}
      />
    </Box>
  )
}

export default TabsVendorCreate
