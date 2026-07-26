const fs = require('fs');
const path = require('path');

const methodologyRoot = path.resolve(__dirname, '../../methodology');

function validateMethodRegistry() {
  const registryPath = path.join(methodologyRoot, 'registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const errors = [];

  for (const method of registry.methods) {
    if (!method.enabled) continue;
    const methodRoot = path.join(methodologyRoot, 'methods', method.id);
    const required = [
      'contract.json',
      'index.js',
      'index.test.js',
      'backtests',
    ];
    for (const item of required) {
      if (!fs.existsSync(path.join(methodRoot, item))) {
        errors.push(`${method.id} 已启用但缺少 ${item}`);
      }
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = validateMethodRegistry();
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log('理论方法注册表校验通过');
  }
}

module.exports = { validateMethodRegistry };
