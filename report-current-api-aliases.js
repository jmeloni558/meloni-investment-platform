'use strict';
(() => {
  const VERSION=1;
  if((window.__reportCurrentApiAliasesVersion||0)>=VERSION)return;
  window.__reportCurrentApiAliasesVersion=VERSION;

  // Compatibility aliases for older callers that still reference the
  // pre-PropertyThesis report API names. These aliases point only to the
  // current renderer/presentation stack and do not alter report data.
  if(window.ReportBuilderV1?.render && !window.ReportBuilderV1.renderReport){
    window.ReportBuilderV1.renderReport=window.ReportBuilderV1.render;
  }
  if(window.ReportBuilderV8Presentation && !window.ReportBuilderV8){
    window.ReportBuilderV8=window.ReportBuilderV8Presentation;
  }
})();
