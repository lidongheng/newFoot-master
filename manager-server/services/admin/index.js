/**
 * 后台管理服务统一导出
 */
const matchAdminService = require('./matchAdminService')
const leagueAdminService = require('./leagueAdminService')
const betOrderAdminService = require('./betOrderAdminService')
const accountAdminService = require('./accountAdminService')

module.exports = {
  matchAdminService,
  leagueAdminService,
  betOrderAdminService,
  accountAdminService
}
