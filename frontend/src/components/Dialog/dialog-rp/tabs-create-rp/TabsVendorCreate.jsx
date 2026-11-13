import { useEffect, useMemo, useState } from 'react'

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'

import SectionHeader from '../../dialog-frp/tabs-create-frp/SectionHeader.jsx'
import {
  autocompleteSlotProps,
  autocompleteSlots,
} from '../../dialog-frp/tabs-create-frp/autocompleteStyles.js'

const filterOptions = createFilterOptions()
const vendorSearchDebounceMs = 300

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function mergeOptions(baseOptions, extraOptions) {
  const seenValues = new Set(baseOptions.map((option) => String(option.value)))
  const merged = [...baseOptions]

  extraOptions.forEach((option) => {
    if (!seenValues.has(String(option.value))) {
      seenValues.add(String(option.value))
      merged.push(option)
    }
  })

  return merged
}

function VendorAutocomplete({
  value,
  options,
  isOptionsLoading,
  disabled,
  error,
  onChange,
  onSearch,
  onCreate,
}) {
  const [inputValue, setInputValue] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const trimmedQuery = inputValue.trim()

  const mergedOptions = useMemo(
    () => mergeOptions(options, searchResults),
    [options, searchResults],
  )
  const selectedOption = getOptionByValue(mergedOptions, value)

  useEffect(() => {
    if (
      typeof onSearch !== 'function' ||
      !trimmedQuery ||
      (selectedOption && selectedOption.label === inputValue)
    ) {
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)

      try {
        const results = await onSearch(trimmedQuery, { signal: controller.signal })

        setSearchResults((currentResults) => mergeOptions(currentResults, results ?? []))
      } catch {
        // Keep the existing options when a vendor search fails or is aborted.
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, vendorSearchDebounceMs)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [inputValue, onSearch, selectedOption, trimmedQuery])

  const handleChange = async (_, option) => {
    setCreateError('')

    if (!option) {
      onChange('')
      return
    }

    if (!option.isCreateOption) {
      onChange(option.value ?? '')
      return
    }

    setIsCreating(true)

    try {
      const createdOption = await onCreate(option.inputValue)

      if (createdOption) {
        setSearchResults((currentResults) => mergeOptions(currentResults, [createdOption]))
        onChange(createdOption.value ?? '')
      }
    } catch (creationError) {
      setCreateError(creationError?.message || 'Gagal menambahkan vendor.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Autocomplete
      slots={autocompleteSlots}
      slotProps={autocompleteSlotProps}
      fullWidth
      size="small"
      options={mergedOptions}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_, nextInputValue) => setInputValue(nextInputValue)}
      getOptionLabel={(option) => option?.label ?? ''}
      isOptionEqualToValue={(option, currentValue) =>
        String(option.value) === String(currentValue?.value)
      }
      filterOptions={(currentOptions, params) => {
        const filtered = filterOptions(currentOptions, params)
        const query = params.inputValue.trim()
        const hasExactMatch = currentOptions.some(
          (option) => String(option.label).trim().toLowerCase() === query.toLowerCase(),
        )

        if (typeof onCreate === 'function' && query && !hasExactMatch) {
          filtered.push({
            value: `__create__${query}`,
            inputValue: query,
            label: `Tambah vendor baru "${query}"`,
            isCreateOption: true,
          })
        }

        return filtered
      }}
      disabled={disabled || isCreating}
      loading={isOptionsLoading || isSearching || isCreating}
      noOptionsText="Vendor tidak ditemukan."
      onChange={handleChange}
      renderInput={(params) => (
        <TextField
          {...params}
          required
          label="Vendor"
          placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Cari atau tambah vendor...'}
          error={Boolean(error || createError)}
          helperText={error || createError}
        />
      )}
    />
  )
}

function TabsVendorCreate({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  vendorOptions,
  onSearchVendors,
  onCreateVendor,
  paymentCategoryOptions,
  destinationDepartmentOptions,
  picOptions,
  updateValue,
}) {
  const hasDestinationDepartment = Boolean(formValues.destination_department_id)

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
        <VendorAutocomplete
          value={formValues.vendor_id}
          options={vendorOptions}
          isOptionsLoading={isOptionsLoading}
          disabled={isFormDisabled}
          error={fieldErrors.vendor_id}
          onChange={(value) => updateValue('vendor_id', value)}
          onSearch={onSearchVendors}
          onCreate={onCreateVendor}
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

        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={picOptions}
          value={getOptionByValue(picOptions, formValues.pic_name)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled || !hasDestinationDepartment}
          loading={isOptionsLoading}
          noOptionsText="PIC untuk division ini tidak ditemukan."
          onChange={(_, option) => updateValue('pic_name', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="PIC"
              placeholder={
                !hasDestinationDepartment
                  ? 'Pilih division to process terlebih dahulu'
                  : isOptionsLoading
                    ? 'Memuat PIC...'
                    : 'Pilih PIC'
              }
              error={Boolean(fieldErrors.pic_name)}
              helperText={fieldErrors.pic_name}
            />
          )}
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
