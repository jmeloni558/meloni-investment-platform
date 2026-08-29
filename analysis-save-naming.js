'use strict';
(()=>{
  const VERSION=2;
  if((window.__analysisSaveNamingVersion||0)>=VERSION)return;
  window.__analysisSaveNamingVersion=VERSION;

  // protected-cloud-save-bridge.js owns analysis naming. Keep this marker for
  // older cached pages, but do not wrap saveCurrentCloud: the retired wrapper
  // prompted for the first Base Case and discarded the successful save result.
  window.AnalysisSaveNaming={version:VERSION,handledBy:'protected-cloud-save-bridge'};
})();
