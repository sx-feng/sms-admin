<template>
  <div class="error-log-page">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
    <el-button type="primary"  @click="$router.push('/dashboard')" >返回首页</el-button>
  </div>
    <div class="header-bar">
      <h2 class="page-title">异常日志</h2>
      <el-button type="primary" size="small" @click="fetchLogs">🔄 刷新日志</el-button>
    </div>

    <!-- ✅ 表格外层加容器边框 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="logs"
        border
        stripe
        style="width: 100%"
        @row-click="showDetail"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="errorFunction" label="出错方法" width="160" />
        <el-table-column prop="errorModule" label="模块/包名" width="160" />
        <el-table-column prop="errorMessage" label="错误摘要" show-overflow-tooltip />
        <el-table-column prop="userId" label="用户ID" width="100" />
        <el-table-column prop="errorTime" label="发生时间" width="180" />
      </el-table>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="异常详情" width="750px" destroy-on-close>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="出错方法">{{ detail.errorFunction }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ detail.errorModule }}</el-descriptions-item>
        <el-descriptions-item label="错误信息">{{ detail.errorMessage }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detail.userId || '无' }}</el-descriptions-item>
        <el-descriptions-item label="发生时间">{{ detail.errorTime || '暂无' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider />
      <h4>堆栈信息：</h4>
      <pre class="stack-text">{{ detail.stackTrace || '（无堆栈信息）' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listErrorLogs, getErrorDetail } from '@/api/admin'

const logs = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const detail = ref({})

// 获取日志列表
async function fetchLogs() {
  loading.value = true
  try {
    const res = await listErrorLogs({ pageNum: 1, pageSize: 50 })
    if (res.ok || res.code === 200) {
      logs.value = res.data?.records || []
      if (logs.value.length === 0) ElMessage.info('暂无异常日志')
    } else {
      ElMessage.error(res.message || '获取日志失败')
    }
  } catch (e) {
    ElMessage.error('无法连接日志接口')
  } finally {
    loading.value = false
  }
}

// 点击查看详情
async function showDetail(row) {
  try {
    const res = await getErrorDetail(row.id)
    if (res.ok || res.code === 200) {
      detail.value = res.data
      dialogVisible.value = true
    } else {
      ElMessage.error(res.message || '加载详情失败')
    }
  } catch (e) {
    ElMessage.error('请求详情失败')
  }
}

onMounted(fetchLogs)
</script>

<style scoped>
.error-log-page {
  padding: 20px;
  background: #ffffff;
  min-height: 100vh;
  border: 2px solid #6abae9;
}

.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  color: #21a0e9;
  font-weight: 700;
}

/* ✅ 表格容器加边框与圆角 */
.table-container {
  
  border-radius: 8px;
  padding: 15px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 弹窗中的堆栈信息 */
.stack-text {
  white-space: pre-wrap;
  font-family: monospace;
  background: #f8f8f8;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  color: #333;
}
</style>
