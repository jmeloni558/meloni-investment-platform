import hashlib,json,pathlib
root=pathlib.Path('.')
expected=json.loads((root/'ci-candidate/source-manifest.json').read_text())
site=root/'_site'
for name,digest in expected.items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest, 'Source drift: '+name
    if name.endswith(('.html','.js','.css','.png','.svg','.webp','.ico','.jpg','.jpeg')):
        assert hashlib.sha256((site/name).read_bytes()).hexdigest()==digest, 'Built asset drift: '+name
assert (site/'assets/css/style.css').is_file()
assert (site/'CALCULATION_AUDIT.html').is_file()
assert not (site/'ci-candidate').exists(), 'Build-only material exposed'
auth=[n for n in expected if n.startswith('turnstile-auth-protection.') and n.endswith('.js')]
assert len(auth)==1
for route in ('index.html','latest.html','app-core.html'):
    assert auth[0] in (site/route).read_text()
assert 'Production shared saving is not activated' in (site/'protected-cloud-save-bridge.js').read_text()
files={p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(site.rglob('*')) if p.is_file()}
pathlib.Path('candidate-build-manifest.json').write_text(json.dumps({'files':files,'productionReady':False,'deploymentPerformed':False},indent=2)+'\n')
print('Verified source files:',len(expected),'built files:',len(files))
