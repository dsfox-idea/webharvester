import { createHash } from 'node:crypto';

/**
 * Chromium derives an extension id from the SHA-256 of the DER-encoded public
 * key: the first 128 bits, hex-encoded, with each hex digit mapped to a-p
 * (crx_file::id_util::GenerateId). A manifest `key` therefore fixes the id
 * regardless of where the unpacked extension lives on disk.
 */
export class ExtensionIdentity {
  static fromPublicKey(base64Der: string): string {
    const digest = createHash('sha256').update(Buffer.from(base64Der, 'base64')).digest('hex');
    return [...digest.slice(0, 32)]
      .map((hex) => String.fromCharCode('a'.charCodeAt(0) + parseInt(hex, 16)))
      .join('');
  }

  static fromManifest(manifest: { key?: string }): string {
    if (!manifest.key) throw new Error('Manifest has no "key"; the extension id is not fixed');
    return ExtensionIdentity.fromPublicKey(manifest.key);
  }
}
