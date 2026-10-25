# Comp financing staging verification — 2026-10-25

User deployed PropertyThesis-staging-comp-financing-2026-10-25.zip.
ZIP SHA-256: c0c9f001fcfb8cd2f986c2936ab545adc1349932fbb59588e26864bdd13ae9e4.
Complete 342-file package preserves previous staging assets except the three intentional JS updates.

19 local regression checks passed: comp save/edit/account isolation, financing defaults and switching, integer ordinary tax validation, property action handler preservation, comp report/model, and property deletion.

Deployed HTTP bodies verified byte-for-byte against candidate-comp-financing:
- income-comparable-analysis.js
- guided-save-existing-workflow-v8.js
- income-comparables.js
- property-deletion.js (preserved)
- native/ios-verification/ (preserved index.html; canonical directory URL)

Cash, conventional mortgage and private financing are persisted in the comp assumptions. Financing defaults are modeling assumptions (20% down, 6.5%, 30 years) and remain editable. NOI/cap rate is independent of financing.
Open Property and Client Report remain primary; Income Comps is retained. Duplicate Edit Analysis removed; Analysis versions, Start New Analysis, archive and delete are under More actions.
No production deployment or native app rebuild performed. Signed-in user visual acceptance remains to be performed.
