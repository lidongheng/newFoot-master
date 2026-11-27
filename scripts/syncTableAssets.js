const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// 下载官方 npm 包中的浏览器成品，不执行依赖安装，也不使用 CDN。
const vendors = [
  {
    name: 'vue', version: '3.5.46',
    integrity: 'sha512-0kW5CgfjMPBqmH158049SaE1muufp+K/ZyrwvSEwrwYky6QB7zL2y8kXfruneKb9O12eh0xAJL6CVSpzb9o0Kg==',
    files: { 'package/dist/vue.global.prod.js': 'vue.global.prod.js', 'package/LICENSE': 'LICENSE' },
  },
  {
    name: 'element-plus', version: '2.14.8',
    integrity: 'sha512-Z4Br45W9b8vWKvVHSTvbS6rRKmsLjmHCPXICJR6osl35+i+S2LCBs4NN8apLBkQiUh0pzS9labK5eCS7yzDhWw==',
    files: { 'package/dist/index.full.min.js': 'index.full.min.js', 'package/dist/index.css': 'index.css', 'package/dist/locale/zh-cn.min.js': 'zh-cn.min.js', 'package/LICENSE': 'LICENSE' },
  },
];

function unpackSelected(archive, wanted) {
  const tar = zlib.gunzipSync(archive);
  const output = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    let filename = name;
    if (prefix) filename = `${prefix}/${name}`;
    const size = Number.parseInt(header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim(), 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('下载包 TAR 长度无效。');
    if (Object.hasOwn(wanted, filename)) output.set(wanted[filename], tar.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  for (const filename of Object.values(wanted)) {
    if (!output.has(filename)) throw new Error(`官方包中未找到 ${filename}。`);
  }
  return output;
}

async function main() {
  const downloads = [];
  for (const vendor of vendors) {
    const url = `https://registry.npmjs.org/${vendor.name}/-/${vendor.name}-${vendor.version}.tgz`;
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${vendor.name} 下载失败：HTTP ${response.status}`);
    const archive = Buffer.from(await response.arrayBuffer());
    const integrity = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
    if (integrity !== vendor.integrity) throw new Error(`${vendor.name} 官方包完整性校验失败。`);
    downloads.push({ vendor, url, files: unpackSelected(archive, vendor.files) });
  }
  const root = path.resolve(__dirname, '../shared-assets');
  for (const { vendor, url, files } of downloads) {
    const directory = path.join(root, vendor.name);
    fs.mkdirSync(directory, { recursive: true });
    for (const [filename, content] of files) fs.writeFileSync(path.join(directory, filename), content);
    fs.writeFileSync(path.join(directory, 'version.json'), `${JSON.stringify({ name: vendor.name, version: vendor.version, source: url, integrity: vendor.integrity }, null, 2)}\n`);
    console.log(`${vendor.name} ${vendor.version} 已保存到 ${directory}`);
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { unpackSelected };
