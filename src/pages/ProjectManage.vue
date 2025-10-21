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
      <el-table-column prop="lineId" label="线路ID" width="90" />
      <el-table-column prop="domain" label="域名" />
      <el-table-column prop="getPhoneApi" label="获取手机号路由" />
      <el-table-column prop="getCodeApi" label="获取验证码路由" />
      <el-table-column prop="costPrice" label="成本价" width="90" />
      <el-table-column prop="minPrice" label="最低价" width="90" />
      <el-table-column prop="maxPrice" label="最高价" width="90" />
      <el-table-column prop="timeout" label="超时(s)" width="80" />
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
      width="600px"
      destroy-on-close
    >
      <el-form :model="form" label-width="120px">
        <el-form-item label="线路ID">
          <el-input v-model="form.lineId" placeholder="请输入线路ID" />
        </el-form-item>

        <el-form-item label="域名">
          <el-input v-model="form.domain" placeholder="例如：https://api.xxx.com" />
        </el-form-item>

        <el-form-item label="获取手机号路由">
          <el-input v-model="form.getPhoneApi" placeholder="/api/getPhone" />
        </el-form-item>

        <el-form-item label="获取验证码路由">
          <el-input v-model="form.getCodeApi" placeholder="/api/getCode" />
        </el-form-item>

        <el-form-item label="成本价">
          <el-input-number v-model="form.costPrice" :min="0" />
        </el-form-item>

        <el-form-item label="最低价">
          <el-input-number v-model="form.minPrice" :min="0" />
        </el-form-item>

        <el-form-item label="最高价">
          <el-input-number v-model="form.maxPrice" :min="0" />
        </el-form-item>

        <el-form-item label="超时(秒)">
          <el-input-number v-model="form.timeout" :min="1" />
        </el-form-item>

        <el-form-item label="筛选API">
          <el-input v-model="form.filterApi" placeholder="/api/filter" />
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
import { pageProjects } from '@/api/admin'
import axios from 'axios'

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
  lineId: '',
  domain: '',
  getPhoneApi: '',
  getCodeApi: '',
  costPrice: 0,
  minPrice: 0,
  maxPrice: 0,
  timeout: 10,
  filterApi: '',
  status: 1
})

// 打开弹窗
function openDialog(row = null) {
  if (row) form.value = { ...row }
  else
    form.value = {
      id: null,
      lineId: '',
      domain: '',
      getPhoneApi: '',
      getCodeApi: '',
      costPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      timeout: 10,
      filterApi: '',
      status: 1
    }
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

// 保存项目
async function saveProject() {
  try {
    const api = form.value.id
      ? '/api/admin/project/update'
      : '/api/admin/project/add'
    await axios.post(api, form.value)
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
    await axios.delete(`/api/admin/project/delete/${id}`)
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
}
.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
</style>

