const iconv = require('iconv-lite');
const { service } = require('../utils/http');
const { evalJsData, extractJsonData, loadHtml } = require('../utils/parser');
const { ensureDir, saveJSON, saveMarkdown, sleep } = require('../utils/fileWriter');
const config = require('../config');
const targets = require('../config/targets');

class BaseCrawler {
  constructor(name = 'BaseCrawler') {
    this.name = name;
    this.delayMs = config.crawlDelayMs;
  }

  /**
   * GET 请求，返回文本（自动处理编码）
   */
  async fetchText(url, headers = {}) {
    const res = await service({
      method: 'GET',
      url,
      headers: { ...targets.titan007.headers.desktop, ...headers },
      responseType: 'arraybuffer',
    });
    return iconv.decode(res.data, 'utf-8');
  }

  /**
   * GET 请求，返回 JS 数据文件解析结果
   */
  async fetchJsData(url, headers = {}, extraGlobals = {}) {
    const text = await this.fetchText(url, headers);
    return evalJsData(text, extraGlobals);
  }

  /**
   * GET 请求，返回 JSON
   */
  async fetchJson(url, headers = {}) {
    const res = await service({
      method: 'GET',
      url,
      headers: { ...targets.titan007.headers.desktop, ...headers },
    });
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }

  /**
   * GET 请求，返回 HTML 中的 jsonData
   */
  async fetchHtmlJsonData(url, headers = {}) {
    const html = await this.fetchText(url, headers);
    return { html, jsonData: extractJsonData(html) };
  }

  /**
   * 解析 c75.js 赛程数据，提取球队映射和比赛数据
   */
  parseScheduleData() {
    const { readFile } = require('../utils/fileWriter');
    const schedulePath =
      config.paths.cupScheduleData || config.paths.c75Data;
    const content = readFile(schedulePath);
    if (!content) {
      console.error(`[${this.name}] 赛程数据文件不存在: ${schedulePath}`);
      return null;
    }
    const sandbox = evalJsData(content);
    if (!sandbox) return null;

    return {
      arrCup: sandbox.arrCup,
      arrTeam: sandbox.arrTeam,
      arrCupKind: sandbox.arrCupKind,
      rounds: sandbox.jh,
      lastUpdateTime: sandbox.lastUpdateTime,
    };
  }

  /**
   * 从 arrTeam 构建球队 ID → 信息映射
   */
  buildTeamMap(arrTeam) {
    const map = {};
    if (!arrTeam) return map;
    arrTeam.forEach((team) => {
      map[team[0]] = {
        id: team[0],
        chineseName: team[1],
        traditionalName: team[2],
        englishName: team[3],
        image: team[5] || '',
      };
    });
    return map;
  }

  /**
   * 从 arrCupKind 和 jh 数据中提取小组分组信息
   */
  buildGroupMap(scheduleData) {
    const groups = {};
    const groupLetters = 'ABCDEFGHIJKL';
    const teamMap = this.buildTeamMap(scheduleData.arrTeam);

    for (const letter of groupLetters) {
      const standingKey = `S27970${letter}`;
      const standings = scheduleData.rounds[standingKey];
      if (!standings) continue;

      groups[letter] = {
        teams: standings.map((row) => ({
          rank: row[0],
          teamId: row[1],
          ...teamMap[row[1]],
        })),
        matchKey: `G27970${letter}`,
        standingKey,
      };
    }
    return groups;
  }

  async delay() {
    await sleep(this.delayMs);
  }

  log(message) {
    console.log(`[${this.name}] ${message}`);
  }

  error(message) {
    console.error(`[${this.name}] ${message}`);
  }
}

module.exports = BaseCrawler;
