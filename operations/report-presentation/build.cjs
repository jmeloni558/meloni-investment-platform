const path=require('node:path');
require('esbuild').buildSync({
  entryPoints:[path.join(__dirname,'website-report-pdf.cjs')],
  bundle:true,platform:'browser',target:'chrome110',minify:true,
  nodePaths:(process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean),
  outfile:path.resolve(__dirname,'../../website-report-pdf.reader-20261025.js')
});
