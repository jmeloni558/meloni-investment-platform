"""Prepare the supplied two-page BPO as a clean, script-free template and field geometry."""
import io,json,sys
from pathlib import Path
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject
from reportlab.pdfgen import canvas
root=Path(__file__).resolve().parents[2]
src=PdfReader(sys.argv[1]); fields=[]
def add(name,label,page,x,y,w,h=11,kind='text',group=None):
 fields.append(dict(name=name,label=label,page=page,x=x,y=y,w=w,h=h,kind=kind,group=group))
# Keep the form's general sections but replace ambiguous auto-generated fields with named controls.
labels={1:'REO number',2:'Report date',3:'Loan number',4:'Initial opinion',5:'Updated opinion',6:'Second opinion',7:'Exterior only',8:'Subject street address',9:'Sales representative',10:'Sales representative continued',11:'Subject city',12:'Subject state',13:'Subject ZIP',14:'Client name',15:'Firm name',16:'Contact name',17:'Contact name continued',18:'Completed by',19:'Phone',20:'Fax',21:'Email',23:'Market: depressed',24:'Market: slow',25:'Market: stable',26:'Market: improving',27:'Market: excellent',28:'Employment: declining',29:'Employment: stable',30:'Employment: improving',31:'Price decrease percent',32:'Decrease period months',33:'Prices decreased',34:'Price increase percent',35:'Increase period months',36:'Prices increased',37:'Prices stable',38:'Owner occupants percent',39:'Tenants percent',40:'Normal supply',41:'Oversupply',42:'Shortage',44:'Comparable listings count',45:'REO listings count',46:'Boarded homes count',47:'Neighborhood value low',48:'Neighborhood value high',49:'Under improvement',50:'Appropriate improvement',51:'Over improvement',53:'Normal marketing days',54:'Financing limitations explanation',56:'All financing available: yes',57:'All financing available: no',58:'Prior list price',60:'Listed in past 12 months: yes',61:'Listed in past 12 months: no',62:'Reason property did not sell',64:'Single family detached',65:'Condo',66:'Co-op',67:'Manufactured',68:'Land only',69:'Single family attached',70:'Townhouse',71:'Modular',72:'Condotel',74:'Environmental issues: yes',75:'Environmental issues: no',76:'Environmental referral reason',77:'Children six and under',79:'Discoloration over 100 square feet',256:'REO number page 2',259:'Marketing: as is',260:'Marketing: minimal repairs',261:'Marketing: repaired',262:'Buyer: owner occupant',263:'Buyer: investor',477:'As-is market value',478:'As-is suggested list price',479:'Repaired market value',480:'Repaired suggested list price',482:'Comments and value reconciliation',483:'Signature date',484:'Signature / prepared by (typed, not a digital signature)'}
for pi,page in enumerate(src.pages[:2]):
 for ref in page.get('/Annots',[]):
  a=ref.get_object();n=a.get('/T','');i=int(n.split('_')[-1]) if n.startswith('field_') else 0
  if i not in labels:continue
  x,y,x2,y2=map(float,a['/Rect']); kind='check' if x2-x<16 and y2-y<12 else 'textarea' if y2-y>18 else 'text'
  add(n,labels[i],pi,x,y,x2-x,y2-y,kind)
