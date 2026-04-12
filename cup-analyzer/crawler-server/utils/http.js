const axios = require('axios');

const ZQ_HOST = 'zq.titan007.com';

const service = axios.create({
  timeout: 15000,
  retry: 4,
  retryDelay: 1500,
});

service.interceptors.request.use(
  (config) => {
    const h = config.headers;
    const accept = h.Accept ?? h.accept;
    if (accept === undefined || accept === '') {
      h.Accept = '*/*';
    }
    h['Accept-Encoding'] = 'gzip, deflate';
    h['Accept-Language'] = 'zh-CN,zh;q=0.9';
    h.Connection = 'keep-alive';
    h['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    h.Cookie = `Hm_lvt_5ee25051f2fb71cfbf0bfa5bbd459b6f=${Math.floor(Date.now() / 1000) - 9}; Hm_lpvt_5ee25051f2fb71cfbf0bfa5bbd459b6f=${Math.floor(Date.now() / 1000)}`;
    return config;
  },
  (err) => Promise.reject(err)
);

service.interceptors.response.use(
  (res) => {
    if (res.status === 200) return res;
    return Promise.reject(new Error(`HTTP ${res.status}`));
  },
  (err) => {
    const config = err.config;
    if (!config || !config.retry) return Promise.reject(err);

    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= config.retry) return Promise.reject(err);

    config.__retryCount += 1;
    console.log(`  [重试] 第${config.__retryCount}次重试: ${config.url}`);

    return new Promise((resolve) => {
      setTimeout(resolve, config.retryDelay || 1500);
    }).then(() => service(config));
  }
);

function isZqHost(url) {
  try {
    return new URL(url).hostname === ZQ_HOST;
  } catch {
    return false;
  }
}

/**
 * Referer 与请求 URL 使用同一协议（HTTPS 优先抓取时避免 http/https 不一致）。
 */
function alignZqRefererToRequestUrl(headers, requestUrl) {
  const out = { ...headers };
  const key = Object.keys(out).find((k) => k.toLowerCase() === 'referer');
  if (!key) return out;
  try {
    const req = new URL(requestUrl);
    const r = new URL(out[key]);
    if (r.hostname === ZQ_HOST) {
      r.protocol = req.protocol;
      out[key] = r.toString();
    }
  } catch (_) {
    /* keep */
  }
  return out;
}

function secFetchSiteFromReferer(refererForSite) {
  if (!refererForSite) return 'none';
  try {
    const ru = new URL(refererForSite);
    return ru.hostname === ZQ_HOST ? 'same-origin' : 'cross-site';
  } catch {
    return 'same-origin';
  }
}

/** HTML 页面导航（阵容页、联赛页等） */
function zqDocumentHeaders(refererForSite) {
  const secFetchSite = secFetchSiteFromReferer(refererForSite);
  return {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': secFetchSite,
    'Sec-Fetch-User': '?1',
    'Sec-CH-UA': '"Chromium";v="120", "Not-A.Brand";v="24", "Google Chrome";v="120"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
  };
}

/**
 * jsData 下的 *.js（浏览器作为 script 子资源加载）：与 DevTools 中 playerInfo 请求一致。
 * 不传 If-Modified-Since / If-None-Match，避免 304 空 body。
 */
function zqJsDataScriptHeaders(refererForSite) {
  const secFetchSite = secFetchSiteFromReferer(refererForSite);
  return {
    Accept: '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Sec-Fetch-Dest': 'script',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': secFetchSite,
    'Sec-CH-UA': '"Chromium";v="120", "Not-A.Brand";v="24", "Google Chrome";v="120"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
  };
}

function zqHeadersForRequestUrl(requestUrl, refererForSite) {
  try {
    const { pathname } = new URL(requestUrl);
    if (pathname.includes('/jsData/')) {
      return zqJsDataScriptHeaders(refererForSite);
    }
  } catch {
    /* fall through */
  }
  return zqDocumentHeaders(refererForSite);
}

function mergeZqRequestHeaders(rawHeaders, finalUrl) {
  const h = alignZqRefererToRequestUrl(rawHeaders, finalUrl);
  const refStr = h.Referer ?? h.referer ?? '';
  return {
    ...zqHeadersForRequestUrl(finalUrl, refStr),
    ...h,
  };
}

/**
 * 仅针对 zq.titan007.com：优先 HTTPS，失败再回退 HTTP。
 * `/jsData/` 下静态 JS 使用 script 子资源头（Sec-Fetch-Dest: script 等）；其余页面用 document 导航头。不传 IMS/ETag。
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig} [options]
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function fetchZqBuffer(url, options = {}) {
  const { headers: rawHeaders = {}, ...rest } = options;
  if (!isZqHost(url)) {
    return service({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      headers: rawHeaders,
      ...rest,
    });
  }

  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  const httpUrl = url.replace(/^https:\/\//i, 'http://');

  const run = (finalUrl) =>
    service({
      method: 'GET',
      url: finalUrl,
      responseType: rest.responseType || 'arraybuffer',
      headers: mergeZqRequestHeaders(rawHeaders, finalUrl),
      ...rest,
    });

  try {
    return await run(httpsUrl);
  } catch (e) {
    console.log(`  [zq] HTTPS 不可达，回退 HTTP: ${httpsUrl}`);
    return run(httpUrl);
  }
}

module.exports = { service, fetchZqBuffer };
