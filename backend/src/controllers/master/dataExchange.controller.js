const R=require('../../utils/response.util');
const Service=require('../../services/master/dataExchange.service');
const permitted=['vendor_banking','budget','currency'];
function group(req){const value=String(req.query.group||req.body?.group||'');if(!permitted.includes(value)){const e=new Error('Grup tidak valid.');e.statusCode=400;throw e;}return value;}
function sheet(req){const value=String(req.query.sheet||req.body?.sheet||'').trim();return value||null;}
async function groups(req,res,next){try{return R.ok(res,Service.groups(),'Data exchange groups retrieved');}catch(e){next(e);}}
async function template(req,res,next){try{await send(req,res,true);}catch(e){next(e);}}
async function exportData(req,res,next){try{await send(req,res,false);}catch(e){next(e);}}
async function send(req,res,template){const g=group(req);const s=sheet(req);const buffer=await Service.buildWorkbook(g,req,template,s);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="${s?s.toLowerCase():g}-${template?'template':'export'}.xlsx"`);return res.send(buffer);}
async function validate(req,res,next){try{return R.ok(res,await Service.validate(req.file,group(req),String(req.body.mode||'INSERT_ONLY').toUpperCase(),req,sheet(req)),'Import validation completed');}catch(e){next(e);}}
async function importData(req,res,next){try{return R.ok(res,await Service.importWorkbook(req.file,group(req),String(req.body.mode||'INSERT_ONLY').toUpperCase(),req,sheet(req)),'Import completed');}catch(e){next(e);}}
module.exports={groups,template,exportData,validate,importData};
