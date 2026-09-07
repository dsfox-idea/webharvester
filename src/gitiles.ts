/** Reads files from a Gitiles-hosted repository (chromium.googlesource.com). */
export class GitilesRepository {
  static readonly chromium = 'https://chromium.googlesource.com/chromium/src';

  private readonly baseUrl: string;

  constructor(baseUrl: string = GitilesRepository.chromium) {
    this.baseUrl = baseUrl;
  }

  get url(): string {
    return this.baseUrl;
  }

  async headRevision(branch = 'main'): Promise<string> {
    const text = await this.fetchText(`${this.baseUrl}/+/refs/heads/${branch}?format=JSON`);
    const json = JSON.parse(text.replace(/^\)\]\}'\n?/, '')) as { commit: string };
    return json.commit;
  }

  /** `revision` is a commit hash, `refs/heads/<branch>` or `refs/tags/<version>`. */
  async file(path: string, revision: string): Promise<string> {
    const base64 = await this.fetchText(`${this.baseUrl}/+/${revision}/${path}?format=TEXT`);
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  private async fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    return response.text();
  }
}
