export function saleLine(item, description, amount, serviceDate) {
  const fee = Number(amount);
  if (!item || typeof description !== 'string' || !description.trim() || description.length > 500 ||
      !Number.isFinite(fee) || fee <= 0 || fee > 9999999999.99 || Number(fee.toFixed(2)) !== fee ||
      !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || new Date(serviceDate+'T12:00Z').toISOString().slice(0,10) !== serviceDate)
    throw new Error('review_order_lines');
  return {DetailType:'SalesItemLineDetail',Description:description,Amount:fee,SalesItemLineDetail:{
    ItemRef:{value:item}, Qty:1, UnitPrice:fee, ServiceDate:serviceDate}};
}
export function invoiceBody(customer, lines, existing, monthDate) {
  if (!existing) return {CustomerRef:{value:customer},EmailStatus:'NotSet',
    AllowOnlineCreditCardPayment:false,AllowOnlineACHPayment:false,Line:lines,...(monthDate?{TxnDate:monthDate}:{})};
  if (existing.CustomerRef?.value !== customer || !(Number(existing.Balance)>0) ||
      !existing.Id || existing.SyncToken == null || !Array.isArray(existing.Line)) throw new Error('review_open_invoice');
  // QuickBooks computes the final subtotal. Preserve all user-entered lines and intermediate subtotals.
  const original=existing.Line.slice();
  if(original.at(-1)?.DetailType==='SubTotalLineDetail' && !original.at(-1)?.Id) original.pop();
  return {Id:existing.Id,SyncToken:existing.SyncToken,sparse:true,CustomerRef:{value:customer},Line:[...original,...lines]};
}
