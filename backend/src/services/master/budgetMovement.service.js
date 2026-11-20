const { randomUUID } = require('crypto');
const { db } = require('../../config/database.config');
const ActivityLogService = require('../activity/activityLog.service');

function bad(message, code = 400) { const error = new Error(message); error.statusCode = code; return error; }
function integerId(value, name) { const n = Number(value); if (!Number.isSafeInteger(n) || n <= 0) throw bad(`${name} must be a positive integer`); return n; }
function amountInCents(value) {
  const s = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(s)) throw bad('amount must be a positive decimal with at most 2 digits');
  const [whole, fraction = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw bad('amount must be greater than zero');
  return cents;
}
function centsOf(value) { return Math.round(Number(value) * 100); }
function decimal(cents) { return (cents / 100).toFixed(2); }
async function lockedBudgets(conn, ids) {
  const sorted = [...new Set(ids)].sort((a,b) => a-b);
  const [rows] = await conn.query(`SELECT * FROM master_budgets WHERE id IN (${sorted.map(()=>'?').join(',')}) ORDER BY id FOR UPDATE`, sorted);
  if (rows.length !== sorted.length) throw bad('One or more budgets were not found', 404);
  return new Map(rows.map(r => [Number(r.id),r]));
}
function usable(b) { if (Number(b.is_active) !== 1) throw bad(`Budget ${b.budget_code} is inactive`); }
function ensureAvailable(b, cents) { if (centsOf(b.budget_remaining) < cents) throw bad(`Budget ${b.budget_code} has insufficient remaining amount`); }
async function movement(conn, headerId, budget, type, delta, req) {
  const before = centsOf(budget.budget_remaining);
  const after = before + delta;
  if (after < 0) throw bad('Budget remaining cannot become negative');
  await conn.query('UPDATE master_budgets SET budget_amount = budget_amount + ?, budget_remaining = budget_remaining + ?, updated_at = NOW() WHERE id = ?', [decimal(delta),decimal(delta),budget.id]);
  await conn.query(`INSERT INTO budget_management_transaction_lines
    (transaction_id,budget_id,movement_type,amount,budget_amount_before,budget_amount_after,budget_remaining_before,budget_remaining_after)
    VALUES (?,?,?,?,?,?,?,?)`, [headerId,budget.id,type,decimal(Math.abs(delta)),budget.budget_amount,decimal(centsOf(budget.budget_amount)+delta),budget.budget_remaining,decimal(after)]);
  // This is an allocation movement, NOT a reserve/finalize. Preserve budget usage ledger semantics.
  await conn.query(`INSERT INTO budget_usage_logs
    (budget_id,source_module,source_header_id,transaction_type,amount,balance_before,balance_after,notes,created_by_user_id,created_by_user_name)
    VALUES (?, 'ADJUSTMENT', ?, 'ADJUST', ?, ?, ?, ?, ?, ?)`, [budget.id,headerId,decimal(delta),budget.budget_remaining,decimal(after),`${type} ${headerId}`,req.user.id,req.user.name || null]);
  await ActivityLogService.createActivityLog(conn, {req,module:'MASTER',entityType:'master_budgets',entityId:budget.id,action:type,description:`${type} budget ${budget.budget_code}`,oldValues:{budget_amount:budget.budget_amount,budget_remaining:budget.budget_remaining},newValues:{budget_amount:decimal(centsOf(budget.budget_amount)+delta),budget_remaining:decimal(after)},metadata:{transaction_id:headerId,amount:decimal(delta)}});
}
async function insertHeader(conn, type, fromId, toId, amount, reason, req) {
  const id = randomUUID();
  await conn.query(`INSERT INTO budget_management_transactions (id,transaction_type,source_budget_id,destination_budget_id,amount,reason,created_by_user_id,created_by_user_name)
  VALUES (?,?,?,?,?,?,?,?)`, [id,type,fromId,toId,decimal(amount),reason,req.user.id,req.user.name || null]);
  return id;
}
function reasonOf(body) {const s = String(body.reason || '').trim(); if (!s || s.length > 1000) throw bad('reason is required (max 1000 chars)');return s;}
async function transfer(body,req) {
  const fromId = integerId(body.source_budget_id,'source_budget_id');
  const toId = integerId(body.destination_budget_id,'destination_budget_id');
  if (fromId === toId) throw bad('Source and destination budgets must differ');
  const cents = amountInCents(body.amount), reason = reasonOf(body);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const budgets = await lockedBudgets(conn,[fromId,toId]);
    const source = budgets.get(fromId), target = budgets.get(toId);
    usable(source);usable(target);
    for(const key of ['company_id','department_id','class_department_id']) {
      if (String(source[key]) !== String(target[key])) throw bad('Transfer requires identical company, department and class department');
    }
    ensureAvailable(source,cents);
    const id = await insertHeader(conn,'TRANSFER',fromId,toId,cents,reason,req);
    await movement(conn,id,source,'TRANSFER_OUT',-cents,req);
    await movement(conn,id,target,'TRANSFER_IN',cents,req);
    await conn.commit();return {id,transaction_type:'TRANSFER',source_budget_id:fromId,destination_budget_id:toId,amount:decimal(cents)};
  } catch(error){await conn.rollback();throw error;} finally {conn.release();}
}
async function adjust(id,body,req) {
  const budgetId = integerId(id,'budget_id');
  const operation = String(body.operation || '').toUpperCase();
  if (!['INCREASE','DECREASE'].includes(operation)) throw bad('operation must be INCREASE or DECREASE');
  const cents = amountInCents(body.amount), reason = reasonOf(body);
  const conn = await db.getConnection();
  try {await conn.beginTransaction();
    const budget=(await lockedBudgets(conn,[budgetId])).get(budgetId);usable(budget);
    const delta=operation==='INCREASE'?cents:-cents;
    if(delta<0)ensureAvailable(budget,cents);
    const txId=await insertHeader(conn,'ADJUSTMENT',budgetId,null,cents,reason,req);
    await movement(conn,txId,budget,operation,delta,req);
    await conn.commit();return {id:txId,transaction_type:'ADJUSTMENT',budget_id:budgetId,operation,amount:decimal(cents)};
  }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
async function history(query={}) {
  const page=Math.max(1,Math.floor(Number(query.page)||1));const limit=Math.min(100,Math.max(1,Math.floor(Number(query.limit)||20)));
  const budgetId = query.budget_id ? integerId(query.budget_id,'budget_id'):null;
  const values=[];let where='';
  if(budgetId){where='WHERE EXISTS (SELECT 1 FROM budget_management_transaction_lines l WHERE l.transaction_id=t.id AND l.budget_id=?)';values.push(budgetId);}
  const [[{total}]] = await db.query(`SELECT COUNT(*) total FROM budget_management_transactions t ${where}`,values);
  const [rows]=await db.query(`SELECT t.* FROM budget_management_transactions t ${where} ORDER BY t.created_at DESC,t.id DESC LIMIT ? OFFSET ?`,[...values,limit,(page-1)*limit]);
  if(!rows.length)return {rows,meta:{page,limit,total:Number(total),totalPages:Math.ceil(Number(total)/limit)}};
  const [lines]=await db.query(`SELECT * FROM budget_management_transaction_lines WHERE transaction_id IN (${rows.map(()=>'?').join(',')}) ORDER BY id`,rows.map(x=>x.id));
  const map = new Map(rows.map(r=>[r.id,{...r,lines:[]}]));for(const l of lines)map.get(l.transaction_id).lines.push(l);
  return {rows:[...map.values()],meta:{page,limit,total:Number(total),totalPages:Math.ceil(Number(total)/limit)}};
}
module.exports={transfer,adjust,history};
