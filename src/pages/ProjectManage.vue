<template>
  <div class="page-container">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>

    <h2>项目配置页</h2>

    <div class="action-bar">
      <el-button type="primary" @click="openDialog()">新增项目</el-button>
      <el-input v-model="keyword" placeholder="搜索项目名称" clearable style="width: 250px; margin-left: 10px"
        @input="fetchList" />
      <el-input v-model="searchProjectId" placeholder="搜索项目标识(ID)" clearable style="width: 200px; margin-left: 10px"
        @clear="fetchList" @keyup.enter="fetchList" @input="fetchList" />
      <el-button type="info" style="margin-left: 10px" @click="fetchList">查询</el-button>
    </div>


    <el-table :data="tableData" border style="width: 100%; margin-top: 15px">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="projectId" label="项目标识" width="120" />
      <el-table-column prop="projectName" label="项目名称" width="150" />
      <el-table-column prop="lineName" label="线路名称" width="100" />
      <el-table-column prop="lineId" label="线路ID" width="120" />
      <el-table-column prop="domain" label="域名" />
      <el-table-column prop="costPrice" label="成本价" width="90" />
      <el-table-column prop="priceMin" label="最低价" width="90" />
      <el-table-column prop="priceMax" label="最高价" width="90" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag type="success" v-if="row.status">启用</el-tag>
          <el-tag type="info" v-else>禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="success" @click="copyProject(row)">复制</el-button>
          <el-button size="small" type="danger" @click="deleteProject(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <PaginationBar :total="total" v-model:currentPage="page" :page-size="pageSize" @change="fetchList" />

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑项目' : '新增项目'" width="1100px" destroy-on-close top="5vh">
      <el-form :model="form" :rules="rules" ref="projectFormRef" label-width="140px">

        <!-- 1. 基础信息 (使用配置生成) -->
        <template v-for="group in formConfig" :key="group.title">
          <el-divider>{{ group.title }}</el-divider>
          <el-row :gutter="20">
            <el-col :span="12" v-for="field in group.fields" :key="field.modelKey">
              <el-form-item :label="field.label" :prop="field.modelKey">
                <component :is="field.component" v-model="form[field.modelKey]" v-bind="field.props"
                  style="width: 100%">
                  <template v-if="field.component === 'el-select' && field.options">
                    <el-option v-for="option in field.options" :key="option.value" :label="option.label"
                      :value="option.value" />
                  </template>
                </component>
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <div v-if="!form.specialApiStatus">
        <!-- 2. API 配置区域 (手动放置，移出循环) -->

        <!-- 登录接口 -->
        <el-divider>核心接口配置</el-divider>
        <div class="api-section-title">1. 登录接口 (获取Token)</div>
        <div class="step-container">
          <el-alert title="提取变量建议: 将 Token 提取为变量名 token，如果不需要登录可以不设置(该项为空)" type="success" :closable="false"
            style="margin-bottom:10px;" />
          <ApiRequestEditor v-model="form.loginConfig" />
        </div>

        <!-- 获取手机号 -->
        <div class="api-section-title" style="margin-top: 20px;">2. 获取手机号</div>
        <div class="step-container">
          <el-alert title="使用变量: {{token}} | 提取建议: 将手机号提取为 phone，将手机号唯一id提取为 id" type="warning" :closable="false"
            style="margin-bottom:10px;" />
          <ApiRequestEditor v-model="form.getNumberConfig" />
        </div>

        <!-- 获取验证码 -->
        <div class="api-section-title" style="margin-top: 20px;">3. 获取验证码</div>
        <div class="step-container">
          <el-alert title="使用变量: {{token}}, {{phone}}或者{{ id }} | 验证码提取为code" type="error" :closable="false"
            style="margin-bottom:10px;" />
          <ApiRequestEditor v-model="form.getCodeConfig" />
        </div>

        <!-- 查询余额 -->
        <div class="api-section-title" style="margin-top: 20px;">4. 查询项目余额</div>
        <div class="step-container">
          <el-alert title="使用变量: {{token}}, {{phone}}" type="info" :closable="false" style="margin-bottom:10px;" />
          <ApiRequestEditor v-model="form.getBalanceConfig" />
        </div>
        </div>

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
import ApiRequestEditor from '@/components/ApiRequestEditor.vue' // 确保引用路径正确
import { getProjectLis, pageAdd, pageUpdate, pageDelete } from '@/api/admin'

