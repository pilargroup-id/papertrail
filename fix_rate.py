import re

with open(r'c:\Projects\frp\frontend\src\pages\frp\NewFRP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r"<div className=\"frp-form-group\">\n"
    r"\s+<label className=\"frp-label\">Currency</label>\n"
    r"\s+<div style=\{\{ display: 'flex', gap: '8px', alignItems: 'center' \}\}>\n"
    r"\s+<div style=\{\{ flex: 1, minWidth: 0 \}\}>\n"
    r".*?"  # SearchableSelect block
    r"</div>\n"
    r"\s+<div style=\{\{ position: 'relative', display: 'flex', alignItems: 'center', width: '200px', flexShrink: 0 \}\}>\n"
    r"\s+<span style=\{\{ position: 'absolute', left: '10px', fontSize: '0\.8rem', color: '#94a3b8', fontWeight: 600, pointerEvents: 'none' \}\}>Rate:</span>\n"
    r"\s+<input\n"
    r"\s+name=\"kurs\"\n"
    r"\s+className=\"frp-input\"\n"
    r"\s+style=\{\{ paddingLeft: '42px', height: '42px', fontSize: '0\.9rem', width: '100%', background: values\.currency === 'IDR' \? '#f8fafc' : undefined, color: values\.currency === 'IDR' \? '#94a3b8' : undefined \}\}\n"
    r"\s+value=\{values\.kurs\}\n"
    r"\s+onChange=\{e => updateField\('kurs', e\.target\.value\)\}\n"
    r"\s+readOnly=\{values\.currency === 'IDR'\}\n"
    r"\s+/>\n"
    r"\s+</div>\n"
    r"\s+</div>\n"
    r"\s+</div>",
    re.DOTALL
)

new_block = """<div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="frp-form-group" style={{ flex: 1, minWidth: 0 }}>
                    <label className="frp-label">Currency</label>
                    <SearchableSelect
                      name="currency"
                      value={values.currency}
                      onChange={async selectedValue => {
                        updateField('currency', selectedValue)
                        if (selectedValue === 'IDR') {
                          updateField('kurs', '1')
                        } else {
                          updateField('kurs', 'Memuat...')
                          try {
                            const data = await frpService.getKurs(selectedValue)
                            if (data.success && data.rate) {
                              updateField('kurs', String(data.rate))
                            } else {
                              updateField('kurs', '1') // fallback
                              console.error('API Error:', data.error)
                            }
                          } catch (e) {
                            updateField('kurs', '1')
                            console.error('Gagal mengambil kurs:', e)
                          }
                        }
                      }}
                      options={currencySelectOptions}
                      placeholder="Pilih Currency"
                      className="frp-select"
                    />
                  </div>
                  <div className="frp-form-group" style={{ width: '180px', flexShrink: 0 }}>
                    <label className="frp-label">Rate</label>
                    <input
                      name="kurs"
                      className="frp-input"
                      style={{ width: '100%', background: values.currency === 'IDR' ? '#f8fafc' : undefined, color: values.currency === 'IDR' ? '#94a3b8' : undefined }}
                      value={values.kurs}
                      onChange={e => updateField('kurs', e.target.value)}
                      readOnly={values.currency === 'IDR'}
                    />
                  </div>
                </div>"""

new_content, n = pattern.subn(new_block, content)
if n > 0:
    with open(r'c:\Projects\frp\frontend\src\pages\frp\NewFRP.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'SUCCESS: {n} replacement(s) made')
else:
    print('PATTERN NOT MATCHED')
