import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'

import { Eye, FileText01, Trash03, Upload } from '../../../layoute/TemplateIcons.jsx'
import SectionHeader from './SectionHeader.jsx'
import {
  autocompleteCheckboxSx,
  autocompleteSlotProps,
  autocompleteSlots,
} from './autocompleteStyles.js'

function getOptionByValue(options, value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  return options.find((option) => String(option.value) === String(value)) ?? null
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return '-'
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(size / 1024).toFixed(1)} KB`
}

function getExistingAttachmentId(attachment) {
  return attachment?.attachment_id ?? attachment?.id
}

function getExistingAttachmentName(attachment) {
  return (
    attachment?.original_file_name ??
    attachment?.file_name ??
    attachment?.name ??
    attachment?.document_name_snapshot ??
    'Attachment'
  )
}

function getExistingAttachmentStatus(attachment) {
  return String(attachment?.upload_status ?? attachment?.status ?? '').toUpperCase()
}

function isExistingAttachmentUploaded(attachment) {
  const uploadStatus = getExistingAttachmentStatus(attachment)

  return !uploadStatus || uploadStatus === 'UPLOADED'
}

function TabsInformation({
  isOptionsLoading,
  isFormDisabled,
  formValues,
  fieldErrors,
  externalDocumentTypeOptions,
  frpDocumentTypeDropdownOptions,
  attachmentDocumentTypeOptions,
  attachmentDraft,
  updateValue,
  updateDocumentTypeIds,
  updateAttachmentDocumentType,
  updateAttachmentFile,
  removeAttachmentDraft,
  previewAttachmentDraft,
  existingAttachments = [],
  attachmentActionError = '',
  previewExistingAttachment,
  removeExistingAttachment,
  showNotes = false,
}) {
  const attachmentFiles = attachmentDraft.files ?? []
  const attachmentTitle =
    attachmentFiles.length > 0 ? `${attachmentFiles.length} file dipilih` : 'Pilih file attachment'
  const selectedDocumentTypeIds = formValues.document_type_ids.map(String)
  const selectedDocumentTypeOptions = frpDocumentTypeDropdownOptions.filter((option) =>
    selectedDocumentTypeIds.includes(String(option.value)),
  )

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <SectionHeader
        title="Document Details"
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="FRP Date"
          type="date"
          required
          value={formValues.frp_date}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.frp_date)}
          helperText={fieldErrors.frp_date}
          onChange={(event) => updateValue('frp_date', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <Autocomplete

          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={externalDocumentTypeOptions}
          value={getOptionByValue(externalDocumentTypeOptions, formValues.external_document_type_id)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => updateValue('external_document_type_id', option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="External Document Type"
              placeholder={isOptionsLoading ? 'Memuat document type...' : 'Pilih document type'}
              error={Boolean(fieldErrors.external_document_type_id)}
              helperText={fieldErrors.external_document_type_id}
            />
          )}
        />

        <TextField
          fullWidth
          size="small"
          label="External Document Number"
          placeholder="Input external document number"
          value={formValues.external_document_number}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.external_document_number)}
          helperText={fieldErrors.external_document_number}
          onChange={(event) => updateValue('external_document_number', event.target.value)}
        />

        <TextField
          fullWidth
          size="small"
          label="Internal PO Number"
          placeholder="Input internal PO number"
          value={formValues.internal_po_number}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.internal_po_number)}
          helperText={fieldErrors.internal_po_number}
          onChange={(event) => updateValue('internal_po_number', event.target.value)}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          alignItems: 'start',
          mb: 2,
        }}
      >
        <Autocomplete
          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          multiple
          disableCloseOnSelect
          fullWidth
          size="small"
          limitTags={2}
          options={frpDocumentTypeDropdownOptions}
          value={selectedDocumentTypeOptions}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, options) => updateDocumentTypeIds(options.map((option) => option.value))}
          renderOption={(props, option, { selected }) => {
            const { key, ...optionProps } = props

            return (
              <li key={key} {...optionProps}>
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  checked={selected}
                  size="small"
                  sx={autocompleteCheckboxSx}
                />
                <Box component="span" sx={{ minWidth: 0, flex: 1 }}>
                  {option.label}
                </Box>
              </li>
            )
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Required Documents"
              placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih required documents'}
              error={Boolean(fieldErrors.document_type_ids)}
              helperText={fieldErrors.document_type_ids}
            />
          )}
        />

        <Autocomplete

          slots={autocompleteSlots}
          slotProps={autocompleteSlotProps}
          fullWidth
          size="small"
          options={attachmentDocumentTypeOptions}
          value={getOptionByValue(attachmentDocumentTypeOptions, attachmentDraft.documentTypeId)}
          getOptionLabel={(option) => option?.label ?? ''}
          isOptionEqualToValue={(option, value) => String(option.value) === String(value?.value)}
          disabled={isFormDisabled}
          loading={isOptionsLoading}
          onChange={(_, option) => updateAttachmentDocumentType(option?.value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Attachment Document Type"
              placeholder={isOptionsLoading ? 'Memuat document...' : 'Pilih document type'}
              error={Boolean(fieldErrors.attachment_document_type_id)}
              helperText={fieldErrors.attachment_document_type_id}
            />
          )}
        />

        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Upload Attachment
          </Typography>

          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={<Upload size={16} />}
            disabled={isFormDisabled}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {attachmentTitle}
            <input
              hidden
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              onClick={(event) => {
                event.currentTarget.value = ''
              }}
              onChange={(event) => updateAttachmentFile(event.target.files)}
            />
          </Button>

          {attachmentFiles.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {attachmentFiles.map((attachment) => (
                <Chip
                  key={attachment.id}
                  size="small"
                  variant="outlined"
                  icon={<FileText01 size={14} />}
                  label={attachment.file.name}
                  disabled={isFormDisabled}
                  onClick={() => previewAttachmentDraft(attachment.previewUrl)}
                  onDelete={() => removeAttachmentDraft(attachment.id)}
                  sx={{ maxWidth: 220 }}
                />
              ))}
            </Stack>
          ) : null}

          {fieldErrors.attachment_file ? (
            <FormHelperText error>{fieldErrors.attachment_file}</FormHelperText>
          ) : null}
        </Stack>
      </Box>

      {existingAttachments.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Existing Attachments
          </Typography>

          {existingAttachments.map((attachment, index) => {
            const attachmentId = getExistingAttachmentId(attachment) ?? index
            const attachmentName = getExistingAttachmentName(attachment)
            const attachmentStatus = getExistingAttachmentStatus(attachment)
            const isAttachmentUploaded = isExistingAttachmentUploaded(attachment)
            const attachmentMeta = [
              attachment.document_name_snapshot ?? attachment.document_type_name_snapshot,
              attachment.mime_type || 'Unknown type',
              formatFileSize(Number(attachment.file_size)),
              isAttachmentUploaded ? attachmentStatus || 'UPLOADED' : 'Belum selesai diupload',
            ]
              .filter(Boolean)
              .join(' - ')

            return (
              <Stack
                key={`existing-${attachmentId}`}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
                  borderRadius: '8px',
                  bgcolor: 'rgba(52, 73, 104, 0.04)',
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {attachmentName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {attachmentMeta}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<Eye size={14} />}
                  disabled={isFormDisabled || !isAttachmentUploaded}
                  onClick={() => previewExistingAttachment?.(attachment)}
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Preview
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={`Hapus attachment ${attachmentName}`}
                  disabled={isFormDisabled}
                  onClick={() => removeExistingAttachment?.(attachment)}
                >
                  <Trash03 size={16} />
                </IconButton>
              </Stack>
            )
          })}

          {attachmentActionError ? (
            <FormHelperText error>{attachmentActionError}</FormHelperText>
          ) : null}
        </Stack>
      ) : null}

      <TextField
        fullWidth
        label="Description"
        required
        multiline
        minRows={4}
        placeholder="Input description"
        value={formValues.description}
        disabled={isFormDisabled}
        error={Boolean(fieldErrors.description)}
        helperText={fieldErrors.description}
        onChange={(event) => updateValue('description', event.target.value)}
      />

      {showNotes ? (
        <TextField
          fullWidth
          label="Notes"
          multiline
          minRows={3}
          placeholder="Input notes"
          value={formValues.notes}
          disabled={isFormDisabled}
          error={Boolean(fieldErrors.notes)}
          helperText={fieldErrors.notes}
          onChange={(event) => updateValue('notes', event.target.value)}
          sx={{ mt: 2 }}
        />
      ) : null}
    </Box>
  )
}

export default TabsInformation
