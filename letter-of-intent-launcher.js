'use strict';
// Letter of Intent is temporarily removed from the report workflow.
(() => {
  function remove(){document.getElementById('ptLoiLaunch')?.remove();document.getElementById('ptLoiHelp')?.remove();}
  remove();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',remove,{once:true});
})();
