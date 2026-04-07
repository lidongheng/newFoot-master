/**
 * 统一响应格式工具
 */

/**
 * 成功响应
 * @param {Object} ctx - Koa 上下文
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 */
function success(ctx, data = null, message = 'success') {
  ctx.body = {
    code: 200,
    message,
    data
  }
}

/**
 * 错误响应
 * @param {Object} ctx - Koa 上下文
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 */
function error(ctx, message = '操作失败', code = 400) {
  ctx.body = {
    code,
    message,
    data: null
  }
}

/**
 * 参数错误
 * @param {Object} ctx - Koa 上下文
 * @param {string} message - 错误消息
 */
function paramError(ctx, message = '参数错误') {
  error(ctx, message, 400)
}

/**
 * 服务器错误
 * @param {Object} ctx - Koa 上下文
 * @param {string} message - 错误消息
 */
function serverError(ctx, message = '服务器内部错误') {
  error(ctx, message, 500)
}

module.exports = {
  success,
  error,
  paramError,
  serverError
}