# Both grids. Actual input geometry avoids the source form's misplaced widgets.
rows=[('financing','Sales / financing concessions',349,24),('location','Location',337,11),('tenure','Leasehold / fee simple',325,11),('site','Site / lot size',313,11),('view','View',301,11),('design','Design and appeal',289,11),('quality','Construction quality',277,11),('year','Year built',265,11),('condition','Condition',253,11),('gla','Gross living area',217,11),('basement','Basement / finished below grade',193,23),('utility','Functional utility',181,11),('hvac','Heating / cooling',169,11),('energy','Energy efficient items',157,11),('garage','Garage / carport',145,11),('porches','Porches / patio / deck / fireplaces',121,23),('pool','Fence / pool',109,11),('other','Other',97,11)]
for kind,pi,delta in [('sold',0,0),('active',1,263.8)]:
 for col in range(4):
  prefix=f'{kind}.{col}';x=105.5 if col==0 else [185,322,459][col-1];w=78 if col==0 else 135
  who='Subject' if col==0 else f'{kind.title()} comp {col}'
  add(prefix+'.address',who+' address',pi,x,458+delta,w,27,'textarea')
  if col:
   add(prefix+'.distance',who+' proximity',pi,x,445+delta,75)
   add(prefix+'.reo',who+' REO/corporate',pi,x+115,446+delta,13,8,'check')
  add(prefix+'.price',who+(' sale price' if kind=='sold' else ' list price'),pi,x+5,433+delta,w-6)
  add(prefix+'.ppsf',who+' price per sq ft (calculated)',pi,x+5,421+delta,w-30)
  add(prefix+'.source',who+' data source',pi,x,407+delta if pi==0 else 661,w,11 if pi==0 else 23)
  if pi==0 and col:
   add(prefix+'.date',who+' sale date',pi,x,396,w,10)
   add(prefix+'.dom',who+' days on market',pi,x,385,w,10)
  if pi==1:
   add(prefix+'.dom',who+' days on market',pi,x,613,78)
   if col:add(prefix+'.adj_dom',who+' days on market adjustment',pi,x+79,613,55)
  for key,label,y,h in rows:
   shift=delta+(12 if pi==1 and key=='financing' else 0)
   add(prefix+'.'+key,who+' '+label,pi,x,y+shift,78,h,'textarea' if h>18 else 'text')
   if col:add(prefix+'.adj_'+key,who+' '+label+' adjustment (+ / - $)',pi,x+79,y+shift,55,11)
  for key,off,cw in [('rooms',0,20),('beds',22,20),('baths',44,34)]:add(prefix+'.'+key,who+' '+key,pi,x+off,229+delta,cw,11)
  if col:
   add(prefix+'.adj_rooms',who+' room count adjustment',pi,x+79,229+delta,55)
   add(prefix+'.net',who+' net adjustment (calculated)',pi,x+79,85+delta,55)
   add(prefix+'.adjusted',who+' adjusted price (calculated)',pi,x+79,62+delta,55,22)
for i in range(10):
 x=50 if i<5 else 331.5;y=852-(i%5)*12
 add(f'repair.{i}.recommended',f'Repair {i+1}: recommended',1,x-19,y+2,12,7,'check')
 add(f'repair.{i}.description',f'Repair {i+1}: description',1,x,y,173)
 add(f'repair.{i}.cost',f'Repair {i+1}: cost',1,x+185,y,63)
add('repair.total','Total repair budget (calculated)',1,332,786.5,107)
writer=PdfWriter()
for i in range(2):
 page=writer.add_page(src.pages[i]);page.pop(NameObject('/Annots'),None);page.pop(NameObject('/AA'),None)
 # The supplied PDF also contains baked appearance XObjects from old fields.
 # All /I* forms in this source are field appearances, not report artwork.
 content=page.get_contents();content.operations=[(args,op) for args,op in content.operations if not (op==b'Do' and str(args[0]).startswith('/I'))];page.replace_contents(content)
 overlay=io.BytesIO();c=canvas.Canvas(overlay,pagesize=(612,1008));c.setFillColorRGB(1,1,1)
 c.rect(290,20,70,20,fill=1,stroke=0);c.setFillColorRGB(0,0,0);c.setFont('Helvetica',6);c.drawString(295,25,f'Page {i+1} of 2')
 if i==1:
  c.setFillColorRGB(1,1,1);c.rect(149,194,445,29,fill=1,stroke=0);c.setFillColorRGB(0,0,0);c.setFont('Helvetica',7)
  c.drawString(151,214,'Explain the comparable evidence, adjustments and final value opinion.')
  c.drawString(151,204,'Include relevant property concerns, limitations and unverified information.')
 c.save();page.merge_page(PdfReader(overlay).pages[0])
(root/'assets/bpo/template.pdf').write_bytes(b'')
with open(root/'assets/bpo/template.pdf','wb') as f:writer.write(f)
(root/'assets/bpo/fields.json').write_text(json.dumps(fields,indent=2),encoding='utf8')
print('Prepared 2 pages and',len(fields),'named controls; source left unchanged')
