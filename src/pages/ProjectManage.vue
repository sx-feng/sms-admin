<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <h2>项目配置页</h2>

    <!-- 操作区域 -->
    <div class="action-bar">
      <el-button type="primary" @click="openDialog()">新增项目</el-button>
      <el-input
        v-model="keyword"
        placeholder="搜索域名 / 项目ID"
        clearable
        style="width: 250px; margin-left: 10px"
        @input="fetchList"
      />
    </div>

    <!-- 表格展示 -->
    <el-table
      :data="projectList"
      border
      style="width: 100%; margin-top: 15px"
    >
      <el-table-column prop="id" label="项目ID" width="90" />
      <el-table-column prop="projectId" label="项目标识" width="110" />
      <el-table-column prop="lineId" label="线路ID" width="90" />
      <el-table-column prop="domain" label="域名" />
      <el-table-column prop="getNumberRoute" label="获取手机号路由" />
      <el-table-column prop="getCodeRoute" label="获取验证码路由" />
      <el-table-column prop="costPrice" label="成本价" width="90" />
      <el-table-column prop="priceMin" label="最低价" width="90" />
      <el-table-column prop="priceMax" label="最高价" width="90" />
      <el-table-column prop="codeTimeout" label="超时(s)" width="80" />
      <el-table-column prop="filterApi" label="筛选API" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag type="success" v-if="row.status === 1">启用</el-tag>
          <el-tag type="info" v-else>禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteProject(row.id)">删除</el-button>
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

    <!-- 弹窗：新增/编辑项目 -->
    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑项目' : '新增项目'"
      width="750px"
      destroy-on-close
    >
      <el-form :model="form" label-width="150px">

        <!-- 🟦 基础配置 -->
        <el-divider>基础配置</el-divider>

        <el-form-item label="项目标识(projectId)">
          <el-input v-model="form.projectId" placeholder="例如 id0001" />
        </el-form-item>

        <el-form-item label="线路ID">
          <el-input v-model="form.lineId" placeholder="请输入线路ID" />
        </el-form-item>

        <el-form-item label="域名">
          <el-input v-model="form.domain" placeholder="例如：https://api.xxx.com" />
        </el-form-item>

        <el-form-item label="获取手机号路由">
          <el-input v-model="form.getNumberRoute" placeholder="/api/getNumber" />
        </el-form-item>

        <el-form-item label="获取验证码路由">
          <el-input v-model="form.getCodeRoute" placeholder="/api/getCode" />
        </el-form-item>

        <el-form-item label="验证码超时(秒)">
          <el-input-number v-model="form.codeTimeout" :min="1" />
        </el-form-item>

        <el-form-item label="返回手机号字段名">
          <el-input v-model="form.responsePhoneField" placeholder="如 data.mobile" />
        </el-form-item>

        <el-form-item label="返回验证码ID字段名">
          <el-input v-model="form.responseIdField" placeholder="如 data.sessionId" />
        </el-form-item>

        <el-form-item label="返回状态字段名">
          <el-input v-model="form.responseStatusField" placeholder="如 status" />
        </el-form-item>

        <el-form-item label="返回验证码字段名">
          <el-input v-model="form.responseCodeField" placeholder="如 data.smsCode" />
        </el-form-item>

        <el-form-item label="成本价">
          <el-input-number v-model="form.costPrice" :min="0" />
        </el-form-item>

        <el-form-item label="最低价">
          <el-input-number v-model="form.priceMin" :min="0" />
        </el-form-item>

        <el-form-item label="最高价">
          <el-input-number v-model="form.priceMax" :min="0" />
        </el-form-item>

        <!-- 🟨 筛选配置 -->
        <el-divider>筛选配置</el-divider>

        <el-form-item label="是否启用筛选">
          <el-switch v-model="form.enableFilter" :active-value="1" :inactive-value="0" />
        </el-form-item>

        <el-form-item label="筛选API路由">
          <el-input v-model="form.filterApi" placeholder="/api/filter" />
        </el-form-item>

        <el-form-item label="筛选密钥/ID">
          <el-input v-model="form.filterId" placeholder="筛选API所需的密钥或ID" />
        </el-form-item>

        <!-- 🟩 认证配置 -->
        <el-divider>认证配置</el-divider>

        <el-form-item label="认证类型">
          <el-select v-model="form.authType" placeholder="选择认证方式">
            <el-option label="无认证 (NO_AUTH)" value="NO_AUTH" />
            <el-option label="用户名密码(地址栏)" value="BASIC_AUTH_PARAM" />
            <el-option label="用户名密码(JSON)" value="BASIC_AUTH_JSON" />
            <el-option label="Token(请求头Header)" value="TOKEN_HEADER" />
            <el-option label="Token(地址栏Param)" value="TOKEN_PARAM" />
          </el-select>
        </el-form-item>

        <el-form-item label="用户名字段名">
          <el-input v-model="form.authUsernameField" placeholder="如 username" />
        </el-form-item>

        <el-form-item label="密码字段名">
          <el-input v-model="form.authPasswordField" placeholder="如 password" />
        </el-form-item>

        <el-form-item label="认证用户名">
          <el-input v-model="form.authUsername" placeholder="admin" />
        </el-form-item>

        <el-form-item label="认证密码">
          <el-input v-model="form.authPassword" show-password placeholder="******" />
        </el-form-item>

        <el-form-item label="Token字段名">
          <el-input v-model="form.authTokenField" placeholder="如 token" />
        </el-form-item>

        <el-form-item label="Token值">
          <el-input v-model="form.authTokenValue" placeholder="Token 值" />
        </el-form-item>

        <el-form-item label="Token前缀">
          <el-input v-model="form.authTokenPrefix" placeholder="如 Bearer " />
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import PaginationBar from '@/components/PaginationBar.vue'
import { pageProjects, pageAdd, pageUpdate, pageDelete } from '@/api/admin'




// 数据源
const projectList = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const keyword = ref('')

// 弹窗与表单
const dialogVisible = ref(false)
const form = ref({
  id: null,
  projectId: '',
  lineId: '',
  domain: '',
  getNumberRoute: '',
  getCodeRoute: '',
  codeTimeout: 10,
  responsePhoneField: '',
  responseIdField: '',
  responseStatusField: '',
  responseCodeField: '',
  costPrice: 0,
  priceMin: 0,
  priceMax: 0,
  enableFilter: 0,
  filterApi: '',
  filterId: '',
  authType: 'NO_AUTH',
  authUsernameField: '',
  authPasswordField: '',
  authUsername: '',
  authPassword: '',
  authTokenField: '',
  authTokenValue: '',
  authTokenPrefix: '',
  status: 1
})

// 打开弹窗
function openDialog(row = null) {
  form.value = row ? { ...row } : { ...form.value, id: null }
  dialogVisible.value = true
}

// 获取列表
async function fetchList() {
  try {
    const res = await pageProjects({ page: page.value, size: pageSize, keyword: keyword.value })
    if (!res || res.ok === false) {
      ElMessage.error(res?.message || '获取项目列表失败')
      return
    }
    const data = res.data || {}
    projectList.value = data.records || []
    total.value = data.total || 0
  } catch (err) {
    ElMessage.error('获取项目列表失败')
  }
}
// 编辑项目新增项目
async function saveProject() {
  try {
    if (form.value.id) {
      await pageUpdate(form.value) // 编辑
    } else {
      await pageAdd(form.value) // 新增
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


// 初始化加载
onMounted(fetchList)
</script>

<style scoped>
.page-container {
  padding: 20px;
  border: 2px solid #6abae9;
}
.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
</style>
