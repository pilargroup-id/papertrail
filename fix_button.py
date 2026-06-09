f = open(r'c:\Projects\frp\frontend\src\components\button\ButtonActionApprovalRp.jsx', 'rb')
content = f.read().decode('utf-8')
f.close()

# The broken sequence to find and fix
old_seq = "          alignItems: 'center',\n          borderRadius: '30px',\r\n"
new_seq = "          alignItems: 'center',\n          background: '#f1f5f9',\n          border: '1px solid #e2e8f0',\n          borderRadius: '30px',\n"

if old_seq in content:
    content = content.replace(old_seq, new_seq, 1)
    f = open(r'c:\Projects\frp\frontend\src\components\button\ButtonActionApprovalRp.jsx', 'wb')
    f.write(content.encode('utf-8'))
    f.close()
    print('REPLACED OK')
else:
    print('NOT FOUND')
    # Try to find what's there
    marker = "canManagerApprove && ("
    pos = content.find(marker)
    print(repr(content[pos:pos+200]))
