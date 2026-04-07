const cheerio = require('cheerio');
const vm = require('vm');

/**
 * 用 vm 安全执行 JS 数据文件，提取变量到 sandbox
 */
function evalJsData(jsContent, extraGlobals = {}) {
  const sandbox = { jh: {}, ...extraGlobals };
  vm.createContext(sandbox);
  try {
    vm.runInContext(jsContent, sandbox);
  } catch (e) {
    console.error('[parser] eval JS 数据失败:', e.message);
    return null;
  }
  return sandbox;
}

/**
 * 从 HTML 中提取 var jsonData = {...}
 */
function extractJsonData(html) {
  const patterns = [
    /var\s+jsonData\s*=\s*(\{[\s\S]*?\});?\s*(?:\n|CheckAdEnabled)/,
    /var\s+jsonData\s*=\s*(\{.+\})\s*;/,
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        continue;
      }
    }
  }
  console.error('[parser] 未能从 HTML 中提取 jsonData');
  return null;
}

/**
 * 从 HTML 提取嵌入的 JS 数组变量
 */
function extractJsArrayFromHtml(html, varName) {
  const regex = new RegExp(`var\\s+${varName}\\s*=\\s*(\\[.*?\\])\\s*;`, 's');
  const match = html.match(regex);
  if (!match) return null;
  try {
    return new Function(`return ${match[1]}`)();
  } catch (e) {
    console.error(`[parser] 提取变量 ${varName} 失败:`, e.message);
    return null;
  }
}

/**
 * 使用 cheerio 加载 HTML
 */
function loadHtml(html) {
  return cheerio.load(html);
}

module.exports = {
  evalJsData,
  extractJsonData,
  extractJsArrayFromHtml,
  loadHtml,
};
