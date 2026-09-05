const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const vue = require('vue');
const dayjs = require('dayjs');

async function verify(mobile) {
  const filename = mobile ? 'src/composables/mobile/useMobileMatch.js' : 'src/views/match/MatchList.vue';
  let source = fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8');
  if (!mobile) source = source.split('<script setup>')[1].split('</script>')[0];
  // 执行实际表单逻辑，只替换导入依赖和网络边界，以检查提交值没有本金转换。
  source = source.replace(/import[\s\S]*?from ['"][^'"]+['"];?/g, '').replace('export function', 'function');
  const calls = [];
  const context = {
    ...vue, dayjs, console, onMounted() {}, showToast() {},
    ElMessage: { success() {} },
    getAllLeagues: async () => [],
    getMatchList: async () => ({ list: [], total: 0 }),
    createMatch: async data => calls.push({ action: 'create', data: JSON.parse(JSON.stringify(data)) }),
    updateMatch: async (id, data) => calls.push({ action: 'update', id, data: JSON.parse(JSON.stringify(data)) }),
    useMobileConfirm: () => ({ confirm: async () => true }),
    useMobilePagedList: () => ({ list: vue.ref([]), reload: async () => {} }),
  };
  const exports = mobile ? 'useMobileMatch()' : '{ formData, formRef, openCreate: handleCreate, openEdit: handleEdit, submitForm: handleSubmit }';
  const form = vm.runInNewContext(`${source}\n;(${exports});`, context);
  form.formRef.value = { validate: async () => true };
  const water = () => [form.formData.odds.handicap.home.odds, form.formData.odds.handicap.away.odds, form.formData.odds.overUnder.over.odds, form.formData.odds.overUnder.under.odds];
  form.openCreate();
  assert.deepEqual(water(), [0.9, 0.9, 0.9, 0.9]);
  form.formData.odds.handicap.home.odds = 0.95;
  form.openCreate();
  assert.deepEqual(water(), [0.9, 0.9, 0.9, 0.9]);
  Object.assign(form.formData, { matchId: 'test', league: 'test', homeTeam: 'home', awayTeam: 'away', startTime: '2026-09-06T12:00' });
  await form.submitForm();
  assert.equal(calls[0].action, 'create');
  assert.equal(calls[0].data.odds.handicap.home.odds, 0.9);
  assert.equal(calls[0].data.odds.overUnder.under.odds, 0.9);
  assert.deepEqual(calls[0].data.odds.moneyline, { home: { label: '主', odds: 2 }, draw: { label: '和', odds: 3.2 }, away: { label: '客', odds: 3.5 } });
  const row = { ...calls[0].data, _id: 'existing' };
  row.odds.handicap.home.odds = 1.03;
  row.odds.overUnder.under.odds = 0.86;
  form.openEdit(row);
  assert.deepEqual(water(), [1.03, 0.9, 0.9, 0.86]);
  await form.submitForm();
  assert.equal(calls[1].action, 'update');
  assert.equal(calls[1].id, 'existing');
  assert.deepEqual(calls[1].data.odds, row.odds);
  console.log(`PASS: ${filename} 新增、重置、已有水位回显及创建/编辑提交值。`);
}
(async () => {
  await verify(false);
  await verify(true);
})().catch(error => { console.error(error); process.exitCode = 1; });
