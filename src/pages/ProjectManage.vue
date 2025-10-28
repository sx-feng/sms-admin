<template>
  <div class="page-container">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
    <el-button type="primary"  @click="$router.push('/dashboard')" >返回首页</el-button>
  </div>
    <!-- 页面标题 -->
    <h2>项目配置页</h2>

    <!-- 操作区域 -->
    <div class="action-bar">
      <el-button type="primary" @click="openDialog()">新增项目</el-button>
      <!-- <el-input
        v-model="keyword"
        placeholder="搜索项目名称 / ID / 域名"
        clearable
        style="width: 250px; margin-left: 10px"
        @input="fetchList"
      /> -->
    </div>

    <!-- 表格展示 (已更新) -->
    <el-table
      :data="tableData"
      border
      style="width: 100%; margin-top: 15px"
    >
      <el-table-column
        v-for="column in tableColumns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :width="column.width"
        show-overflow-tooltip
      >
        <!-- 使用插槽处理特殊列的展示 -->
        <template v-if="column.slot" #default="{ row }">
          <!-- 状态列 -->
          <div v-if="column.slot === 'status'">
            <el-tag type="success" v-if="row.status">启用</el-tag>
            <el-tag type="info" v-else>禁用</el-tag>
          </div>
          <!-- 操作列 -->
          <div v-if="column.slot === 'actions'">
            <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteProject(row.id)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <PaginationBar
      :total="total"
      v-model:currentPage="page"
      :page-size="pageSize"
      @change="fetchList"
    />

    <!-- 弹窗：新增/编辑项目 (已更新为两栏布局) -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑项目' : '新增项目'"
      width="1000px" 
      destroy-on-close
    >
      <el-form :model="form" label-width="160px">
        <!-- 遍历表单配置项来生成表单 -->
        <template v-for="group in formConfig" :key="group.title">
          <el-divider>{{ group.title }}</el-divider>
          <!-- 使用 el-row 和 el-col 实现两栏布局 -->
          <el-row :gutter="20">
            <el-col
              :span="12"
              v-for="field in group.fields"
              :key="field.modelKey"
            >
              <el-form-item :label="field.label">
                <component
                  :is="field.component"
                  v-model="form[field.modelKey]"
                  v-bind="field.props"
                  style="width: 100%"
                >
                  <template v-if="field.component === 'el-select' && field.options">
                    <el-option
                      v-for="option in field.options"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </template>
                </component>
              </el-form-item>
            </el-col>
          </el-row>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import PaginationBar from '@/components/PaginationBar.vue'
import { getProjectLis, pageAdd, pageUpdate, pageDelete } from '@/api/admin'
// 引入新的API方法
import { getProjectAuthEnums, getProjectRequestMethodEnums } from '@/api/admin'

// ===================================
// 表格配置 (已更新)
// ===================================

const tokenExpirationUnitOptions = ref([
  { label: '秒 (SECONDS)', value: 'SECONDS' },
  { label: '分钟 (MINUTES)', value: 'MINUTES' },
  { label: '小时 (HOURS)', value: 'HOURS' },
  { label: '毫秒 (MILLISECONDS)', value: 'MILLISECONDS' }
])
const tableData = ref([])
const tableColumns = ref([
  { prop: 'id', label: 'ID', width: '80' },
  { prop: 'projectId', label: '项目标识', width: '120' },
  { prop: 'projectName', label: '项目名称', width: '150' },
  { prop: 'lineId', label: '线路ID', width: '100' },
  { prop: 'domain', label: '域名' },
  { prop: 'costPrice', label: '成本价', width: '90' },
  { prop: 'priceMin', label: '最低价', width: '90' },
  { prop: 'priceMax', label: '最高价', width: '90' },
  { prop: 'codeTimeout', label: '超时(s)', width: '90' },
  { prop: 'status', label: '状态', width: '80', slot: 'status' },
  { label: '操作', width: '150', slot: 'actions', fixed: 'right' }
])

