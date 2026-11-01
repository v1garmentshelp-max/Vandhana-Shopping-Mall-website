const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const filename=path.join(__dirname,'../src/components/ReturnShipmentStatus.tsx');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const loaded={exports:{}};
new Function('require','module','exports',compiled)(createRequire(filename),loaded,loaded.exports);
const render=shipment=>renderToStaticMarkup(React.createElement(loaded.exports.default,{shipment}));
test('cancelled pickup keeps the customer return active and hides its old AWB',()=>{
  const html=render({status:'RETURN CANCELED',awb:'OLD-CANCELLED-AWB',courier_name:'Old carrier',cancelled_at:'2026-10-30T10:00:00Z'});
  assert.match(html,/replacement pickup for your approved return/);assert.doesNotMatch(html,/OLD-CANCELLED-AWB|Old carrier/);
});
test('pending courier changes do not present the previous AWB as current',()=>{
  const html=render({status:'AWB_ASSIGNED',awb:'OLD-AWB',pending_action:'REASSIGN'});
  assert.match(html,/Wait for the confirmed courier/);assert.doesNotMatch(html,/OLD-AWB/);
});
test('confirmed replacement shows the selected courier and current handover reference',()=>{
  const html=render({status:'AWB_ASSIGNED',awb:'CURRENT-AWB',courier_name:'New carrier',reassigned_at:'2026-10-30T10:00:00Z'});
  assert.match(html,/New carrier/);assert.match(html,/CURRENT-AWB/);assert.match(html,/Use the current tracking number/);
});
test('delivered reverse tracking does not claim an inspection or refund has completed',()=>{
  const html=render({status:'RETURN DELIVERED',courier_name:'Carrier'});
  assert.match(html,/Refund processing follows receipt and inspection/);assert.doesNotMatch(html,/Refund completed/);
});
test('pickup failure and out for pickup show distinct customer next steps',()=>{
  assert.match(render({status:'RETURN PICKUP ERROR'}),/needs another attempt/);
  assert.match(render({status:'RETURN OUT FOR PICKUP'}),/Keep your package ready/);
});

test('undelivered tracking does not claim the returned parcel reached the store',()=>{
  assert.doesNotMatch(render({status:'RETURN UNDELIVERED'}),/return reached the store/);
  assert.doesNotMatch(render({status:'RETURN CANCELED',awb:'OLD-CANCELLED-AWB'}),/OLD-CANCELLED-AWB/);
});
