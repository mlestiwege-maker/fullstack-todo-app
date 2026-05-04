# Changelog

All notable changes to this project are documented in this file.

## [2026-05-04]
### Fixed
- Updated frontend TypeScript configs to enable stricter checks and file-name casing consistency.
- Corrected backend imports to support direct module execution and stable pytest collection.

### Added
- Backend unit tests for authentication token/password behavior (`backend/test_auth.py`).
- Backend unit tests for todo database CRUD and isolation behavior (`backend/test_database.py`).
- Added `pytest` to backend requirements for reproducible local/CI verification.

### Verified
- Frontend production build passes.
- Backend test suite passes (`11 passed`).
