# Report presentation checks

Every `npm run build` first runs `npm run verify:reports`. A failed check stops the website build before publication. The GitHub Actions build saves a validation receipt as the `report-validation` artifact.

The checker reads the admitted public snapshot and renders evening reports, US reports and weekly recaps in English and Chinese. It checks ranking counts against admitted source tables, numeric formatting in image rows, dates, placeholder-only financing panels, locale fact parity, whole-image budgets and section-image coverage. Section images must also pass when a whole image fits.

These checks cover presentation of admitted inputs. They do not approve research, establish point-in-time availability or establish source completeness. A partial source table is compared with its actual row count. Oversized individual sections still fail the build.

## Run locally

```bash
npm run verify:reports -- --snapshot /path/to/frozen/public --receipt /path/outside/inputs/receipt.json
```

Receipts are created once and must stay outside the input directory. Inputs must be a frozen tree of regular files without symbolic links. The checker compares hashes before and after validation. This detects observed changes; callers must prevent concurrent writers. It does not provide a filesystem lock.

## Validate an owner candidate

Pass `--candidate /path/to/candidate.json` together with the snapshot options. The manifest must be canonical JSON on one line, with exactly these fields. Use the actual revisions and SHA-256 of the owner-produced Markdown.

```json
{"schema_version":"market_intel.asia_report_candidate.v1","report_id":"2026-10-30-evening","markdown_path":"report.md","markdown_sha256":"<64 lowercase hexadecimal characters>","producer_revision":"<40 lowercase hexadecimal characters>","consumer_revision":"<40 lowercase hexadecimal characters>"}
```

The Markdown must use the owner's dated public wrapper. The candidate replaces the matching report only for this validation process. It is never copied into the public snapshot. Revision fields are caller declarations recorded in the receipt, not attestations. The receipt also records the running validator revision and entrypoint hash. Keep the source checkout clean when collecting release evidence.