// ===================================
// 常量定义
// ===================================
// 默认的空 API 配置结构
const defaultApiConfigStructure = {
  url: '',
  method: 'POST',
  params: [],
  headers: [],
  bodyType: 'NONE',
  jsonBody: '',
  formBody: [],
  extractRules: [],
  preHooks: [] // 初始化前置操作数组
}
// 辅助函数：创建 API 配置的深拷贝
const createApiConfig = (method = 'POST') => {
  const config = JSON.parse(JSON.stringify(defaultApiConfigStructure))
  config.method = method
  return config
}

// ===================================
// 数据与表单
// ===================================
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const keyword = ref('')
const searchProjectId = ref('') // [新增] 对应 projectId

const dialogVisible = ref(false)
const projectFormRef = ref(null)

const rules = ref({
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  lineName: [{ required: true, message: '请输入线路名称', trigger: 'blur' }],
  projectId: [{ required: true, message: '请输入项目唯一标识', trigger: 'blur' }],
  lineId: [{ required: true, message: '请输入线路ID', trigger: 'blur' }],
  priceMax: [{ required: true, message: '请输入允许最高售价', trigger: ['blur', 'change'] }],
  priceMin: [{ required: true, message: '请输入允许最低售价', trigger: ['blur', 'change'] }],
  costPrice: [{ required: true, message: '请输入项目成本价', trigger: ['blur', 'change'] }]
})

// 初始化表单数据
const getDefaultForm = () => ({
  id: null,

  // --- 基础信息 ---
  projectId: '',
  projectName: '',
  lineId: '',
  lineName: '默认线路',
  domain: '',

  // --- 核心API配置 (使用新结构) ---
  // 注意：这里必须初始化为对象，否则传入子组件 modelValue 会报错
  loginConfig: createApiConfig('POST'),
  getNumberConfig: createApiConfig('GET'),
  getCodeConfig: createApiConfig('GET'),
  getBalanceConfig: createApiConfig('GET'),

  // --- 业务逻辑 ---
  codeMaxAttempts: 10,
  costPrice: 0.00,
  priceMax: 0.00,
  priceMin: 0.00,
  status: true,

  // --- 筛选配置 ---
  enableFilter: false,
  filterId: '',
  // 筛选API配置也可以用新结构，如果需要的话
  // filterConfig: createApiConfig('GET') 

  projectInfo: '' // 项目描述信息
})

const form = ref(getDefaultForm())

