# Changelog

All notable changes to this project will be documented in this file.

## [4.3.0] - 2026-01-13

### New Features (新功能)
- **Cloud Sync 2.0**: 
  - Added support for **Cloudflare Worker** as a custom synchronization backend (Fast & Accessible in China).
  - Maintained **GitHub Gist** support for users preferring raw GitHub storage.
  - Implemented conflict resolution using `updatedAt` timestamps.
- **Profile Isolation (Multi-User)**: 
  - Vocabulary data is now strictly isolated per profile.
  - Automatic migration of existing data to the default profile.
  - Zero-latency profile switching without page reload.
- **Data Migration**:
  - Added **Backup** feature: Export all vocabulary, settings, and drafts to a JSON file.
  - Added **Restore** feature: Import data from a JSON backup, enabling easy device migration.
- **Settings UI**:
  - Completely redesigned Settings Modal for better categorization.
  - Separated Cloud Sync configuration into a dedicated section.

### Improvements (改进)
- **Settings Layout**: Fixed nesting issues in the Settings modal where sections were incorrectly stacked.
- **Performance**: Optimized sync logic to reduce unnecessary API calls (only sync on explicit action or change).

### Documentation (文档)
- Added `docs/sync_guide_cloudflare.md` with detailed instructions for deploying the Sync Worker.
- Added `worker/index.js` and `wrangler.toml` for easy one-click deployment.

## [4.2.1] - 2026-01-11
- Initial release with local-first architecture.
- Core SRS Algorithm implementation.
