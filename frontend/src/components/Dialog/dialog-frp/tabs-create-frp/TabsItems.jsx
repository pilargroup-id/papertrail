import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import { Plus, Table01, Trash03, TrendingUp } from '../../../layoute/TemplateIcons.jsx'

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function TabsItems({
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

            <div className="register-user-popup__grid register-user-popup__grid--frp">
              <div className="register-user-popup__field register-user-popup__field--full">
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
                  label="Quantity"
                  value={item.quantity}
                  placeholder="1"
                  leftIcon={Table01}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  disabled={isFormDisabled}
                  error={fieldErrors[`items.${index}.quantity`]}
                  onChange={(event) => updateItemValue(index, 'quantity', event.target.value)}
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

export default TabsItems