// 简化的 formConfig，只保留基础和业务字段
// 复杂的 API 配置由 ApiRequestEditor 接管
const formConfig = computed(() => [
  {
    title: '基础信息',
    fields: [
      { modelKey: 'projectName', label: '项目名称', component: 'el-input', props: { placeholder: '例如：XX平台' } },
      { modelKey: 'projectId', label: '项目唯一标识', component: 'el-input', props: { placeholder: '例如：id0001' } },
      { modelKey: 'lineId', label: '线路ID', component: 'el-input', props: { placeholder: '同一项目下不同API线路' } },
      { modelKey: 'lineName', label: '线路名称', component: 'el-input', props: { placeholder: '同一项目下不同API线路名称' } },
      { modelKey: 'domain', label: '服务域名', component: 'el-input', props: { placeholder: 'https://api.example.com，用于展示时区别' } },
      { modelKey: 'projectInfo', label: '项目描述信息', component: 'el-input', props: { type: 'textarea', rows: 3, placeholder: '简要描述该项目使用的接口文档' } }
    ]
  },
  {
    title: '业务与定价',
    fields: [
      { modelKey: 'costPrice', label: '项目成本价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      { modelKey: 'priceMin', label: '允许最低售价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      { modelKey: 'priceMax', label: '允许最高售价', component: 'el-input-number', props: { min: 0, precision: 2, controlsPosition: 'right' } },
      // { modelKey: 'codeMaxAttempts', label: '最大尝试次数', component: 'el-input-number', props: { min: 1, controlsPosition: 'right' } }
    ]
  },
  {
    title: '其他设置',
    fields: [
      { modelKey: 'status', label: '项目状态', component: 'el-switch', props: { activeText: "启用", inactiveText: "禁用" } }
    ]
  },
  {
    title: '特定API设置-MMAPI：对当前项目使用MMAPI，接口配置将无效',
    fields: [
      { modelKey: 'specialApiStatus', label: '是否启用-MMAPI', component: 'el-switch', props: { activeText: "启用", inactiveText: "禁用" } },
      { modelKey: 'specialApiDelay', label: '请求延时(秒)', component: 'el-input-number', props: { min: 0, precision: 0, controlsPosition: 'right', placeholder: '单位：秒，建议30秒' } },
      {modelKey: 'specialApiGetCodeOutTime', label: '获取验证码请求超时时间(秒)', component: 'el-input-number', props: { min: 30, precision: 0, controlsPosition: 'right', placeholder: '单位：秒，建议150秒' } },
      { modelKey: 'specialApiToken', label: '请求Token', component: 'el-input', props: { placeholder: '例如：815BA9C64F8B7C43' } },
    ]
  },


  {
    title: '号码筛选配置 (可选)',
    fields: [
      { modelKey: 'enableFilter', label: '是否启用筛选', component: 'el-switch', props: { activeValue: true, inactiveValue: false } },
      { modelKey: 'selectNumberApiRequestValue', label: '筛选API项目名称', component: 'el-input', props: { placeholder: '例如: dy/ks' } },
    ]
  },
])

// ===================================
// 方法
// ===================================

function openDialog(row = null) {
  if (row) {
    // 编辑模式：深拷贝数据
    const rowData = JSON.parse(JSON.stringify(row))

    // 兼容处理：如果老数据是 null，给一个默认空结构，防止组件报错
    if (!rowData.loginConfig) rowData.loginConfig = createApiConfig('POST')
    if (!rowData.getNumberConfig) rowData.getNumberConfig = createApiConfig('GET')
    if (!rowData.getCodeConfig) rowData.getCodeConfig = createApiConfig('GET')
    if (!rowData.getBalanceConfig) rowData.getBalanceConfig = createApiConfig('GET')

    form.value = rowData
  } else {
    // 新增模式
    form.value = getDefaultForm()
  }
  dialogVisible.value = true
}

function copyProject(row) {
  const newProject = JSON.parse(JSON.stringify(row));
  newProject.id = null;
  newProject.projectName = `${row.projectName}_副本`;
  newProject.projectId = `${row.projectId}_copy`;
  newProject.lineId = `${row.lineId}_copy`;
  newProject.authTokenValue = '';
  newProject.tokenExpirationTime = null;

  // 同样要确保 config 对象存在
  if (!newProject.loginConfig) newProject.loginConfig = createApiConfig('POST')
  if (!newProject.getNumberConfig) newProject.getNumberConfig = createApiConfig('GET')
  if (!newProject.getCodeConfig) newProject.getCodeConfig = createApiConfig('GET')
  if (!newProject.getBalanceConfig) newProject.getBalanceConfig = createApiConfig('GET')

  openDialog(newProject);
}

async function fetchList() {
  try {
    const res = await getProjectLis(
      {
        pageNum: page.value,
        pageSize: pageSize,
        projectName: keyword.value,
        projectId: searchProjectId.value
      })
    if (res?.data) {
      tableData.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    ElMessage.error('获取项目列表失败')
  }
}

async function saveProject() {
  if (!projectFormRef.value) return
  await projectFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const apiFunc = form.value.id ? pageUpdate : pageAdd
        await apiFunc(form.value)
        ElMessage.success('保存成功')
        dialogVisible.value = false
        fetchList()
      } catch (err) {
        ElMessage.error('保存失败')
      }
    } else {
      ElMessage.error('请填写所有必填项')
    }
  })
}

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

onMounted(() => {
  fetchList()
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

.step-container {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.api-section-title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  color: #606266;
}
</style>