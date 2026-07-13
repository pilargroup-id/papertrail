import TextArea from '../../../../components/forms/TextArea.jsx'
import TextField from '../../../../components/forms/TextField.jsx'
import DropdownSearch from '../../../../components/forms/dropdown/DropdownSearch.jsx'
import { Plus, Table01, Trash03, TrendingUp } from '../../../../components/layoute/TemplateIcons.jsx'

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

function getSelectedBudgetOption(budgetOptions, budgetId) {
  return budgetOptions.find((option) => String(option.value) === String(budgetId))
}

function getBudgetMetaValue(option, metaKey) {
  const value = option?.meta?.[metaKey]

  return value === undefined || value === null || value === '' ? '' : value
}

function MobileTabsItems({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  budgetOptions,
  updateItemValue,
  removeItem,
  addItem,
}) {
  return (
    <div className="frp-dialog__items">
      {formValues.items.map((item, index) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = toNumber(item.unit_price)
        const amount = quantity * unitPrice
        const selectedBudgetOption = getSelectedBudgetOption(budgetOptions, item.budget_id)
        const budgetAmount = formatRupiah(getBudgetMetaValue(selectedBudgetOption, 'budgetAmount'))
        const budgetRemaining = formatRupiah(
          getBudgetMetaValue(selectedBudgetOption, 'budgetRemaining'),
        )

        return (
          <div className="frp-dialog__item" key={`frp-item-${index}`}>
            <div className="frp-dialog__item-header">
              <strong>Item {index + 1}</strong>
              <button
                type="button"
                className="frp-dialog__icon-button"
                aria-label={`Hapus item ${index + 1}`}
                disabled={isFormDisabled || formValues.items.length === 1}
                onClick={() => removeItem(index)}
              >
                <Trash03 size={16} />
              </button>
            </div>

            <div className="register-user-popup__grid register-user-popup__grid--frp-three register-user-popup__grid--frp-budget-row">
              <div className="register-user-popup__field frp-dialog__budget-field">
                <DropdownSearch
                  label="Budget"
                  value={item.budget_id}
                  options={budgetOptions}
                  placeholder={isOptionsLoading ? 'Memuat budget...' : 'Pilih budget'}
                  searchPlaceholder="Cari budget..."
                  emptyMessage="Budget aktif tidak ditemukan."
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.budget_id`]}
                  onChange={(value) => updateItemValue(index, 'budget_id', value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Budget Amount"
                  value={budgetAmount}
                  placeholder="-"
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Budget Remaining"
                  value={budgetRemaining}
                  placeholder="-"
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="register-user-popup__grid register-user-popup__grid--frp-three">
              <div className="register-user-popup__field">
                <TextField
                  label="Quantity"
                  value={item.quantity}
                  placeholder="1"
                  leftIcon={Table01}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  step="1"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.quantity`]}
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
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Unit Price"
                  value={item.unit_price}
                  placeholder="100000"
                  leftIcon={TrendingUp}
                  type="number"
                  min="0"
                  step="1"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.unit_price`]}
                  onChange={(event) => updateItemValue(index, 'unit_price', event.target.value)}
                />
              </div>
              <div className="register-user-popup__field">
                <TextField
                  label="Amount"
                  value={Number.isFinite(amount) ? amount : 0}
                  leftIcon={TrendingUp}
                  disabled
                  readOnly
                />
              </div>
              <div className="register-user-popup__field register-user-popup__field--full">
                <TextArea
                  label="Memo"
                  value={item.memo}
                  placeholder="Pembayaran invoice vendor"
                  rows={3}
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.memo`]}
                  onChange={(event) => updateItemValue(index, 'memo', event.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        className="dashboard-popup__button dashboard-popup__button--secondary frp-dialog__add-item"
        disabled={isFormDisabled}
        onClick={addItem}
      >
        <Plus size={16} />
        Add Item
      </button>
      {fieldErrors.items ? <p className="form-control__message">{fieldErrors.items}</p> : null}
    </div>
  )
}

export default MobileTabsItems
