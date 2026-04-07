const axios = require('axios');

const service = axios.create({
  timeout: 15000,
  retry: 4,
  retryDelay: 1500,
});

service.interceptors.request.use(
  (config) => {
    config.headers['Accept'] = '*/*';
    config.headers['Accept-Encoding'] = 'gzip, deflate';
    config.headers['Accept-Language'] = 'zh-CN,zh;q=0.9';
    config.headers['Connection'] = 'keep-alive';
    config.headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    config.headers['Cookie'] = `Hm_lvt_5ee25051f2fb71cfbf0bfa5bbd459b6f=${Math.floor(Date.now() / 1000) - 9}; Hm_lpvt_5ee25051f2fb71cfbf0bfa5bbd459b6f=${Math.floor(Date.now() / 1000)}`;
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

module.exports = { service };