// ===================================
// 分页与搜索
// ===================================
const total = ref(0)
const page = ref(1)
const pageSize = 10
const keyword = ref('')

// ===================================
// 弹窗与表单
// ===================================
const dialogVisible = ref(false)

const getDefaultForm = () => ({
  id: null,

  // --- 基础信息 ---
  projectId: '',
  projectName: '',
  lineId: '',
  domain: '',

  // --- 核心API路由和方法配置 ---
  loginRoute: '',
  loginMethod: 'POST',
  getNumberRoute: '',
  getNumberMethod: 'GET',
  getCodeRoute: '',
  getCodeField: '',
  getCodeMethod: 'GET',
  refreshTokenRoute: '', // (新增)
  selectNumberApiRoute: '', // (新增)
  selectNumberApiRouteMethod: 'GET', // (新增)

  // --- 核心API请求类型配置 ---
  loginRequestType: 'JSON',
  getNumberRequestType: 'PARAM',
  getCodeRequestType: 'PARAM',
  selectNumberApiRequestType: 'PARAM', // (新增, 修正了Java类中的拼写错误)

  // --- 认证方式与凭证 ---
  authType: 'NO_AUTH',
  authUsernameField: 'username',
  authUsername: '',
  authPasswordField: 'password',
  authPassword: '',
  authTokenField: 'token',
  authTokenPrefix: 'Bearer ',
  authTokenValue: '',
  tokenExpirationTime: null,
  selectNumberApiRequestValue: '', // (新增)

  // --- API响应解析配置 ---
  responseTokenField: '',
  responseTokenExpirationField: '',
  responseTokenExpirationUnit: 'SECONDS',
  responsePhoneField: 'data.mobile',
  responseIdField: 'data.sessionId',
  responsePhoneIdField: '',
  responseStatusField: 'status',
  responseCodeField: 'data.smsCode',
  codeRetrievalIdentifierKey: 'phone',
  responseSelectNumberApiField: '', // (新增)

  // --- 业务逻辑与定价配置 ---
  codeTimeout: 60,
  codeMaxAttempts: 10,
  costPrice: 0.00,
  priceMax: 0.00,
  priceMin: 0.00,
  status: true,

  // --- 号码筛选配置 ---
  enableFilter: false,
  filterId: ''
})
const form = ref(getDefaultForm())

// ===================================
// 动态枚举数据
// ===================================
const authTypeOptions = ref([])
const requestTypeOptions = ref([])
const httpMethodOptions = ref([
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' }
])
const identifierKeyOptions = ref([
  { label: '使用手机号(phone)', value: 'phone' },
  { label: '使用会话ID(id)', value: 'id' }
])

