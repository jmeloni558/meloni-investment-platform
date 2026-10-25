from pathlib import Path
import re
r=Path('_site')
for folder in ['operations','tests','supabase','ci-candidate']:
    assert not (r/folder).exists(),f'Nonpublic files included: {folder}'
for entry in ['index.html','latest.html']:
    text=(r/entry).read_text()
    assert 'analysis-evidence-guidance.js' in text
    assert 'income-comparable-analysis.js' in text
    assert 'guided-analysis-unit-rents.js' in text
    for script in re.findall(r"'([^']+\.js)'",text):
        assert (r/script).is_file(),f'{entry}: missing {script}'
    assert 'oxyjbfhpsxaaerchyaql' not in text
for f in ['income-comparables.js','income-comparables-model.js','income-comparable-analysis.js','unit-rents.js','analysis-evidence-guidance.js','assets/workflow-subject-income.webp','assets/workflow-income-comps.webp']:
    assert (r/f).read_bytes()==Path(f).read_bytes(),f'Built asset changed: {f}'
assert 'lmaiqpkogmmsldkziggy' in (r/'cloud.js').read_text()
print('Production entry points, script dependencies, screenshot bytes and operator-file exclusions verified.')
