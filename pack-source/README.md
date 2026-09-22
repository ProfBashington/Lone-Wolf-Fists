# Pack source baseline

These JSON files are the editable, stable-ID source representation for the Foundry
compendia. They were exported from the published Lone Wolf Fists v1.2.4 release archive:

- SHA-256: `d19ffca7cb3fd4d6a4bc6446ca721f18279abdf91642855f2b673ab134074d04`
- Source commit: `73a6683301792bf1eabb14022dd3dff6fac36944`

The compendium contents are not covered by the system's MIT license. Preserve the existing
content restrictions when copying or modifying these files.

Run `npm run packs:roundtrip` from the system root to build and semantically validate the
generated LevelDB packs. The `records` array holds every LevelDB record sorted by key; document
and embedded-document IDs are therefore preserved exactly.
