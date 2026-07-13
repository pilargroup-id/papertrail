import { useEffect, useState } from 'react'

import api from '../../../../services/api.js'
import TextField from '../../../forms/TextField.jsx'
import Dropdown from '../../../forms/dropdown/Dropdown.jsx'
import DropdownSearch from '../../../forms/dropdown/DropdownSearch.jsx'
import {
  Banks,
  Calendar01,
  CreditCard,
  TrendingUp,
  UserBank,
} from '../../../layoute/TemplateIcons.jsx'

const fallbackCurrencyOptions = [{ value: 'IDR', label: 'IDR - Indonesian Rupiah' }]

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
  const [currencyOptions, setCurrencyOptions] = useState(fallbackCurrencyOptions)
  const [isCurrenciesLoading, setIsCurrenciesLoading] = useState(false)
  const [isExchangeRateLoading, setIsExchangeRateLoading] = useState(false)
  const [exchangeRateMessage, setExchangeRateMessage] = useState('')

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
    const currencyCode = String(formValues.currency_code || '').trim().toUpperCase()

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
        const exchangeRate = rateData?.exchange_rate ?? rateData?.middle_rate

        if (exchangeRate === undefined || exchangeRate === null || exchangeRate === '') {
          updateValue('exchange_rate', '')
          setExchangeRateMessage('Exchange rate tidak ditemukan.')
          return
        }

        updateValue('exchange_rate', String(exchangeRate))
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
  }, [formValues.currency_code, formValues.frp_date])

  return (
    <div className="register-user-popup__grid register-user-popup__grid--frp register-user-popup__grid--frp-vendor">
      <div className="register-user-popup__field register-user-popup__field--frp-half">
        <DropdownSearch
          label="Vendor"
          value={formValues.vendor_id}
          options={vendorOptions}
          placeholder={isOptionsLoading ? 'Memuat vendor...' : 'Pilih vendor'}
          searchPlaceholder="Cari vendor..."
          emptyMessage="Vendor aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.vendor_id}
          onChange={(value) => {
            updateValue('vendor_id', value)
            updateValue('vendor_bank_account_id', '')
          }}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-half">
        <DropdownSearch
          label="Vendor Bank Account"
          value={formValues.vendor_bank_account_id}
          options={filteredVendorBankOptions}
          placeholder={isOptionsLoading ? 'Memuat rekening...' : 'Pilih rekening vendor'}
          searchPlaceholder="Cari rekening vendor..."
          emptyMessage="Rekening vendor aktif tidak ditemukan."
          disabled={isFormDisabled}
          error={fieldErrors.vendor_bank_account_id}
          onChange={handleVendorBankChange}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Bank"
          value={formValues.destination_bank_name}
          placeholder="BCA"
          leftIcon={Banks}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_name}
          onChange={(event) => updateValue('destination_bank_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account"
          value={formValues.destination_bank_account}
          placeholder="1234567890"
          leftIcon={CreditCard}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account}
          onChange={(event) => updateValue('destination_bank_account', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field">
        <TextField
          label="Destination Account Name"
          value={formValues.destination_bank_account_name}
          placeholder="PT Vendor Testing"
          leftIcon={UserBank}
          required
          disabled={isFormDisabled}
          error={fieldErrors.destination_bank_account_name}
          onChange={(event) => updateValue('destination_bank_account_name', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
        <DropdownSearch
          label="Payment Method"
          value={formValues.payment_method_id}
          options={paymentMethodOptions}
          placeholder={isOptionsLoading ? 'Memuat payment method...' : 'Pilih payment method'}
          searchPlaceholder="Cari payment method..."
          emptyMessage="Payment method aktif tidak ditemukan."
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_method_id}
          onChange={(value) => updateValue('payment_method_id', value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
        <TextField
          label="Payment Date"
          type="date"
          value={formValues.payment_date}
          leftIcon={Calendar01}
          required
          disabled={isFormDisabled}
          error={fieldErrors.payment_date}
          onChange={(event) => updateValue('payment_date', event.target.value)}
        />
      </div>
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
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
      <div className="register-user-popup__field register-user-popup__field--frp-quarter">
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
    </div>
  )
}

export default TabsVendor
