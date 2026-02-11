import { vocabService } from './vocab_service.js';

/**
 * @typedef {Object} SyncState
 * @property {'IDLE' | 'PREPARING' | 'PULLING' | 'ANALYZING' | 'DECIDING' | 'PUSHING' | 'RESOLVING' | 'ERROR'} status
 * @property {string|null} error
 */

/**
 * @typedef {Object} DiffSummary
 * @property {number} localCount
 * @property {number} remoteCount
 * @property {number} overwrites - Local overwriting Remote
 * @property {number} deletions - Remote items missing locally
 * @property {number} conflicts - Both changed (Remote newer)
 * @property {string[]} conflictKeys - Keys that have conflicts
 * @property {boolean} isDestructive - Heuristic trigger
 */

/**
 * @typedef {Object} SyncDecision
 * @property {'SAFE_TO_PUSH' | 'REQUIRE_CONFIRMATION' | 'MUST_MERGE'} action
 * @property {DiffSummary} diff
 * @property {Object} [remoteData]
 */

export class SyncManager {
    constructor(driver, localService) {
        this.driver = driver;
        this.local = localService; // vocabService
        this.state = 'IDLE';
        this.lastError = null;
        this.listeners = new Set();

        // Holding area for "Deciding" state
        this._pendingRemoteData = null;
        this._pendingDecision = null;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _setState(status, error = null) {
        this.state = status;
        this.lastError = error;
        this.listeners.forEach(cb => cb({ status, error }));
        console.log(`[SyncManager] State: ${status}`, error || '');
    }

    /**
     * Main Entry Point: Safe Push
     * @param {Object} options
     * @param {boolean} options.force - Skip heuristics?
     * @returns {Promise<SyncDecision>}
     */
    async safePush(options = { force: false }) {
        if (this.state !== 'IDLE') {
            throw new Error('Sync already in progress');
        }

        try {
            this._setState('PREPARING');
            const localData = await this.local.getAll();
            const localCount = Object.keys(localData).length;

            this._setState('PULLING');
            const remoteData = await this.driver.get(this.local.currentProfileId);

            this._setState('ANALYZING');
            const diff = this._analyzeDiff(remoteData, localData);

            if (!options.force && (diff.isDestructive || diff.conflicts > 0)) {
                this._pendingRemoteData = remoteData;
                this._setState('DECIDING');
                return {
                    action: 'REQUIRE_CONFIRMATION',
                    diff,
                    remoteData // Pass back for UI review if needed
                };
            }

            // If safe, proceed immediately
            return await this.executeDestructivePush(remoteData, localData);

        } catch (e) {
            this._setState('ERROR', e.message);
            throw e;
        }
    }

    /**
     * Continue after confirmation
     * @param {'OVERWRITE' | 'MERGE' | 'CANCEL'} userChoice
     */
    async resolveChoice(userChoice) {
        if (this.state !== 'DECIDING') throw new Error('Not in deciding state');

        try {
            if (userChoice === 'CANCEL') {
                this._setState('IDLE');
                return { status: 'cancelled' };
            }

            const localData = await this.local.getAll(); // Refresh incase changed

            if (userChoice === 'OVERWRITE') {
                // Just use local, ignore remote
                await this._pushToRemote(localData);
            } else if (userChoice === 'MERGE') {
                this._setState('RESOLVING');
                const merged = this._merge(localData, this._pendingRemoteData);
                await this.local.importData(merged); // Use importData for safety
                await this._pushToRemote(merged);
            }

            this._setState('IDLE');
            return { status: 'success' };
        } catch (e) {
            this._setState('ERROR', e.message);
            throw e;
        }
    }

    async executeDestructivePush(remoteData, localData) {
        this._setState('RESOLVING');
        let dataToPush = localData;

        if (remoteData) {
            dataToPush = this._merge(localData, remoteData);
            await this.local.importData(dataToPush);
        }

        await this._pushToRemote(dataToPush);

        this._setState('IDLE');
        return { action: 'SAFE_TO_PUSH', diff: null };
    }

    async _pushToRemote(data) {
        this._setState('PUSHING');
        await this.driver.post(data, { device: 'browser' }, this.local.currentProfileId);
    }

    _analyzeDiff(remote, local) {
        if (!remote) {
            return { localCount: Object.keys(local).length, remoteCount: 0, overwrites: 0, deletions: 0, conflicts: 0, isDestructive: false };
        }

        const remoteKeys = Object.keys(remote);
        const localKeys = new Set(Object.keys(local));

        const summary = {
            localCount: localKeys.size,
            remoteCount: remoteKeys.length,
            overwrites: 0,
            deletions: 0,
            conflicts: 0,
            conflictKeys: [],
            isDestructive: false
        };

        remoteKeys.forEach(k => {
            if (!localKeys.has(k)) {
                summary.deletions++;
            } else {
                const rTime = remote[k].updatedAt || 0;
                const lTime = local[k].updatedAt || 0;
                if (rTime > lTime) {
                    summary.conflicts++;
                    summary.conflictKeys.push(k);
                }
            }
        });

        if (summary.remoteCount > 10 && summary.deletions > (summary.remoteCount * 0.1)) {
            summary.isDestructive = true;
        }

        if (summary.remoteCount > 0 && summary.localCount === 0) {
            summary.isDestructive = true;
        }

        return summary;
    }

    _merge(local, remote) {
        if (!remote) return local;
        const merged = { ...local };

        Object.keys(remote).forEach(k => {
            const rItem = remote[k];
            const lItem = merged[k];

            if (!lItem) {
                merged[k] = rItem;
            } else {
                const rTime = rItem.updatedAt || 0;
                const lTime = lItem.updatedAt || 0;
                if (rTime > lTime) {
                    merged[k] = rItem;
                }
            }
        });
        return merged;
    }
}
