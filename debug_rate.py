with open(r'c:\Projects\frp\frontend\src\pages\frp\NewFRP.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find("values.currency !== 'IDR'")
print(repr(content[idx-30:idx+600]))
