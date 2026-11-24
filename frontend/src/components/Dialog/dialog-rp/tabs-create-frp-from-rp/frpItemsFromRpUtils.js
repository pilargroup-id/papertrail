export function formatRupiah(value) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return '-'
  }

  return `Rp ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)}`
}

// Item RP memakai FRP Amount yang diinput; item baru = qty x unit price.
export function getItemFrpAmount(item) {
  if (item.source === 'new') {
    return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
  }

  return Number(item.frpAmount) || 0
}

let newItemSequence = 0

export function createNewFrpItem() {
  newItemSequence += 1

  return {
    key: `new-${Date.now()}-${newItemSequence}`,
    source: 'new',
    budgetId: '',
    memo: '',
    quantity: '1',
    unitPrice: '',
  }
}

export function mapRpItemsToFormItems(items = []) {
  return items.map((item, index) => ({
    key: `rp-${item?.id ?? index}`,
    source: 'rp',
    rpOrder: index,
    rpItemId: item?.id,
    budgetCode: item?.budget_code_snapshot ?? '-',
    projectName: item?.budget_project_name_snapshot ?? '-',
    memo: item?.memo ?? '-',
    quantity: item?.quantity ?? 0,
    unitPrice: item?.unit_price ?? 0,
    rpAmount: item?.amount ?? 0,
    frpAmount: '',
  }))
}

export function mapBudgetOptions(budgets = []) {
  return budgets.map((budget) => {
    const id = budget?.id ?? budget?.budget_id
    const code = budget?.budget_code ?? budget?.code ?? ''
    const projectName = budget?.project_name ?? budget?.name ?? `Budget #${id ?? '-'}`

    return {
      value: id,
      label: [code, projectName].filter(Boolean).join(' - '),
      meta: {
        budgetRemaining: budget?.budget_remaining ?? budget?.remaining_amount,
      },
    }
  })
}
