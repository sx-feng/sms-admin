// src/api/admin.js
import { request } from '@/utils/request.js'

// ==================== 登录与账户 ====================

// 管理员登录
export const adminLogin = (data) => request(1, '/api/admin/login', data)

// 获取用户列表
export const listUsers = (params) => request(0, '/api/admin/listUsers', params, true)

// 创建新用户 / 代理账户
export const createUser = (data) => request(1, '/api/admin/createUser', data)

// 修改用户信息
export const updateUser = (data) => request(1, '/api/admin/updateUser', data)

// 删除 / 禁用用户
export const deleteUser = (targetUserId) => request(1, '/api/admin/deleteUser', { targetUserId }, true)

// ==================== 资金操作 ====================

// 为用户充值（系统资金）
export const rechargeUser = (targetUserId, amount) =>
  request(1, '/api/admin/rechargeUser', { targetUserId, amount }, true)

// 扣减用户余额
export const deductUser = (targetUserId, amount) =>
  request(1, '/api/admin/deductUser', { targetUserId, amount }, true)

// ==================== 账本与记录 ====================

// 查看指定用户账本明细
export const viewUserLedger = (params) => request(0, '/api/admin/viewUserLedger', params, true)

// 查看全局账本记录
export const viewAllLedger = (params) => request(0, '/api/admin/viewAllLedger', params, true)

// 查看某用户号码记录
export const viewUserNumbers = (params) => request(0, '/api/admin/viewUserNumbers', params, true)

// 查看全局号码记录
export const viewAllNumbers = (params) => request(0, '/api/admin/viewAllNumbers', params, true)

// ==================== 系统配置 ====================

// 获取系统配置
export const getSystemConfig = () => request(0, '/api/admin/getConfig')

// 更新系统配置
export const updateSystemConfig = (data) => request(1, '/api/admin/updateConfig', data)

// ==================== 异常日志 ====================

// 查询错误日志列表
export const listErrorLogs = (params) => request(0, '/api/admin/listErrorLogs', params, true)

// 获取特定错误日志详情
export const getErrorDetail = (errorId) => request(0, '/api/admin/getErrorDetail', { errorId }, true)

// ==================== 统计 ====================

// 获取系统统计数据
export const getStatistics = () => request(0, '/api/admin/statistics')

//获取每日取号，码统计
export const getDailyStats = (params) => request(0, '/api/admin/dailyStatsTrend',params, true)

// ==================== 公告 ====================
// 获取用户公告列表
// GET /api/admin/get/user/notice
export const getUserNotice = () => request(0, '/api/admin/get/user/notice')

// ==================== 项目管理 ====================
// 分页查询项目列表
export const getProjectLis = (params) => request(0, '/api/project/find/all', params, true)

// 新增项目
export const pageAdd = (params) => request(1, '/api/project/add', params )

// 编辑项目
export const pageUpdate = (params) => request(1, '/api/project/update', params)

// 删除项目
export const pageDelete = (id) => request(1, `/api/project/delete/by-id/${id}`)

//查询项目认证枚举信息
export const getProjectAuthEnums = () => request(0, '/api/admin/enum/auth-types')

//查询项目配置接口请求参数方式枚举信息
export const getProjectRequestMethodEnums = () => request(0, '/api/admin/enum/request-types')


//号码表
export const pageNumberList = (params) => request(0, '/api/admin/viewAllNumbers', params, true)

// 查看全局账本记录
//   GET /api/admin/viewAllLedger
//   接口ID：362860098
//   接口地址：https://app.apifox.com/link/project/7230479/apis/api-362860098
export const pageAllLedger = (params) => request(0, '/api/admin/viewAllLedger', params, true)

/**
 * 获取所有用户及其项目价格配置 (支持分页和筛选)
 * GET /api/admin/user-project-prices
 * 接口ID：366944405
 * 接口地址：https://app.apifox.com/link/project/7230479/apis/api-366944405
 * @param {object} params - 查询参数，例如 { pageNum, pageSize, userName, projectId, lineId }
 */
export const getUserProjectPrices = (params) => request(0, '/api/admin/user-project-prices', params ,true)


/**
 * 更新用户项目价格配置
 * 更新用户项目价格配置表
  POST /api/admin/userProjectLine/update/
  接口ID：367021337
  接口地址：https://app.apifox.com/link/project/7230479/apis/api-367021337
 */
export const updateUserProjectPrice = (data) => request(1, '/api/admin/userProjectLine/update/', data)


/**
 * 根据用户ID分页查询账本记录
 * @param {object} params - 查询参数，包含 { pageNum, pageSize, userId }
 */
export const getUserLedgerRecords = (params) => request(0, '/api/admin/get/user-id/leader/', params, true);


/**
 * 数据报表 (支持分页和筛选)
 * POST /api/admin/get/data
 * 接口ID：370041384
 * 接口地址：https://app.apifox.com/link/project/7230479/apis/api-370041384
 * @param {object} params - 查询参数，对应后端的 StatisticsQueryDTO
 */
export const getDataReport = (params) => request(1, '/api/admin/get/data', params);

/**
 * addUserProjectPrices
 * 为指定用户新增项目价格配置
  POST /api/admin/user-project-prices/add
  接口ID：370055505
  接口地址：https://app.apifox.com/link/project/7230479/apis/api-370055505
 */
export const addUserProjectPrices = (data) => request(1, '/api/admin/user-project-prices/add', data);


/**
 * 获取所有价格模板
 * GET /price-templates
 * @returns {Promise}
 */
export const getAllPriceTemplates = () => request(0, '/api/admin/price-templates');

/**
 * 创建价格模板
 * POST /price-templates
 * @param {object} data - 对应 PriceTemplateCreateDTO
 * @returns {Promise}
 */
export const createPriceTemplate = (data) => request(1, '/api/admin/price-templates', data);

/**
 * 更新价格模板
 * POST /price-templates/{templateId}
 * @param {number|string} templateId - 模板ID
 * @param {object} data - 对应 PriceTemplateCreateDTO
 * @returns {Promise}
 */
export const updatePriceTemplate = (templateId, data) => request(1, `/api/admin/price-templates/${templateId}`, data);

/**
 * 删除价格模板
 * GET /price-templates/{templateId}
 * 注意：后端接口使用了 GET 请求进行删除，这不符合 RESTful 规范，但我们遵循接口定义。
 * @param {number|string} templateId - 模板ID
 * @returns {Promise}
 */
export const deletePriceTemplate = (templateId) => request(0, `/api/admin/price-templates/${templateId}`);