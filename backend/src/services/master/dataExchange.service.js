const ExcelJS = require('exceljs');
const { db } = require('../../config/database.config');
const { checkUserModulePermission } = require('../permission/modulePermission.service');
const ActivityLogService = require('../activity/activityLog.service');

// Fixed allowlist. Never interpolate client-selected table or column identifiers.
const SHEETS = {
  Vendors: {table:'master_vendors', permission:'MASTER_VENDOR', fields:['id','name','is_active'], key:['name']},
  Banks: {table:'master_banks', permission:'MASTER_BANK', fields:['id','code','name','sort_order','is_active'], key:['code']},
  VendorBankAccounts: {table:'master_vendor_bank_accounts',permission:'MASTER_VENDOR_BANK_ACCOUNT',fields:['id','vendor_id','bank_id','account_number','account_name','is_primary','is_active'],key:['vendor_id','bank_id','account_number']},
  BudgetTypes: {table:'master_budget_types',permission:'MASTER_BUDGET_TYPE',fields:['id','code','name','description','is_active','sort_order'],key:['code']},
  Budgets: {table:'master_budgets',permission:'MASTER_BUDGET',fields:['id','budget_code','company_id','company_code_snapshot','company_name_snapshot','department_id','department_name_snapshot','department_class_snapshot','department_code_snapshot','class_department_id','class_name_snapshot','class_class_snapshot','class_code_snapshot','budget_type_id','project_name','budget_amount','period_year','period_month','is_active'],key:['budget_code']},
  BudgetAccessRules: {table:'master_budget_access_rules',permission:'MASTER_BUDGET_ACCESS_RULE',fields:['id','module','access_type','department_id','department_name_snapshot','department_class_snapshot','department_code_snapshot','is_active'],key:['module','access_type','department_id']},
  Currencies: {table:'master_currencies',permission:'MASTER_CURRENCY',fields:['id','code','name','symbol','is_base_currency','is_active','sort_order'],key:['code']},
  ExchangeRates: {table:'currency_exchange_rates',permission:'MASTER_CURRENCY',fields:['id','currency_code','base_currency_code','rate_date','rate_type','buy_rate','sell_rate','middle_rate','source_name','source_url','fetched_at','is_active'],key:['currency_code','base_currency_code','rate_date','rate_type']},
};
const GROUPS = {vendor_banking:['Vendors','Banks','VendorBankAccounts'],budget:['BudgetTypes','Budgets','BudgetAccessRules'],currency:['Currencies','ExchangeRates']};
function fail(message,statusCode=400) {const e=new Error(message);e.statusCode=statusCode;throw e;}
function choose(group) {if(!Object.prototype.hasOwnProperty.call(GROUPS,group))fail('Unknown data exchange group');return GROUPS[group];}
async function authorize(user,sheets,mode) {
  for(const name of sheets) {
    const permission=SHEETS[name].permission;
    await checkUserModulePermission(user,permission,mode==='export'?'view':'create');
    if(mode==='upsert')await checkUserModulePermission(user,permission,'update');
  }
}
function scalar(value) {
  if(value===undefined||value===null||value==='')return null;
  if(value instanceof Date) return value.toISOString().slice(0,19).replace('T',' ');
  if(typeof value==='object') {
    if(value.result!==undefined)return scalar(value.result);
    if(value.text!==undefined)return scalar(value.text);
    return null;
  }
  return value;
}
function validName(name) {if(!Object.prototype.hasOwnProperty.call(SHEETS,name))fail('Invalid sheet');return SHEETS[name];}
async function workbookFromUpload(file) {
  if(!file || !file.buffer || !/\.xlsx$/i.test(file.originalname||''))fail('An .xlsx upload is required');
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(file.buffer);return wb;
}
async function parseUpload(file,group) {
  const expected=choose(group);const wb=await workbookFromUpload(file);
  const present=expected.filter(name=>wb.getWorksheet(name));
  if(!present.length)fail(`Workbook has no recognized sheet for ${group}`);
  const result=[];
  for(const name of present) {
    const sheet=wb.getWorksheet(name),schema=validName(name);
    const headers=sheet.getRow(1).values.slice(1).map(v=>String(v||'').trim());
    if(headers.some(h=>h && !schema.fields.includes(h)))fail(`Unknown column in ${name}`);
    if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)fail(`Duplicate column in ${name}`);
    if(headers.length===0)fail(`Missing headers in ${name}`);
    const entries=[];
    sheet.eachRow((row,n)=>{
      if(n===1)return;
      const item={};let hasValue=false;
      headers.forEach((h,i)=>{if(!h)return;const v=scalar(row.getCell(i+1).value);if(v!==null){item[h]=v;hasValue=true;}});
      if(hasValue)entries.push({excel_row:n,data:item});
    });
    if(entries.length>5000)fail(`Sheet ${name} exceeds 5000 rows`);
    result.push({name,schema,entries});
  }
  return result;
}
async function schemaInfo(conn,schema) {
  const [columns]=await conn.query(`SHOW COLUMNS FROM \`${schema.table}\``);
  const supported=new Set(columns.map(c=>c.Field));
  const filtered=schema.fields.filter(f=>supported.has(f));
  const required=columns.filter(c=>c.Null==='NO' && c.Default===null && !String(c.Extra).includes('auto_increment') && !['created_at','updated_at'].includes(c.Field)).map(c=>c.Field);
  return {fields:filtered,required};
}
function prepareRows(sheets,infos,mode) {
  const errors=[];const prepared=[];
  for(const sheet of sheets) {
    const info=infos.get(sheet.name);
    for(const e of sheet.entries) {
      const data={...e.data};
      const prefix=`${sheet.name} row ${e.excel_row}`;
      for(const k of Object.keys(data))if(!info.fields.includes(k))errors.push(`${prefix}: column ${k} not available in DB`);
      // Importing budget creates allocation only. Updating allocation/balances bypasses audit and is forbidden.
      if(sheet.name==='Budgets') {
        if(mode==='UPSERT' && data.id!==undefined)errors.push(`${prefix}: budget UPSERT is forbidden; use Budget Transfer/Adjustment`);
        if(data.budget_amount===undefined || !Number.isFinite(Number(data.budget_amount)) || Number(data.budget_amount)<0)errors.push(`${prefix}: valid nonnegative budget_amount required`);
        data.budget_reserved='0.00';data.budget_used='0.00';data.budget_remaining=data.budget_amount;
      }
      for(const required of info.required)if((data[required]===undefined||data[required]===null)&&!(sheet.name==='Budgets'&&['budget_reserved','budget_used','budget_remaining'].includes(required)))errors.push(`${prefix}: ${required} required`);
      prepared.push({name:sheet.name,table:sheet.schema.table,row:e.excel_row,data});
    }
  }
  return {prepared,errors};
}
async function lookupExisting(conn,schema,data,lock=false) {
  const byId = data.id !== undefined && data.id !== null && data.id !== '';
  const matchKeys=byId?['id']:schema.key;
  if(!matchKeys.every(k => data[k] !== undefined && data[k] !== null && data[k] !== ''))return null;
  const [rows]=await conn.query(`SELECT id FROM \`${schema.table}\` WHERE ${matchKeys.map(k=>`\`${k}\`=?`).join(' AND ')} LIMIT 1 ${lock?'FOR UPDATE':''}`,matchKeys.map(k=>data[k]));
  return rows[0]||null;
}
async function preflight(file,group,mode,user) {
  if(!['INSERT_ONLY','UPSERT','SKIP_DUPLICATES'].includes(mode))fail('Invalid import mode');
  const sheets=await parseUpload(file,group);
  await authorize(user,sheets.map(s=>s.name),mode==='UPSERT'?'upsert':'import');
  const conn=await db.getConnection();
  try {
    const infos=new Map();for(const s of sheets)infos.set(s.name,await schemaInfo(conn,s.schema));
    const {prepared,errors}=prepareRows(sheets,infos,mode);
    // Count matching primary IDs for review. Database constraints/FKs are validated again in transaction on import.
    const report=[];
    for(const sheet of sheets) {
      let insert=0,update=0,skip=0;
      for(const e of prepared.filter(x=>x.name===sheet.name)){
        const existing=await lookupExisting(conn,sheet.schema,e.data);
        if(existing&&mode==='UPSERT')update++;
        else if(existing&&mode==='SKIP_DUPLICATES')skip++;
        else if(existing)errors.push(`${sheet.name} row ${e.row}: id already exists`);
        else insert++;
      }
      report.push({sheet:sheet.name,total:sheet.entries.length,insert,update,skip});
    }
    return {sheets,prepared,errors,report};
  }finally{conn.release();}
}
function groups(){return Object.entries(GROUPS).map(([code,sheets])=>({code,sheets:sheets.map(name=>({name,columns:SHEETS[name].fields}))}));}
async function buildWorkbook(group,user,template=false) {
  const names=choose(group);await authorize(user,names,'export');
  const wb=new ExcelJS.Workbook();const conn=await db.getConnection();
  try {
    for(const name of names){
      const schema=validName(name),info=await schemaInfo(conn,schema);
      const cols=info.fields;const ws=wb.addWorksheet(name);ws.addRow(cols);ws.getRow(1).font={bold:true};ws.views=[{state:'frozen',ySplit:1}];
      cols.forEach((c,i)=>ws.getColumn(i+1).width=Math.min(Math.max(c.length+4,16),36));
      if(!template){
        const [rows]=await conn.query(`SELECT ${cols.map(c=>`\`${c}\``).join(',')} FROM \`${schema.table}\` ORDER BY id LIMIT 50000`);
        for(const r of rows)ws.addRow(cols.map(c=>r[c]));
      }
    }
  }finally{conn.release();}
  return Buffer.from(await wb.xlsx.writeBuffer());
}
async function validate(file,group,mode,user){const info=await preflight(file,group,mode,user);return {valid:info.errors.length===0,mode,group,report:info.report,errors:info.errors.slice(0,100)};}
async function importWorkbook(file,group,mode,req) {
  const info=await preflight(file,group,mode,req.user);
  if(info.errors.length)fail(`Import validation failed: ${info.errors.slice(0,5).join('; ')}`);
  const conn=await db.getConnection();let applied=0,skipped=0;
  try {await conn.beginTransaction();
    for(const entry of info.prepared) {
      const data=entry.data;
      const columns=Object.keys(data),values=Object.values(data);
      if(!columns.length)continue;
      const schema=validName(entry.name);
      const existing=await lookupExisting(conn,schema,data,true);
      const exists=!!existing;
      if(exists&&mode==='SKIP_DUPLICATES'){skipped++;continue;}
      if(exists&&mode==='INSERT_ONLY')fail(`${entry.name} row ${entry.row}: ID already exists`);
      if(exists&&entry.name==='Budgets')fail('Existing budget cannot be imported/updated');
      if(exists) {
        const cols=columns.filter(c=>c!=='id');if(!cols.length){skipped++;continue;}
        await conn.query(`UPDATE \`${entry.table}\` SET ${cols.map(c=>`\`${c}\`=?`).join(',')} WHERE id=?`,[...cols.map(c=>data[c]),existing.id]);
      }else {
        await conn.query(`INSERT INTO \`${entry.table}\` (${columns.map(c=>`\`${c}\``).join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,values);
      }
      applied++;
    }
    await ActivityLogService.createActivityLog(conn,{req,module:'MASTER',entityType:'master_data_exchange',action:'IMPORT',description:`Import master group ${group}`,oldValues:null,newValues:{group,mode,applied,skipped},metadata:{sheets:info.report}});
    await conn.commit();return {group,mode,applied,skipped,report:info.report};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
module.exports={groups,buildWorkbook,validate,importWorkbook};
