'use strict';
// An MLS pool field can list both the property's pool and community access.
function privatePool(value){
  const text=String(value??'').toLowerCase().trim();
  if(/\b(?:no|not a|without a?)\s+private\b|\bprivate\s+pool\s*:\s*no\b/.test(text))return 0;
  if(/\bprivate\b/.test(text))return 1;
  if(/\b(?:community|none|no)\b/.test(text))return 0;
  return null;
}
module.exports={privatePool};
