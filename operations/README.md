# Operational recovery integration

These reviewed files are overlays for `prototypes/release-integration` in the existing operator workspace. They have been copied there on this Windows computer. They are not browser assets and must not be included in a public website ZIP.

- `export-production-recovery.py`: retains the existing whole-public-schema encrypted dump. Adds the income-comps count to its receipt when installed and requires the archive TOC to include its TABLE DATA entry. No new production export was run for this change.
- `retention-restore-preflight.cjs` and `retention-active-data-check.cjs`: recognize the reviewed optional table when installed, inspect its user_id records, and continue rejecting all unknown ownership tables. Compatible with production before this migration and staging after it.
- Twelve unit tests pass, including surviving/restored income comp data and unrelated schema drift.
- `tests/income-comparables-recovery.py` ran using Python 3.13 and the existing private staging adapter. A synthetic row passed Windows DPAPI encrypt/decrypt, staging restore, and subject-delete cascade. All database changes rolled back; no customer data or plaintext files were exported.

Full custom-format pg_dump restore applies data before post-data revision triggers, preserving revisions. The synthetic row-level rehearsal used revision 1; it is not certification of a complete project restore. Existing backup-copy registration, independent deletion ledger and restore quarantine requirements remain applicable. Current-user DPAPI still requires the Windows account and is not independently portable.
