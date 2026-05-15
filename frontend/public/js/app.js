document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('frpForm');
    const divisiSelect = document.getElementById('divisi');
    const dimintaOlehSelect = document.getElementById('dimintaOleh');
    const approvedBySelect = document.getElementById('approvedBy');
    const requestBySelect = document.getElementById('requestBy');
    const btnAddRow = document.getElementById('btnAddRow');
    const lineItemsBody = document.getElementById('lineItemsBody');
    const totalAmountEl = document.getElementById('totalAmount');
    const kursInput = document.getElementById('kurs');
    const kursContainer = document.getElementById('kursContainer');
    const currencySelect = document.getElementById('currency');
    
    const btnPreview = document.getElementById('btnPreview');
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const previewContent = document.getElementById('previewContent');
    const btnSaveSubmit = document.getElementById('btnSaveSubmit');
    const companyNameSelect = document.getElementById('companyName');
    const divisiContainer = document.getElementById('divisiContainer');
  
    let rowCount = 1;

    // 1. Initialize
    initDropdowns();
    
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggalFrp').value = today;
    document.getElementById('paymentDate').value = today;
  
    function initDropdowns() {
      // If divisi is a select (Administrator), populate it
      if (divisiSelect.tagName === 'SELECT') {
        const depts = new Set();
        allEmployees.forEach(e => {
          if (e.companies && Array.isArray(e.companies)) {
            e.companies.forEach(c => depts.add(c.class));
          } else if (e.class) {
            depts.add(e.class);
          }
        });
        const departments = [...depts].filter(Boolean).sort();
        const initialVal = divisiSelect.value;
        divisiSelect.innerHTML = '<option value="">Pilih Divisi</option>';
        departments.forEach(dept => {
          const opt = document.createElement('option');
          opt.value = dept; opt.textContent = dept;
          if (dept === initialVal) opt.selected = true;
          divisiSelect.appendChild(opt);
        });
      }
      
      updateAllCascadingData();
      handleCurrencyChange();
      toggleDivisiVisibility();
    }
  
    function toggleDivisiVisibility() {
      const company = (companyNameSelect.value || '').trim().toUpperCase();
      
      // Always show divisi container now as requested
      divisiContainer.style.display = 'block';
      divisiSelect.required = true;
      
      if (company === 'PT PILAR KARANG SAMUDERA') {
        divisiSelect.value = 'Pilkada';
      } else if (company === 'PT PILAR KARGO PERKASA') {
        divisiSelect.value = 'Pikasa';
      }
      
      // Also toggle required for budget IDs
      const isPNM = company === 'PT PILAR NIAGA MAKMUR';
      document.querySelectorAll('.item-budget').forEach(sel => {
        sel.required = isPNM;
      });

      updateAllCascadingData();
    }
  
    function updateAllCascadingData() {
      const company = (companyNameSelect.value || '').trim();
      const dept = (divisiSelect.value || '').trim();
      
      // For administrators, we might want to filter employees based on selection too
      if (dimintaOlehSelect.tagName === 'SELECT') {
        const deptEmployees = allEmployees.filter(emp => {
          if (!emp.companies) return emp.class === dept;
          return emp.companies.some(c => (!dept || c.class === dept) && (!company || c.name === company));
        });
        
        // Keep current selection if still valid
        const currentVal = dimintaOlehSelect.value;
        populateSelect(dimintaOlehSelect, deptEmployees, 'Pilih Karyawan');
        if (deptEmployees.some(e => e.fullName === currentVal)) dimintaOlehSelect.value = currentVal;
      }

      // We still update budgets because they are critical
      document.querySelectorAll('.item-budget').forEach(sel => populateBudgetDropdown(sel, dept));
      generateFRPNumber();
    }

    divisiSelect.addEventListener('change', () => { updateAllCascadingData(); generateFRPNumber(); });
    divisiSelect.addEventListener('input', () => { updateAllCascadingData(); generateFRPNumber(); });
    companyNameSelect.addEventListener('change', () => { toggleDivisiVisibility(); generateFRPNumber(); });
    companyNameSelect.addEventListener('input', () => { toggleDivisiVisibility(); generateFRPNumber(); });

    // 2. Currency & Kurs Logic
    async function handleCurrencyChange() {
        const curr = currencySelect.value;
        if (curr === 'IDR') {
            kursContainer.style.display = 'none';
            kursInput.value = '1';
        } else {
            kursContainer.style.display = 'block';
            fetchRealTimeKurs(curr);
        }
        updateAllRowCalculations();
    }

    async function fetchRealTimeKurs(curr) {
        kursInput.value = 'Memuat kurs...';
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${curr}`);
            const data = await res.json();
            if (data && data.rates && data.rates.IDR) {
                kursInput.value = Math.round(data.rates.IDR).toLocaleString('id-ID');
                updateAllRowCalculations();
            }
        } catch (e) {
            kursInput.value = '1';
        }
    }

    currencySelect.addEventListener('change', handleCurrencyChange);
    kursInput.addEventListener('input', (e) => {
        formatNumberInput(e);
        updateAllRowCalculations();
    });

    function cleanNumber(str) {
        return parseFloat(String(str).replace(/[^0-9]/g, '')) || 0;
    }

    function updateAllRowCalculations() {
        document.querySelectorAll('.line-item-row').forEach(row => calculateRowTotal(row));
        calculateTotal();
    }

    function calculateRowTotal(row) {
        const qty = cleanNumber(row.querySelector('.item-qty').value);
        const harga = cleanNumber(row.querySelector('.item-harga').value);
        const kurs = cleanNumber(kursInput.value) || 1;
        
        const idrTotal = Math.round(qty * harga * kurs);
        row.querySelector('.item-amount').value = idrTotal.toLocaleString('id-ID');
        
        checkBudgetLimit(row);
        calculateTotal();
    }

    function populateSelect(selectEl, data, defaultText) {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      selectEl.innerHTML = `<option value="">${defaultText}</option>`;
      data.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.fullName; opt.textContent = emp.fullName;
        selectEl.appendChild(opt);
      });
      if (currentVal) selectEl.value = currentVal;
    }

    function populateBudgetDropdown(selectEl, dept) {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      const company = (companyNameSelect.value || '').trim().toUpperCase();
      const formatter = new Intl.NumberFormat('id-ID');
      
      selectEl.innerHTML = '<option value="">Pilih Budget</option>';
      
      console.log(`[DEBUG] Filtering budgets for Company: "${company}", Dept Filter: "${dept}"`);
      
      // Filter by Company AND (Department if provided)
      const filtered = allBudgets.filter(b => {
        const bCompany = (b.company || 'PT PILAR NIAGA MAKMUR').trim().toUpperCase();
        const bDept = (b.department || '').trim().toLowerCase();
        
        const matchCompany = bCompany === company;
        const matchDept = !dept || bDept === dept.trim().toLowerCase();
        
        return matchCompany && matchDept;
      });
      
      console.log(`[DEBUG] Found ${filtered.length} matching budgets`);
      
      filtered.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        const rem = b.remainingAmount !== undefined ? b.remainingAmount : (b.totalAmount || 0);
        opt.textContent = `${b.id} — ${b.description} (Sisa: Rp ${formatter.format(rem)})`;
        selectEl.appendChild(opt);
      });
      if (currentVal) selectEl.value = currentVal;
    }

    function checkBudgetLimit(row) {
      const budgetId = row.querySelector('.item-budget').value;
      const idrAmount = cleanNumber(row.querySelector('.item-amount').value);
      if (!budgetId || idrAmount === 0) return;
      const budgetData = allBudgets.find(b => b.id === budgetId);
      if (budgetData) {
        const remaining = budgetData.remainingAmount !== undefined ? budgetData.remainingAmount : (budgetData.totalAmount || 0);
        let totalThisBudget = 0;
        document.querySelectorAll('.line-item-row').forEach(r => {
           if (r.querySelector('.item-budget').value === budgetId) {
             totalThisBudget += cleanNumber(r.querySelector('.item-amount').value);
           }
        });
        const amountInput = row.querySelector('.item-amount');
        if (totalThisBudget > remaining) {
          amountInput.style.color = 'red'; amountInput.style.fontWeight = 'bold';
        } else {
          amountInput.style.color = ''; amountInput.style.fontWeight = '';
        }
      }
    }

    // 2c. Vendor Logic
    const vendorInput = document.getElementById('vendor');
    const bankTujuanInput = document.getElementById('bankTujuan');
    const rekBankTujuanInput = document.getElementById('rekBankTujuan');

    function updateVendorInfo() {
      const selectedVendorName = vendorInput.value;
      const matchedVendor = allVendors.find(v => v.name === selectedVendorName);
      if (matchedVendor) {
        bankTujuanInput.value = matchedVendor.bank || '';
        rekBankTujuanInput.value = matchedVendor.account || '';
      }
    }

    vendorInput.addEventListener('input', updateVendorInfo);
    vendorInput.addEventListener('change', updateVendorInfo);

    // 3. Line Items Logic
    btnAddRow.addEventListener('click', () => {
      rowCount++;
      const tr = document.createElement('tr');
      tr.className = 'line-item-row';
      tr.innerHTML = `
        <td class="td-no"></td>
        <td><input type="text" name="items[]" class="item-memo" placeholder="Memo" required></td>
        <td><select name="items[]" class="item-budget" required></select></td>
        <td><input type="text" name="items[]" class="item-qty" value="1" placeholder="1" required></td>
        <td><input type="text" name="items[]" class="item-harga" placeholder="0" required></td>
        <td><input type="text" name="items[]" class="item-amount" placeholder="0" readonly></td>
        <td><button type="button" class="btn-remove-row" onclick="removeRow(this)"><span class="material-icons-round">delete</span></button></td>
      `;
      const budgetSelect = tr.querySelector('.item-budget');
      budgetSelect.required = companyNameSelect.value === 'PT PILAR NIAGA MAKMUR';
      
      lineItemsBody.appendChild(tr);
      populateBudgetDropdown(budgetSelect, divisiSelect.value);
      tr.querySelector('.item-qty').addEventListener('input', (e) => { formatNumberInput(e); calculateRowTotal(tr); });
      tr.querySelector('.item-harga').addEventListener('input', (e) => { formatNumberInput(e); calculateRowTotal(tr); });
      tr.querySelector('.item-budget').addEventListener('change', () => checkBudgetLimit(tr));
      updateRowNumbers();
    });
  
    document.querySelectorAll('.line-item-row').forEach(row => {
        row.querySelector('.item-qty').addEventListener('input', (e) => { formatNumberInput(e); calculateRowTotal(row); });
        row.querySelector('.item-harga').addEventListener('input', (e) => { formatNumberInput(e); calculateRowTotal(row); });
        row.querySelector('.item-budget').addEventListener('change', () => checkBudgetLimit(row));
    });

    function formatNumberInput(e) {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val) e.target.value = parseInt(val, 10).toLocaleString('id-ID');
    }
  
    function calculateTotal() {
      let total = 0;
      document.querySelectorAll('.item-amount').forEach(input => {
        total += cleanNumber(input.value);
      });
      totalAmountEl.textContent = `IDR ${total.toLocaleString('id-ID')}`;
    }
  
    window.removeRow = function(btn) {
      btn.closest('tr').remove(); updateRowNumbers(); calculateTotal();
    };
  
    function updateRowNumbers() {
      const rows = document.querySelectorAll('.line-item-row');
      rows.forEach((row, index) => {
        row.querySelector('.td-no').textContent = index + 1;
        row.querySelector('.item-memo').name = `items[${index}][memo]`;
        row.querySelector('.item-budget').name = `items[${index}][budgetId]`;
        row.querySelector('.item-qty').name = `items[${index}][qty]`;
        row.querySelector('.item-harga').name = `items[${index}][hargaSatuan]`;
        row.querySelector('.item-amount').name = `items[${index}][amount]`;
        row.querySelector('.btn-remove-row').disabled = rows.length === 1;
      });
    }
  
    async function generateFRPNumber() {
      const company = companyNameSelect.value;
      if (!company) return;
      
      const isPNM = company === 'PT PILAR NIAGA MAKMUR';
      let dept = divisiSelect.value;
      
      if (!isPNM) {
        // If not PNM, allow empty dept and use a default
        dept = dept || 'GENERAL';
      } else if (!dept) {
        // If PNM but no dept selected yet, don't generate
        return;
      }
      
      try {
          const res = await fetch(`/api/next-frp-number/${encodeURIComponent(dept)}`);
          const data = await res.json();
          const frpNo = data.frpNo;
          
          let hidden = document.getElementById('hiddenFrpNo') || document.createElement('input');
          hidden.id = 'hiddenFrpNo'; hidden.type = 'hidden'; hidden.name = 'frpNo';
          if(!document.getElementById('hiddenFrpNo')) form.appendChild(hidden);
          hidden.value = frpNo;
          
          const displayEl = document.getElementById('frpNoDisplay');
          if (displayEl) displayEl.textContent = frpNo;
      } catch (e) {
          console.error("Failed to generate FRP number", e);
      }
    }

    // 5. Preview & Save Logic
    if (btnPreview) {
      btnPreview.addEventListener('click', async () => {
        if (!form.checkValidity()) { form.reportValidity(); return; }
        await generateFRPNumber();
        const formData = new FormData(form);
        const dataObj = Object.fromEntries(formData.entries());
        dataObj.items = Array.from(document.querySelectorAll('.line-item-row')).map((row) => ({
            memo: row.querySelector('.item-memo').value,
            budgetId: row.querySelector('.item-budget').value,
            qty: row.querySelector('.item-qty').value,
            hargaSatuan: row.querySelector('.item-harga').value,
            amount: row.querySelector('.item-amount').value
        }));
        dataObj.checkDocs = Array.from(document.querySelectorAll('input[name="checkDocs[]"]:checked')).map(el => el.value);
    
        try {
          btnPreview.innerHTML = 'Loading...';
          btnPreview.disabled = true;
          const response = await fetch('/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataObj)
          });
          const html = await response.text();
          previewContent.innerHTML = `<iframe id="previewIframe" style="width:100%;height:600px;border:none;"></iframe>`;
          const iframeDoc = document.getElementById('previewIframe').contentWindow.document;
          iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();
          previewModal.classList.add('active');
        } catch (error) { alert('Gagal memuat preview!'); } finally {
          btnPreview.innerHTML = 'Preview'; btnPreview.disabled = false;
        }
      });
    }
  
    if (closeModal) closeModal.addEventListener('click', () => { previewModal.classList.remove('active'); });
  
    btnSaveSubmit.addEventListener('click', async () => {
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!confirm('Anda yakin ingin menyimpan dan men-submit form FRP ini?')) return;
      const rows = document.querySelectorAll('.line-item-row');
      const budgetTotals = {};
      rows.forEach(row => {
          const bId = row.querySelector('.item-budget').value;
          const amt = cleanNumber(row.querySelector('.item-amount').value);
          if (bId) budgetTotals[bId] = (budgetTotals[bId] || 0) + amt;
      });
      for (const bId in budgetTotals) {
          const budgetData = allBudgets.find(b => b.id === bId);
          if (budgetData) {
              const remaining = budgetData.remainingAmount !== undefined ? budgetData.remainingAmount : (budgetData.totalAmount || 0);
              if (budgetTotals[bId] > remaining) {
                  alert(`⛔ TIDAK DAPAT MENYIMPAN\n\nBudget ${bId} tidak mencukupi.\nSisa: Rp ${remaining.toLocaleString('id-ID')}\nTotal Pengajuan: Rp ${budgetTotals[bId].toLocaleString('id-ID')}`);
                  return;
              }
          }
      }
      const dataObj = Object.fromEntries(new FormData(form).entries());
      dataObj.items = Array.from(rows).map((row) => ({
          memo: row.querySelector('.item-memo').value,
          budgetId: row.querySelector('.item-budget').value,
          qty: row.querySelector('.item-qty').value,
          hargaSatuan: row.querySelector('.item-harga').value,
          amount: row.querySelector('.item-amount').value
      }));
      dataObj.checkDocs = Array.from(document.querySelectorAll('input[name="checkDocs[]"]:checked')).map(el => el.value);
      try {
        btnSaveSubmit.innerHTML = 'Menyimpan...';
        btnSaveSubmit.disabled = true;
        const response = await fetch('/api/frp/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataObj)
        });
        const resData = await response.json();
        if(resData.success) { alert('Berhasil!'); window.location.href = '/approval'; }
      } catch (error) { alert('Gagal memproses!'); } finally {
        btnSaveSubmit.disabled = false; btnSaveSubmit.innerHTML = 'Save & Submit Pengajuan';
      }
    });
    document.getElementById('tanggalFrp').valueAsDate = new Date();
});