// ===================================
// 表单配置 (动态生成UI的核心) (已更新)
// ===================================
const formConfig = computed(() => [
  {
    title: '基础信息',
    fields: [
      { modelKey: 'projectName', label: '项目名称', component: 'el-input', props: { placeholder: '例如：XX平台' } },
      { modelKey: 'projectId', label: '项目唯一标识', component: 'el-input', props: { placeholder: '例如：id0001' } },
      { modelKey: 'lineId', label: '线路ID', component: 'el-input', props: { placeholder: '同一项目下不同API线路' } },
      { modelKey: 'domain', label: '服务域名', component: 'el-input', props: { placeholder: 'https://api.example.com' } }
    ]
  },
  {
    title: '核心API路由与方法',
    fields: [
      { modelKey: 'loginRoute', label: '登录接口路径', component: 'el-input', props: { placeholder: '/api/login (可选)' } },
      { modelKey: 'loginMethod', label: '登录请求方法', component: 'el-select', options: httpMethodOptions.value },
      { modelKey: 'getNumberRoute', label: '获取手机号路径', component: 'el-input', props: { placeholder: '/api/getNumber' } },
      { modelKey: 'getNumberMethod', label: '取号请求方法', component: 'el-select', options: httpMethodOptions.value },
      { modelKey: 'getCodeRoute', label: '获取验证码路径', component: 'el-input', props: { placeholder: '/api/getCode' } },
      { modelKey: 'getCodeMethod', label: '取码请求方法', component: 'el-select', options: httpMethodOptions.value },
      // (新增)
      { modelKey: 'refreshTokenRoute', label: '刷新Token路径', component: 'el-input', props: { placeholder: '/api/refresh_token (预留)' } }
    ]
  },
  {
    title: '核心API请求参数配置',
    fields: [
      { modelKey: 'loginRequestType', label: '登录请求类型', component: 'el-select', options: requestTypeOptions.value },
      { modelKey: 'getNumberRequestType', label: '取号请求类型', component: 'el-select', options: requestTypeOptions.value },
      { modelKey: 'getCodeRequestType', label: '取码请求类型', component: 'el-select', options: requestTypeOptions.value },
      { modelKey: 'getCodeField', label: '取码请求参数字段名', component: 'el-input', props: { placeholder: '例如：phone 或 sessionId' } },
      { modelKey: 'codeRetrievalIdentifierKey', label: '取码使用何种标识', component: 'el-select', options: identifierKeyOptions.value }
    ]
  },
  {
    title: '认证配置',
    fields: [
      { modelKey: 'authType', label: '认证类型', component: 'el-select', options: authTypeOptions.value },
      { modelKey: 'authUsernameField', label: '用户名字段名', component: 'el-input', props: { placeholder: 'username, account ...' } },
      { modelKey: 'authUsername', label: '认证用户名', component: 'el-input', props: { placeholder: 'API Key 或用户名' } },
      { modelKey: 'authPasswordField', label: '密码字段名', component: 'el-input', props: { placeholder: 'password, secret ...' } },
      { modelKey: 'authPassword', label: '认证密码', component: 'el-input', props: { showPassword: true, placeholder: 'API Secret 或密码' } },
      { modelKey: 'authTokenField', label: 'Token字段名', component: 'el-input', props: { placeholder: 'token, access_token ...' } },
      { modelKey: 'authTokenPrefix', label: 'Token前缀', component: 'el-input', props: { placeholder: '例如：Bearer ' } },
      // (更新) Token值和过期时间由系统管理，设为只读
      { modelKey: 'authTokenValue', label: '动态Token值', component: 'el-input', props: { placeholder: '由系统自动填充和更新'} },
      { modelKey: 'tokenExpirationTime', label: 'Token过期时间', component: 'el-input', props: { placeholder: '由系统自动填充和更新'} }
    ]
  },
  {
    title: 'API响应解析配置 (JSONPath)',
    fields: [
      { modelKey: 'responseTokenField', label: '登录响应Token字段', component: 'el-input', props: { placeholder: "例如: data.token" } },
      // (新增) Token 有效期相关字段
      { modelKey: 'responseTokenExpirationField', label: 'Token有效期字段', component: 'el-input', props: { placeholder: "例如: data.expires_in" } },
      { modelKey: 'responseTokenExpirationUnit', label: 'Token有效期单位', component: 'el-select', options: tokenExpirationUnitOptions.value },
      { modelKey: 'responsePhoneField', label: '取号响应手机号字段', component: 'el-input', props: { placeholder: "例如: data.mobile" } },
      { modelKey: 'responseIdField', label: '取号响应会话ID字段', component: 'el-input', props: { placeholder: "例如: data.sessionId" } },
      { modelKey: 'responsePhoneIdField', label: '取号响应手机号ID字段', component: 'el-input', props: { placeholder: "用于释放/拉黑的ID, 区别于会话ID" } },
      { modelKey: 'responseStatusField', label: '取码响应状态字段', component: 'el-input', props: { placeholder: "例如: status" } },
      { modelKey: 'responseCodeField', label: '取码响应验证码字段', component: 'el-input', props: { placeholder: "例如: data.smsCode" } }
    ]
  },
  {
    title: '业务与定价',
    fields: [
      { modelKey: 'costPrice', label: '项目成本价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      { modelKey: 'priceMin', label: '允许最低售价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      { modelKey: 'priceMax', label: '允许最高售价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      { modelKey: 'codeTimeout', label: '取码超时(秒)', component: 'el-input-number', props: { min: 1, controlsPosition: 'right' } },
      { modelKey: 'codeMaxAttempts', label: '最大尝试次数', component: 'el-input-number', props: { min: 1, controlsPosition: 'right' } }
    ]
  },
  // (重构) 将所有筛选相关的配置整合到一起
  // {
  //   title: '号码筛选配置 (可选)',
  //   fields: [
  //     { modelKey: 'enableFilter', label: '是否启用筛选', component: 'el-switch', props: { activeValue: true, inactiveValue: false } },
  //     { modelKey: 'filterId', label: '筛选API的ID/密钥', component: 'el-input', props: { placeholder: '筛选API所需的ID或密钥' } },
  //     // (新增) 筛选API的详细配置
  //     { modelKey: 'selectNumberApiRoute', label: '筛选API路径', component: 'el-input', props: { placeholder: '/api/select_number' } },
  //     { modelKey: 'selectNumberApiRouteMethod', label: '筛选API请求方法', component: 'el-select', options: httpMethodOptions.value },
  //     { modelKey: 'selectNumberApiRequestType', label: '筛选API请求类型', component: 'el-select', options: requestTypeOptions.value },
  //     { modelKey: 'selectNumberApiRequestValue', label: '筛选API请求字段', component: 'el-input', props: { placeholder: '例如: country=us&service=sms' } },
  //     { modelKey: 'responseSelectNumberApiField', label: '筛选API响应字段', component: 'el-input', props: { placeholder: '支持JSONPath, 例如: data.numbers' } }
  //   ]
  // },
  {
    title: '状态',
    fields: [
      { modelKey: 'status', label: '项目状态', component: 'el-switch', props: { activeText: "启用", inactiveText: "禁用", activeValue: true, inactiveValue: false } }
    ]
  }
])

// ===================================
// 方法
// ===================================

// 打开弹窗
function openDialog(row = null) {
  form.value = row ? { ...row } : getDefaultForm()
  dialogVisible.value = true
}

// 获取列表
async function fetchList() {
  try {
    const res = await getProjectLis({ pageNum: page.value, pageSize: pageSize, keyword: keyword.value })
    if (!res || res.ok === false) {
      ElMessage.error(res?.message || '获取项目列表失败')
      return
    }
    const data = res.data || {}
    tableData.value = data.records || []
    total.value = data.total || 0
  } catch (err) {
    ElMessage.error('获取项目列表失败')
  }
}

// 保存项目 (新增或编辑)
async function saveProject() {
  try {
    if (form.value.id) {
      await pageUpdate(form.value)
    } else {
      await pageAdd(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchList()
  } catch (err) {
    ElMessage.error('保存失败')
  }
}

// 删除项目
async function deleteProject(id) {
  try {
    await ElMessageBox.confirm('确定要删除该项目吗？', '提示', { type: 'warning' })
    await pageDelete(id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('删除失败')
  }
}

// 获取认证类型枚举
async function fetchAuthEnums() {
  try {
    const res = await getProjectAuthEnums()
    authTypeOptions.value = res.data.map(item => ({
      label: item.description,
      value: item.value
    }))
  } catch (error) {
    ElMessage.error('获取认证类型枚举失败')
  }
}

// 获取请求类型枚举
async function fetchRequestTypeEnums() {
  try {
    const res = await getProjectRequestMethodEnums()
    requestTypeOptions.value = res.data.map(item => ({
      label: item.description,
      value: item.value
    }))
  } catch (error) {
    ElMessage.error('获取请求类型枚举失败')
  }
}

// 初始化加载
onMounted(() => {
  fetchList()
  fetchAuthEnums()
  fetchRequestTypeEnums()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}
.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}
.el-form-item {
  margin-bottom: 18px;
}
.el-select {
  width: 100%;
}
</style>