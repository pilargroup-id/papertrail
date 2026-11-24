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
  vendorOptions,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  forDepartmentOptions,
  forClassOptions,
  isProcessReadOnly = false,
  updateValue,
}) {
  const showForDepartment = Array.isArray(forDepartmentOptions) && Array.isArray(forClassOptions)

  return (
    <Box
      component="section"
      sx={{
        mb: 4,
        '& .MuiInputBase-root:has([readonly])': { bgcolor: 'rgba(52, 73, 104, 0.02)' },
      }}
    >
      <SectionHeader title="Informasi Vendor & Proses" />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        {vendorOptions ? (
          <Autocomplete
            slots={autocompleteSlots}
            slotProps={autocompleteSlotProps}
            fullWidth
            size="small"
            options={vendorOptions}
            value={getOptionByValue(vendorOptions, formValues.vendor_id)}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
            disabled={isFormDisabled}
            loading={isOptionsLoading}
            noOptionsText="Vendor aktif tidak ditemukan."
            onChange={(_, option) => updateValue('vendor_id', option?.value ?? '')}
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
        ) : (
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
        )}

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
          readOnly={isProcessReadOnly}
          forcePopupIcon={isProcessReadOnly ? false : 'auto'}
          loading={isOptionsLoading}
          noOptionsText="Kategori pembayaran aktif tidak ditemukan."
          onChange={(_, option) => updateValue('payment_category_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required={!isProcessReadOnly}
              label="Kategori Pembayaran"
              placeholder={
                isProcessReadOnly ? '-' : isOptionsLoading ? 'Memuat kategori...' : 'Pilih kategori pembayaran'
              }
              error={Boolean(fieldErrors.payment_category_id)}
              helperText={fieldErrors.payment_category_id}
            />
          )}
        />
      </Box>

      {showForDepartment ? (
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
            options={forDepartmentOptions}
            value={getOptionByValue(forDepartmentOptions, formValues.for_department_id)}
            getOptionLabel={(option) => option?.label ?? ''}
            isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
            disabled={isFormDisabled}
            loading={isOptionsLoading}
            noOptionsText="Divisi tidak ditemukan."
            onChange={(_, option) => updateValue('for_department_id', option?.value ?? '')}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Untuk Divisi"
                placeholder={isOptionsLoading ? 'Memuat divisi...' : 'Pilih divisi'}
                error={Boolean(fieldErrors.for_department_id)}
                helperText={
                  fieldErrors.for_department_id || 'Manager divisi ini yang akan menyetujui RP.'
                }
              />
            )}
          />

          <Autocomplete
            slots={autocompleteSlots}
            slotProps={autocompleteSlotProps}
            fullWidth
            size="small"
            options={forClassOptions}
            value={getOptionByValue(forClassOptions, formValues.for_class_department_id)}
            getOptionLabel={(option) => option?.label ?? ''}
            isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
            disabled={isFormDisabled}
            loading={isOptionsLoading}
            noOptionsText="Kelas tidak ditemukan."
            onChange={(_, option) => updateValue('for_class_department_id', option?.value ?? '')}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Kelas"
                placeholder={isOptionsLoading ? 'Memuat kelas...' : 'Pilih kelas'}
                error={Boolean(fieldErrors.for_class_department_id)}
                helperText={fieldErrors.for_class_department_id}
              />
            )}
          />
        </Box>
      ) : null}

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
          readOnly={isProcessReadOnly}
          forcePopupIcon={isProcessReadOnly ? false : 'auto'}
          loading={isOptionsLoading}
          noOptionsText="Divisi pemroses aktif tidak ditemukan."
          onChange={(_, option) => updateValue('destination_department_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required={!isProcessReadOnly}
              label="Divisi Pemroses"
              placeholder={
                isProcessReadOnly ? '-' : isOptionsLoading ? 'Memuat divisi...' : 'Pilih divisi pemroses'
              }
              error={Boolean(fieldErrors.destination_department_id)}
              helperText={fieldErrors.destination_department_id}
            />
          )}
        />

        <TextField
          fullWidth
          size="small"
          required={!isProcessReadOnly}
          label="PIC"
          placeholder={isProcessReadOnly ? '-' : 'Masukkan nama PIC'}
          value={formValues.pic_name}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.pic_name)}
          helperText={fieldErrors.pic_name}
          onChange={(event) => updateValue('pic_name', event.target.value)}
          slotProps={{ input: { readOnly: isProcessReadOnly }, htmlInput: { maxLength: 255 } }}
        />

        <TextField
          fullWidth
          size="small"
          required={!isProcessReadOnly}
          label="Tanggal RP"
          type="date"
          value={formValues.date_required}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.date_required)}
          helperText={fieldErrors.date_required}
          onChange={(event) => updateValue('date_required', event.target.value)}
          slotProps={{ input: { readOnly: isProcessReadOnly }, inputLabel: { shrink: true } }}
        />
      </Box>

      <TextField
        fullWidth
        size="small"
        required
        multiline
        minRows={3}
        label="Deskripsi"
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
