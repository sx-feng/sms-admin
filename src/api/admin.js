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

// ==================== 公告 ====================
// 获取用户公告列表
// GET /api/admin/get/user/notice
export const getUserNotice = () => request(0, '/api/admin/get/user/notice')
