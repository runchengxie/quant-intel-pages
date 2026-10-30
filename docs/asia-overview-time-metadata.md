# Asian overview source-time metadata

The overview parser reads time meaning from a date-bound marker. Its display text can change without changing source admission. Historical source sentences remain supported through a separate compatibility constant.

## Producer format

The installed Platform renderer places exactly one marker inside `### 亚洲市场概览`.

```markdown
<!-- market_intel.asia_overview.v1 {"date":"2026-10-16","source_time_kind":"exchange_session_close"} -->
```

The versioned prefix scopes this metadata to overview source times. JSON is compact and canonical with exactly the sorted `date` and `source_time_kind` keys. The date must match the requested report date. The supported kind describes an exchange-calendar session close. It does not represent an observed quote-publication time. Retrieval times remain in the owner fact artifact.

The owner still validates each observed time against the applicable exchange calendar before rendering. Existing rows, source links and evidence IDs retain their meaning.

## Consumer behavior

Pages admits a single marker of at most 2048 UTF-8 bytes. Unknown versions, unknown kinds, duplicate markers or JSON keys, additional fields, malformed input and date mismatches produce `sourceTimeMetadataStatus=invalid`. Market rows continue through their existing validation. The time-kind claim is omitted and a localized notice reports that its meaning could not be verified.

A valid marker yields `sourceTimeKind=exchange_session_close` and status `structured`. With no marker, the exact historical source sentence yields status `legacy`. A malformed marker cannot borrow that legacy sentence to conceal invalid metadata. A marker in another section has no authority.

`sourceTimeSemantics` supplies display text only. The historical sentence used by older reports lives in a separate protocol constant. English source-text translation also retains that independent mapping, so changing presentation copy does not make old evidence disappear.

## Validation and rollout

Tests cover locale-independent numeric observations, edited presentation text, legacy reports and invalid metadata. Provider and consumer changes use separate PRs. The provider must be integrated before adopting its output in production. This document does not indicate that a task branch has been deployed.

[简体中文](asia-overview-time-metadata.zh-CN.md)
