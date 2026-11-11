// PropertyThesis uses QuickBooks for tracking. Client email is never an automated action.
export function companyRequest(company, route, init) {
  const method = init.method ?? 'GET';
  const read = method === 'GET' && (
    /^\/(?:invoice|customer)\/\d+$/.test(route) || route === '/preferences' ||
    /^\/query\?query=[^&#]+$/.test(route)
  );
  const write = method === 'POST' && /^\/(invoice|upload)\?requestid=[a-zA-Z0-9-]+$/.test(route);
  if (!read && !write) throw new Error('unsupported_quickbooks_operation');
  if (write && route.startsWith('/invoice?')) {
    const invoice = JSON.parse(init.body);
    if (invoice.EmailStatus !== undefined && invoice.EmailStatus !== 'NotSet')
      throw new Error('quickbooks_client_email_disabled');
  }
  return fetch(company + route, {...init, redirect:'error'});
}
