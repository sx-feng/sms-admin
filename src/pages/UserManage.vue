<template>
  <div class="user-manage">
    <div class="page-header">
      <h2>👤 用户管理</h2>
      <div class="actions">
        <el-input v-model="parentId" placeholder="上级ID（可选）" size="small" style="width: 160px; margin-right: 8px;" />
        <el-button type="primary" size="small" @click="getUserList">查询</el-button>
      </div>
    </div>

    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="用户ID" width="120" />
      <el-table-column prop="userName" label="用户名" width="150" />
      <el-table-column prop="balance" label="余额" width="100" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'">
            {{ row.status ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isAgent" label="代理权限" width="120">
        <template #default="{ row }">
          <el-switch v-model="row.isAgent" @change="toggleAgent(row)" />
        </template>
      </el-table-column>
      <!-- Todo -->
      <!-- <el-table-column prop="projectPrices" label="项目价格JSON" min-width="200">
        <template #default="{ row }">
          <el-tooltip placement="top" :content="JSON.stringify(row.priceJson)">
            <el-text truncated>{{ JSON.stringify(row.priceJson) }}</el-text>
          </el-tooltip>
        </template>
      </el-table-column> -->

      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button size="small" type="success" @click="openRechargeDialog(row)">充值</el-button>
          <el-button size="small" type="info" @click="openRecordDialog(row)">账单</el-button>
          <el-button size="small" type="danger" @click="deleteUser(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <PaginationBar
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @change="getUserList"
    />

    <!-- 弹窗 -->
    <EditDialog v-model="editDialogVisible" :user="currentUser" @updated="getUserList" />
    <RechargeDialog v-model="rechargeDialogVisible" :user="currentUser" @updated="getUserList" />
    <RecordDialog v-model="recordDialogVisible" :user="currentUser" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import PaginationBar from '@/components/PaginationBar.vue'
import RecordDialog from '@/components/RecordDialog.vue'
import {listUsers} from '@/api/admin'
import EditDialog from '@/components/EditDialog.vue'
import RechargeDialog from '@/components/RechargeDialog.vue'
const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const currentUser = ref(null)
const editDialogVisible = ref(false)
const rechargeDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const parentId = ref('')

async function getUserList() {
  loading.value = true
  try {
    
    const res =await listUsers()
    console.log(res.data,"用户管理信息")
    const data =res.data
    tableData.value = data.records || []
    total.value = data.total || 0
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

function openEditDialog(user) {
  currentUser.value = user
  editDialogVisible.value = true
}

function openRechargeDialog(user) {
  currentUser.value = user
  rechargeDialogVisible.value = true
}

function openRecordDialog(user) {
  currentUser.value = user
  recordDialogVisible.value = true
}

function toggleAgent(row) {
  // TODO: 接入接口修改代理权限
  ElMessage.success(`用户 ${row.username} 代理状态已更新`)
}

function deleteUser(user) {
  ElMessageBox.confirm(`确认删除用户 ${user.username} 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      // TODO: 调用接口删除
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

onMounted(getUserList)
</script>

<style scoped>
.user-manage {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style>
