Version 0.4.0 adds numeric seller concessions, explicit A/C, active MLS identifiers, property type, pond/lake views and qualified market comments. Live subject and comparable tabs verified. Current subject facts remain manual; locked controls and existing values remain protected.

# RRR importer mapping and verification

Version 0.3.0 adds explicit MLS identifiers; whole/half bath counts; attached/detached/built-in garage types and counts; living area when no basement is explicitly recorded or the area is explicitly above-grade; and days on market where the portal permits edits. Ambiguous MLS bath shorthand, unknown basement details and mixed parking descriptions remain manual. Carport spaces are not represented as garage spaces.

The macro files were used only as field-mapping references, not copied or executed. No fixed defaults for HOA, concessions, occupancy, utilities or zoning were adopted. Existing subject identity, preview, address-conflict, overwrite and adjustment-dependency protections remain. No save, validate or submit action is automated.

Seventeen focused automated tests passed. Live authorized Comparable Information testing verified six sets of bath counts, living areas and calculated area totals, attached garage types/counts, and three MLS identifiers. Previously verified addresses, prices, signed net adjustments and adjusted prices remained consistent. Thirty additional fields were filled with no fill failures. RRR locks DOM on the inspected form. Subject Information and persistence after user save were not tested in this pass.

Manual review remains necessary for facts missing from the BPO, generic or truncated style descriptions, valuation horizons, and original listing history. No customer property data is included in these fixtures.