"""Staging transaction-only synthetic recovery rehearsal. No customer rows exported."""
import sys,json,base64,ctypes,hashlib
from pathlib import Path
from uuid import uuid4
ops=Path(__file__).resolve().parents[2]/'release-integration'
sys.path.insert(0,str(ops))
import staging_export_connection as connection
from capture_staging_database_password import encrypt_password

def main():
 with connection.connect() as db:
  db.execute('begin read write')
  try:
   user,subject=str(uuid4()),str(uuid4())
   db.execute("insert into auth.users(id,email) values(%s,%s)",(user,'income-comps-recovery-'+user+'@example.invalid'))
   db.execute("insert into public.properties(id,user_id,name) values(%s,%s,'Synthetic recovery subject')",(subject,user))
   evidence={'version':1,'items':[{'id':'synthetic-comp','salePrice':600000,'operating':{'noi':48000},'source':'Synthetic recovery test'}],'reconciliation':{'rate':.08,'notes':'Synthetic only'}}
   db.execute('insert into public.property_income_comparables(property_id,user_id,evidence) values(%s,%s,%s::jsonb)',(subject,user,json.dumps(evidence)))
   row=db.execute('select to_jsonb(c) from public.property_income_comparables c where property_id=%s',(subject,)).fetchone()[0]
   payload=json.dumps(row,sort_keys=True)
   encrypted=encrypt_password(payload)
   raw=base64.b64decode(encrypted.split(':',1)[1]);buf=ctypes.create_string_buffer(raw)
   src=connection.Blob(len(raw),ctypes.cast(buf,ctypes.POINTER(ctypes.c_ubyte)));out=connection.Blob()
   fn=ctypes.windll.crypt32.CryptUnprotectData
   fn.argtypes=[ctypes.POINTER(connection.Blob),ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p,connection.wintypes.DWORD,ctypes.POINTER(connection.Blob)]
   fn.restype=connection.wintypes.BOOL
   if not fn(ctypes.byref(src),None,None,None,None,1,ctypes.byref(out)): raise RuntimeError('Decrypt failed')
   try: recovered=ctypes.string_at(out.data,out.size).decode()
   finally:
    ctypes.memset(out.data,0,out.size)
    ctypes.windll.kernel32.LocalFree.argtypes=[ctypes.c_void_p]
    ctypes.windll.kernel32.LocalFree(ctypes.cast(out.data,ctypes.c_void_p))
   assert recovered==payload
   db.execute('delete from public.property_income_comparables where property_id=%s',(subject,))
   restored=json.loads(recovered)
   db.execute('insert into public.property_income_comparables(property_id,user_id,revision,evidence) values(%s,%s,%s,%s::jsonb)',(restored['property_id'],restored['user_id'],restored['revision'],json.dumps(restored['evidence'])))
   assert db.execute('select evidence from public.property_income_comparables where property_id=%s',(subject,)).fetchone()[0]==evidence
   db.execute('delete from public.properties where id=%s',(subject,))
   assert db.execute('select count(*) from public.property_income_comparables where property_id=%s',(subject,)).fetchone()[0]==0
  finally: db.execute('rollback')
 print(json.dumps({'encryptedRoundTrip':True,'stagingRestore':True,'subjectCascade':True,'rolledBack':True,'customerDataExported':False,'plaintextFileWritten':False}))
if __name__=='__main__':
 try: main()
 except Exception as e:
  print(json.dumps({'passed':False,'errorType':type(e).__name__,'sqlstate':getattr(e,'sqlstate',None)}));sys.exit(1)
