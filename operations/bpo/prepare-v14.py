"""Generate web geometry from approved v14; retain legacy storage keys explicitly."""
from pathlib import Path
import sys,json,re,shutil
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject
import pymupdf as fitz
root=Path(__file__).resolve().parents[2];dest=root/'assets/bpo'
src=Path(sys.argv[1]);r=PdfReader(src)
assert len(r.pages)==2 and len(r.get_fields())==452
mapping={'header_date':'field_0002','header_property_address':'field_0008','header_firm':'field_0015','header_completed_by':'field_0018','header_phone':'field_0019','header_email':'field_0021','header_client_name':'field_0014','market_owner_percent':'field_0038','market_renter_percent':'field_0039','subject_value_low':'field_0047','subject_value_high':'field_0048','subject_marketing_days':'field_0053','subject_financing_explanation':'field_0054','subject_previous_list_price':'field_0058','subject_not_sold_reason':'field_0062','value_as_is':'field_0477','list_as_is':'field_0478','value_repaired':'field_0479','list_repaired':'field_0480','comments':'field_0482','signature_date':'field_0483','signature':'field_0484','repairs_total':'repair.total'}
radios={'header_bpo_type':{'Desktop':'bpo_type_desktop','Exterior':'field_0007','Interior':'bpo_type_interior','Updated':'field_0005'},'market_condition':dict(zip(['Depressed','Slow','Stable','Improving','Excellent'],['field_0023','field_0024','field_0025','field_0026','field_0027'])),'market_price_trend':dict(zip(['Decreased','Increased','Stable'],['field_0033','field_0036','field_0037'])),'subject_neighborhood_fit':{'Over-improvement':'field_0051','Under-improvement':'field_0049','Appropriate':'field_0050'},'subject_financing_available':{'Yes':'field_0056','No':'field_0057'},'subject_recently_listed':{'Yes':'field_0060','No':'field_0061'},'marketing_strategy':dict(zip(['As-is','Minimal lender-required repairs','Repaired'],['field_0259','field_0260','field_0261'])),'likely_buyer':{'Owner occupant':'field_0262','Investor':'field_0263'}}
fields=[]
for pi,page in enumerate(r.pages):
 for ref in page['/Annots']:
  a=ref.get_object();parent=a.get('/Parent',a).get_object();pdfname=parent['/T'];name=mapping.get(pdfname,pdfname);ft=parent['/FT'];option=None
  if pdfname in radios:
   option=next(str(k)[1:] for k in a['/AP']['/N'] if k!='/Off');name=radios[pdfname][option]
  elif pdfname.startswith('subject_shared.'):
   name=('sold' if pi==0 else 'active')+'.0.'+pdfname.split('.',1)[1]
  if re.match(r'^(sold|active)\.',name):
   base,key=name.rsplit('.',1)
   aliases={'proximity':'distance','sale_date':'date','total':'rooms','concessions':'financing','porch':'porches','net_adjustment':'net','adjusted_price':'adjusted'}
   if key=='net_adjustment':key='net'
   elif key.endswith('_adjustment'):key='adj_'+aliases.get(key[:-11],key[:-11])
   else:key=aliases.get(key,key)
   name=base+'.'+key
  if pdfname.startswith('repair.'):
   _,n,key=pdfname.split('.');name='repair.'+str(int(n)-1)+'.'+key
  x,y,x2,y2=map(float,a['/Rect']);kind='check' if ft=='/Btn' else 'select' if ft=='/Ch' else 'textarea' if int(parent.get('/Ff',0))&4096 else 'text'
  label=str(parent.get('/TU',pdfname)).replace('Subject ','').replace(' - shared between sold and active sections','').replace('_',' ')
  if name.startswith(('sold.','active.')):
   p,n,key=name.split('.',2);label=('Subject' if n=='0' else f'{p.title()} comp {n}')+' '+key.replace('adj_','').replace('_',' ')+( ' adjustment ($)' if key.startswith('adj_') else '')
  if pdfname=='market_months_supply':label='Months of supply'
  if option:label=pdfname.replace('_',' ')+': '+option
  fields.append(dict(name=name,pdfName=pdfname,label=label,page=pi,x=x,y=y,w=x2-x,h=y2-y,kind=kind,option=option,group=pdfname if option else None,readonly=bool(int(parent.get('/Ff',0))&1),section='market' if (pdfname.startswith('market_') or pdfname.startswith('subject_') and not pdfname.startswith('subject_shared.')) else 'other',background=list(a.get('/MK',{}).get('/BG',[]))))
# The render source is static artwork; live web controls supply all values.
shutil.copyfile(src,dest/'template.pdf')
w=PdfWriter();w.clone_document_from_reader(r)
for page in w.pages:page.pop(NameObject('/Annots'),None)
w.root_object.pop(NameObject('/AcroForm'),None);w.root_object.pop(NameObject('/Names'),None)
with open(dest/'background.pdf','wb') as f:w.write(f)
for i,p in enumerate(fitz.open(dest/'background.pdf')):p.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(dest/f'page-{i+1}.png')
(dest/'fields.json').write_text(json.dumps(fields,indent=2))
(root/'supabase/functions/bpo-extract/fields.json').write_text(json.dumps(fields,indent=2))
print('Prepared',len(fields),'web controls mapped to',len(r.get_fields()),'canonical PDF fields')
