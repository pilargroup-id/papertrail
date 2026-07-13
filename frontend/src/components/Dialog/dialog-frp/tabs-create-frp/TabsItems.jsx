import { useEffect, useState } from 'react'

import api from '../../../../services/api.js'
import TextArea from '../../../forms/TextArea.jsx'
import TextField from '../../../forms/TextField.jsx'
import Dropdown from '../../../forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import { Plus, Table01, Trash03, TrendingUp } from '../../../layoute/TemplateIcons.jsx'

const fallbackCurrencyOptions = [{ value: 'IDR', label: 'IDR - Indonesian Rupiah' }]

function toNumber(value) {
  const normalizedValue = Number(value)

  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

function getRowsFromResponse(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data
  }

  if (Array.isArray(response?.rows)) {
    return response.rows
  }

  return []
}

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? response ?? {}
}

function mapCurrencyOptions(currencies) {
  return currencies
    .filter((currency) => Number(currency?.is_active ?? 1) === 1)
    .map((currency) => {
      const code = currency?.code
      const name = currency?.name

      return {
        value: code,
        label: [code, name].filter(Boolean).join(' - ') || code,
      }
    })
    .filter((option) => option.value)
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

function TabsItems({
  formValues,
  fieldErrors,
  isOptionsLoading,
  isFormDisabled,
  budgetOptions,
  updateValue,
  updateItemValue,
  removeItem,
  addItem,
}) {
  const [currencyOptions, setCurrencyOptions] = useState(fallbackCurrencyOptions)
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(false)
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false)
  const [exchangeRateMessage, setExchangeRateMessage] = useState('')
  const currencyCode = String(formValues.currency_code || 'IDR').trim().toUpperCase()
  const exchangeRate = toNumber(formValues.exchange_rate || 1)
  const totalAmountIdr = formValues.items.reduce((total, item) => {
    const quantity = toNumber(item.quantity)
    const unitPrice = toNumber(item.unit_price)

    return total + quantity * unitPrice * exchangeRate
  }, 0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCurrencies() {
      setIsCurrenciesLoading(true)

      try {
        const response = await api.currencies.list(
          {
            page: 1,
            limit: 100,
            is_active: 1,
          },
          {
            signal: controller.signal,
          },
        )
        const nextCurrencyOptions = mapCurrencyOptions(getRowsFromResponse(response))

        setCurrencyOptions(
          nextCurrencyOptions.length > 0 ? nextCurrencyOptions : fallbackCurrencyOptions,
        )
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setCurrencyOptions(fallbackCurrencyOptions)
      } finally {
        if (!controller.signal.aborted) {
          setIsCurrenciesLoading(false)
        }
      }
    }

    loadCurrencies()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!currencyCode) {
      updateValue('exchange_rate', '')
      setExchangeRateMessage('')
      return undefined
    }

    if (currencyCode === 'IDR') {
      updateValue('exchange_rate', '1')
      setExchangeRateMessage('')
      return undefined
    }

    const controller = new AbortController()

    async function loadLatestExchangeRate() {
      setIsExchangeRateLoading(true)
      setExchangeRateMessage('')

      try {
        const response = await api.currencies.exchangeRates.latest(
          {
            currency_code: currencyCode,
            max_date: formValues.frp_date,
          },
          {
            signal: controller.signal,
          },
        )
        const rateData = getResponseData(response)
        const latestExchangeRate = rateData?.exchange_rate ?? rateData?.middle_rate

        if (
          latestExchangeRate === undefined ||
          latestExchangeRate === null ||
          latestExchangeRate === ''
        ) {
          updateValue('exchange_rate', '')
          setExchangeRateMessage('Exchange rate tidak ditemukan.')
          return
        }

        updateValue('exchange_rate', String(latestExchangeRate))
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        updateValue('exchange_rate', '')
        setExchangeRateMessage(error.message || 'Gagal memuat exchange rate.')
      } finally {
        if (!controller.signal.aborted) {
          setIsExchangeRateLoading(false)
        }
      }
    }

    loadLatestExchangeRate()

    return () => {
      controller.abort()
    }
  }, [currencyCode, formValues.frp_date])

  return (
    <div className="frp-dialog__items">
      <div className="register-user-popup__grid register-user-popup__grid--frp-currency-row">
        <div className="register-user-popup__field">
          <Dropdown
            label="Currency"
            value={formValues.currency_code}
            options={currencyOptions}
            placeholder={isCurrenciesLoading ? 'Memuat currency...' : 'Pilih currency'}
            required
            disabled={isFormDisabled || isCurrenciesLoading}
            error={fieldErrors.currency_code}
            onChange={(value) => updateValue('currency_code', value)}
          />
        </div>
        <div className="register-user-popup__field">
          <TextField
            label="Exchange Rate"
            value={formValues.exchange_rate}
            placeholder={isExchangeRateLoading ? 'Memuat exchange rate...' : 'Exchange rate'}
            leftIcon={TrendingUp}
            type="number"
            min="0"
            step="0.0001"
            required
            disabled={isFormDisabled || isExchangeRateLoading}
            error={fieldErrors.exchange_rate}
            helperText={exchangeRateMessage}
            onChange={(event) => updateValue('exchange_rate', event.target.value)}
          />
        </div>
        <div className="frp-dialog__total-amount" aria-live="polite">
          <span className="frp-dialog__total-amount-icon" aria-hidden="true">
            <TrendingUp size={18} />
          </span>
          <div>
            <span className="frp-dialog__total-amount-label">Total Amount (IDR)</span>
            <strong>{formatRupiah(totalAmountIdr)}</strong>
          </div>
        </div>
      </div>

      {formValues.items.map((item, index) => {
        const quantity = toNumber(item.quantity)
        const unitPrice = toNumber(item.unit_price)
        const amountIdr = quantity * unitPrice * exchangeRate
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
                  label={`Unit Price (${currencyCode || 'IDR'})`}
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
                  label="Amount (IDR)"
                  value={formatRupiah(Number.isFinite(amountIdr) ? amountIdr : 0)}
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
