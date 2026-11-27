const fs = require('fs');
const path = require('path');

// 第三方图表库由 workspace 根包统一管理，所有子项目共用同一份浏览器静态资源。
const root = path.resolve(__dirname, '..');
const expected = require(path.join(root, 'package.json')).devDependencies.echarts;
const source = path.dirname(require.resolve('echarts/package.json', { paths: [root] }));
const version = require(path.join(source, 'package.json')).version;
if (version !== expected) throw new Error(`ECharts 版本 ${version} 与根包固定版本 ${expected} 不一致。`);
const destination = path.join(root, 'shared-assets', 'echarts');
fs.mkdirSync(destination, { recursive: true });
for (const [input, output] of [['dist/echarts.min.js', 'echarts.min.js'], ['LICENSE', 'LICENSE'], ['NOTICE', 'NOTICE']]) {
  fs.copyFileSync(path.join(source, input), path.join(destination, output));
}
fs.cpSync(path.join(source, 'licenses'), path.join(destination, 'licenses'), { recursive: true });
fs.writeFileSync(path.join(destination, 'version.json'), `${JSON.stringify({ name: 'echarts', version, source: 'npm:echarts/dist/echarts.min.js' }, null, 2)}\n`);
console.log(`共享 ECharts ${version} 已同步：${destination}`);
