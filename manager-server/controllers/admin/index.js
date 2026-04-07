/**
 * 后台管理控制器统一导出
 */
const matchAdminController = require('./matchAdminController')
const leagueAdminController = require('./leagueAdminController')
const betOrderAdminController = require('./betOrderAdminController')
const accountAdminController = require('./accountAdminController')

module.exports = {
  matchAdminController,
  leagueAdminController,
  betOrderAdminController,
  accountAdminController
}
