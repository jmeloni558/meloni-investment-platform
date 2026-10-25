"""Read-only consistent logical checkpoint; only user-DPAPI ciphertext reaches disk."""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone
import production_export_connection as connection
from capture_production_database_password import encrypt_password

ROOT = Path(__file__).resolve().parent
SCHEMAS = ['public', 'propertythesis_private', 'retention_private', 'auth', 'storage']

def main():
    started = datetime.now(timezone.utc)
    folder = ROOT / '.local-data' / ('production-recovery-' + started.strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir(exist_ok=False)
    binary = ROOT / '.local-data/pgsql/bin'
    with connection.connect() as db:
        db.execute('begin isolation level repeatable read read only')
        snapshot = db.execute('select pg_export_snapshot()').fetchone()[0]
        version = db.execute('show server_version').fetchone()[0]
        schemas = [r[0] for r in db.execute('select nspname from pg_namespace where nspname=any(%s) order by nspname', (SCHEMAS,)).fetchall()]
        if 'public' not in schemas or 'auth' not in schemas or 'storage' not in schemas:
            raise RuntimeError('Required schemas unavailable')
        counts = {name: db.execute('select count(*) from ' + name).fetchone()[0] for name in
                  ['auth.users', 'public.properties', 'public.analyses', 'public.scenarios', 'storage.objects']}
        comp_tables = [t for t in ['property_income_comparables', 'property_sales_comparables', 'property_rental_comparables']
                       if db.execute("select to_regclass(%s) is not null", ('public.' + t,)).fetchone()[0]]
        for t in comp_tables:
            counts['public.' + t] = db.execute('select count(*) from public.' + t).fetchone()[0]
        env = os.environ.copy()
        env.update(PGHOST='aws-0-us-west-2.pooler.supabase.com', PGPORT='5432',
                   PGUSER='postgres.lmaiqpkogmmsldkziggy', PGDATABASE='postgres',
                   PGPASSWORD=connection.password(), PGSSLMODE='verify-full',
                   PGSSLROOTCERT=str(ROOT / '.local-data/windows-root-certificates.pem'),
                   PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=180000',
                   PGCONNECT_TIMEOUT='15')
        try:
            result = subprocess.run([str(binary / 'pg_dump.exe'), '--format=custom', '--no-owner',
                '--no-publications', '--no-subscriptions', '--lock-wait-timeout=5s', '--snapshot=' + snapshot,
                *['--schema=' + s for s in schemas]], env=env, capture_output=True, timeout=240)
        finally:
            env.pop('PGPASSWORD', None)
        if result.returncode or not result.stdout.startswith(b'PGDMP'):
            raise RuntimeError('Database export failed; server details suppressed')
        payload = result.stdout
        db.rollback()
    # Archive parsing is a local integrity check, never a database restore.
    listing = subprocess.run([str(binary / 'pg_restore.exe'), '--list'], input=payload, capture_output=True, timeout=60)
    if listing.returncode or b'TABLE DATA' not in listing.stdout:
        raise RuntimeError('Archive structure verification failed')
    for t in comp_tables:
        if ('TABLE DATA public ' + t + ' ').encode() not in listing.stdout:
            raise RuntimeError('Comparable data missing from recovery archive: ' + t)
    digest = hashlib.sha256(payload).hexdigest()
    encrypted = encrypt_password(base64.b64encode(payload).decode('ascii'))
    archive = folder / 'application-checkpoint.pgcustom.dpapi'
    with archive.open('x', encoding='ascii') as output:
        output.write(encrypted)
    # Reuse the current-user DPAPI decoder on the checkpoint, not the credential.
    cipher = base64.b64decode(archive.read_text('ascii').split(':', 1)[1], validate=True)
    import ctypes
    buffer = ctypes.create_string_buffer(cipher)
    source = connection.Blob(len(cipher), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    restored = connection.Blob()
    unprotect = ctypes.windll.crypt32.CryptUnprotectData
    unprotect.argtypes = [ctypes.POINTER(connection.Blob), ctypes.c_void_p, ctypes.c_void_p,
                         ctypes.c_void_p, ctypes.c_void_p, connection.wintypes.DWORD, ctypes.POINTER(connection.Blob)]
    unprotect.restype = connection.wintypes.BOOL
    if not unprotect(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(restored)):
        raise RuntimeError('Encrypted checkpoint readback failed')
    try:
        recovered = base64.b64decode(ctypes.string_at(restored.data, restored.size), validate=True)
        if hashlib.sha256(recovered).hexdigest() != digest:
            raise RuntimeError('Checkpoint checksum mismatch')
    finally:
        ctypes.memset(restored.data, 0, restored.size)
        ctypes.windll.kernel32.LocalFree(ctypes.cast(restored.data, ctypes.c_void_p))
    receipt = dict(project='lmaiqpkogmmsldkziggy', capturedAt=started.isoformat(),
        completedAt=datetime.now(timezone.utc).isoformat(), serverVersion=version,
        schemas=schemas, counts=counts, archiveBytes=len(payload), archiveSha256=digest,
        encryptedSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
        tableDataEntries=listing.stdout.count(b'TABLE DATA'), archive=str(archive.relative_to(ROOT)),
        readOnly=True, tlsVerified=True, consistentSnapshot=True, decryptedReadbackVerified=True,
        restoreExecuted=False, encryption='Windows current-user DPAPI; not independently portable',
        exclusions=['Storage object bytes', 'roles and provider-managed configuration outside selected schemas',
                    'Edge function secrets and deployment settings', 'writes committed after snapshot'],
        scope='Logical application/Auth/Storage-metadata checkpoint. Requires compatible managed destination and deletion/provider reconciliation before restore.')
    (folder / 'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'success':False, 'errorType':type(error).__name__, 'detailsSuppressed':True}))
        raise SystemExit(1)
