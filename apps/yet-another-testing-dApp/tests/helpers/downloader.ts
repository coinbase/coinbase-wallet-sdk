import * as fs from "fs";
import { IncomingMessage } from "http";
import { get } from "https";
import StreamZip from "node-stream-zip";
import * as os from "os";
import * as path from "path";

import { OfficialOptions } from "./types";

export const EXTENSION_ID = "gadekpdjmpjjnnemgnhkbjgnjpdaakgh";
export const EXTENSION_PUB_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnpiOcYGaEp02v5On5luCk/4g9j+ujgWeGlpZVibaSz6kUlyiZvcVNIIUXR568uv5NrEi5+j9+HbzshLALhCn9S43E7Ha6Xkdxs3kOEPBu8FRNwFh2S7ivVr6ixnl2FCGwfkP1S1r7k665eC1/xYdJKGCc8UByfSw24Rtl5odUqZX1SaE6CsQEMymCFcWhpE3fV+LZ6RWWJ63Zm1ac5KmKzXdj7wZzN3onI0Csc8riBZ0AujkThJmCR8tZt2PkVUDX9exa0XkJb79pe0Ken5Bt2jylJhmQB7R3N1pVNhNQt17Sytnwz6zG2YsB2XNd/1VYJe52cPNJc7zvhQJpHjh5QIDAQAB";

export type Path =
  | string
  | {
      download: string;
      extract: string;
    };

export const isNewerVersion = (current: string, comparingWith: string): boolean => {
  if (current === comparingWith) return false;

  const currentFragments = current.replace(/[^\d.-]/g, "").split(".");
  const comparingWithFragments = comparingWith.replace(/[^\d.-]/g, "").split(".");

  const length =
    currentFragments.length > comparingWithFragments.length
      ? currentFragments.length
      : comparingWithFragments.length;
  for (let i = 0; i < length; i++) {
    if ((Number(currentFragments[i]) || 0) === (Number(comparingWithFragments[i]) || 0)) continue;
    return (Number(comparingWithFragments[i]) || 0) > (Number(currentFragments[i]) || 0);
  }
  return true;
};

const isEmpty = (path: fs.PathLike): boolean => {
  const items = fs.readdirSync(path, { withFileTypes: true });
  const files = items.filter((item) => item.isFile() && !item.name.startsWith("."));
  return files.length === 0;
};

export const downloader =
  (releasesUrl: string, recommendedVersion: string) =>
  async (options: OfficialOptions): Promise<string> => {
    let EXTENSION_PATH = "";

    const { version } = options;

    if (version) {
      console.log("");
      if (version === "latest")
        console.warn(
          "\x1b[33m%s\x1b[0m",
          `It is not recommended to run coinbase with "latest" version. Use it at your own risk or set to the recommended version "${recommendedVersion}".`,
        );
      else if (isNewerVersion(recommendedVersion, version))
        console.warn(
          "\x1b[33m%s\x1b[0m",
          `Seems you are running a newer version (${version}) of coinbase than recommended.
    Use it at your own risk or set to the recommended version "${recommendedVersion}".`,
        );
      else if (isNewerVersion(version, recommendedVersion))
        console.warn(
          "\x1b[33m%s\x1b[0m",
          `Seems you are running an older version (${version}) of coinbase than recommended.
    Use it at your own risk or set the recommended version "${recommendedVersion}".`,
        );
      else console.log(`Running tests on coinbase version ${version}`);

      console.log(""); // new line

      EXTENSION_PATH = await download(
        version,
        releasesUrl,
        path.resolve(os.tmpdir(), "dappwright", "coinbase"),
      );
    } else {
      console.log(`Running tests on local coinbase build`);
    }

    return EXTENSION_PATH;
  };

const download = async (
  version: string,
  releasesUrl: string,
  location: string,
): Promise<string> => {
  const extractDestination = path.resolve(location, version.replace(/\./g, "_"));

  if (version !== "latest") {
    if (fs.existsSync(extractDestination) && !isEmpty(extractDestination))
      return extractDestination;
  }

  // eslint-disable-next-line no-console
  console.log("Downloading extension...");

  const { filename, downloadUrl } = await getGithubRelease(releasesUrl, `v${version}`);

  // Clean if system tmp files are cleaned but dir structure can persist
  if (fs.existsSync(extractDestination) && isEmpty(extractDestination)) {
    fs.rmdirSync(extractDestination, { recursive: true });
  }

  if (!fs.existsSync(extractDestination) || isEmpty(extractDestination)) {
    const downloadedFile = await downloadGithubRelease(filename, downloadUrl, location);
    const zip = new StreamZip.async({ file: downloadedFile });
    fs.mkdirSync(extractDestination);
    await zip.extract(null, extractDestination);

    // Set the chrome extension to value of EXTENSION_ID
    const manifestPath = path.resolve(extractDestination, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    manifest.key = EXTENSION_PUB_KEY;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  }
  return extractDestination;
};

const request = (url: string): Promise<IncomingMessage> =>
  new Promise((resolve) => {
    const request = get(url, (response) => {
      if (response.statusCode == 302) {
        // @ts-ignore
        const redirectRequest = get(response.headers.location, resolve);
        redirectRequest.on("error", (error) => {
          console.warn("request redirected error:", error.message);
          throw error;
        });
      } else {
        resolve(response);
      }
    });
    request.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.warn("request error:", error.message);
      throw error;
    });
  });

const downloadGithubRelease = (name: string, url: string, location: string): Promise<string> =>
  // eslint-disable-next-line no-async-promise-executor
  new Promise(async (resolve) => {
    if (!fs.existsSync(location)) {
      fs.mkdirSync(location, { recursive: true });
    }
    const fileLocation = path.join(location, name);
    const file = fs.createWriteStream(fileLocation);
    const stream = await request(url);
    stream.pipe(file);
    stream.on("end", () => {
      resolve(fileLocation);
    });
  });

type GithubRelease = { downloadUrl: string; filename: string; tag: string };
const getGithubRelease = (releasesUrl: string, version: string): Promise<GithubRelease> =>
  new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": "Mozilla/5.0" } };
    if (process.env.GITHUB_TOKEN) {
      // @ts-ignore
      options.headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const request = get(releasesUrl, options, (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        const data = JSON.parse(body);
        if (data.message)
          return reject(
            `There was a problem connecting to github API to get the extension release (URL: ${releasesUrl}). Error: ${data.message}`,
          );
        for (const result of data) {
          if (result.draft) continue;
          if (
            version === "latest" ||
            result.name.includes(version) ||
            result.tag_name.includes(version)
          ) {
            for (const asset of result.assets) {
              if (asset.name.includes("chrome"))
                resolve({
                  downloadUrl: asset.browser_download_url,
                  filename: asset.name,
                  tag: result.tag_name,
                });
            }
          }
        }
        reject(`Version ${version} not found!`);
      });
    });
    request.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.warn("getGithubRelease error:", error.message);
      throw error;
    });
  });
