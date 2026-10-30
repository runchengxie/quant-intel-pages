# Report delivery checks

The user approved the previously described improvements to publication checks, section images, timestamp transport and legacy isolation. This plan covers the Pages-owned publication check. The other changes have separate task branches and owners.

The checker reads a frozen, already admitted public snapshot through Pages readers. It compares English and Chinese structured facts, checks admitted ranking counts, observation dates and placeholder handling, and renders the same images used by readers. A whole-image budget failure is allowed only when the actual section exporter succeeds. Other render failures block publication. The result describes presentation checks and input hashes; research approval remains with the research owner.

- Add failing tests for dropped rankings, future observations, missing image values and locale fact drift.
- Implement focused report checks and a read-only CLI. Candidate Markdown inputs require a caller-supplied SHA-256 and a matching dated report identity.
- Reuse the section exporter once its owner PR is merged. Keep current whole-image limits and explicit degraded export mode.
- Run the checker in the existing build before output replacement. Retain the previous site when validation fails. Record a machine-readable receipt as a CI artifact.
- Validate actual installed owner output with its public wrapper, the complete retained public window and both languages. Keep all generated outputs outside the repository.
- Complete scoped tests, full relevant checks and independent review. Merge provider changes before consumers, verify the prospective combined tree and keep production release pins explicit.
