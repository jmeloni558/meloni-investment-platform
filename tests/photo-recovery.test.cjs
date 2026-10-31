const {test}=require('node:test'),assert=require('node:assert/strict');
const {tablesForProject,findingsSql,TABLES}=require('../operations/retention-restore-preflight.cjs');
test('photo records and bytes are included in retention inventory',()=>{
 const inventory=[...TABLES,'photo_properties','photo_library_access'].map(table_name=>({table_name,column_name:'user_id',data_type:'uuid'}));
 const tables=tablesForProject('staging',inventory);
 assert.ok(tables.includes('photo_properties'));assert.ok(tables.includes('photo_library_access'));assert.match(findingsSql(tables),/property-photos/);
});
