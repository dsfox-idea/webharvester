# identity

**Permission string:** `identity`
**API namespace:** `chrome.identity`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.identity` API to get OAuth2 access tokens.

**Functions**
- `identity.getAccounts()` — Retrieves a list of AccountInfo objects describing the accounts present on the profile. `getAccounts` is only supported on dev channel.
- `identity.getAuthToken()` — Gets an OAuth2 access token using the client ID and scopes specified in the `oauth2` section of manifest.json.
- `identity.getProfileUserInfo()` — Retrieves email address and obfuscated gaia id of the user signed into a profile.
- `identity.removeCachedAuthToken()` — Removes an OAuth2 access token from the Identity API's token cache.
- `identity.clearAllCachedAuthTokens()` — Resets the state of the Identity API: Removes all OAuth2 access tokens from the token cache Removes user's account preferences De-authorizes the user from all auth flows |Returns| : Returns a Promise which resolves when the state has been cleared.
- `identity.launchWebAuthFlow()` — Starts an auth flow at the specified URL.

**Events**
- `identity.onSignInChanged` — Fired when signin state changes for an account on the user's profile.

## What it's for (broad)

Run OAuth2 and get Google or web auth tokens through a managed flow, plus the user's account info. Broadly: sign the extension into Google or third-party APIs, back a synced account, and authorize server calls without hand-rolling the redirect dance.
