# Manual BPO folder setup

Creating an order creates its OneDrive folder but does not start MLS, iMapp, RPR or BPO Notes preparation. The desktop dashboard's Setup Folders button authorizes one batch of open Interior BPO, Exterior BPO and Desktop BPO orders. The Field App does not offer this button.

The installed desktop helper processes that batch sequentially. It skips verified complete setups, preserves existing files and workbook entries, and reports incomplete setups in the progress window. Press Setup Folders again to retry incomplete work. The work computer must remain awake and signed in to the report providers. No recurring task launches report preparation.

Keep desktop-bridge.py, setup_folders.py, bpo_reports.py and bpo_notes.py together with the existing folder helper and dependencies. Restart the PropertyThesis Explorer Opener task after updating them. sync.ps1 remains folder creation only.

BPO Notes uses the blank Desktop template, puts the address in the top blue bar, and fills client, BPO type and available subject information. Latest MLS supplies beds/baths; iMapp is the fallback. Condition, other, placement, style, values, inspection/completion dates, comp boxes and right columns remain untouched. Zillow is skipped when a bot check appears.

Desktop BPO orders are excluded from Google Maps. Changing an existing order to Desktop BPO queues removal when no other in-person order needs that address.
