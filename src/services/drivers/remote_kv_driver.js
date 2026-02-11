/**
 * @file remote_kv_driver.js
 * @description specialized wrapper around fetch for KV operations.
 */

export class NetworkError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'NetworkError';
        this.originalError = originalError;
    }
}

export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

export class ServerError extends Error {
    constructor(status, message) {
        super(`Server Error ${status}: ${message}`);
        this.name = 'ServerError';
        this.status = status;
    }
}

export class RemoteKVDriver {
    constructor(config) {
        this.config = config;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    _validateConfig() {
        if (!this.config.url || !this.config.token) {
            throw new Error('Sync not configured (Missing URL or Token)');
        }
    }

    async get(profileId = 'default') {
        this._validateConfig();
        const url = profileId === 'default'
            ? this.config.url
            : `${this.config.url}${this.config.url.includes('?') ? '&' : '?'}profile=${profileId}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.config.token}` }
            });

            if (response.status === 404) return null;
            if (response.status === 401 || response.status === 403) throw new AuthError('Invalid Token');
            if (!response.ok) throw new ServerError(response.status, response.statusText);

            const json = await response.json();
            return json.vocab || json;
        } catch (e) {
            if (e instanceof AuthError || e instanceof ServerError) throw e;
            throw new NetworkError('Failed to connect to cloud', e);
        }
    }

    async post(data, meta, profileId = 'default') {
        this._validateConfig();
        const url = profileId === 'default'
            ? this.config.url
            : `${this.config.url}${this.config.url.includes('?') ? '&' : '?'}profile=${profileId}`;

        const payload = {
            vocab: data,
            meta: { ...meta, profile: profileId, timestamp: Date.now() }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 403) throw new AuthError('Invalid Token');
            if (!response.ok) throw new ServerError(response.status, response.statusText);
            return true;
        } catch (e) {
            if (e instanceof AuthError || e instanceof ServerError) throw e;
            throw new NetworkError('Failed to push to cloud', e);
        }
    }
}
