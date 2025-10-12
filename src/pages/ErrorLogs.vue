<template>
  <div class="error-log-page">
    <h2 class="page-title">异常日志</h2>

    <el-table
      v-loading="loading"
      :data="logs"
      border
      stripe
      style="width: 100%"
      @row-click="toggleExpand"
    >
      <el-table-column prop="time" label="时间" width="180" />
      <el-table-column prop="functionName" label="函数名" width="160" />
      <el-table-column prop="packageName" label="包名" />
      <el-table-column prop="errorMessage" label="报错信息" show-overflow-tooltip />
      <el-table-column prop="user" label="影响用户" width="120" />
    </el-table>

    <!-- 折叠查看堆栈 -->
    <el-collapse v-if="expandedLog" class="stack-panel">
      <el-collapse-item title="查看完整堆栈信息">
        <pre class="stack-text">{{ expandedLog.stack }}</pre>
      </el-collapse-item>
    </el-collapse>

    <el-pagination
      v-if="total > pageSize"
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      @current-change="loadPage"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'


const route = useRoute() // 👈 拿到当前路由对象
const logs = ref([])
const loading = ref(false)
const total = ref(0)
const pageSize = 10
const expandedLog = ref(null)

async function loadPage() {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  logs.value = [
    {
      id: 1,
      time: '2025-10-20 09:45:00',
      functionName: 'handleLogin',
      packageName: 'auth.module',
      errorMessage: 'TypeError: Cannot read properties of undefined',
      user: 'user_001',
      stack: 'at handleLogin (auth.js:32)\nat main.js:10'
    },
    {
      id: 2,
      time: '2025-10-19 11:22:00',
      functionName: 'fetchData',
      packageName: 'network.api',
      errorMessage: 'NetworkError: Failed to fetch',
      user: 'user_002',
      stack: 'at fetchData (api.js:10)\nat main.js:22'
    }
  ]
  total.value = logs.value.length
  loading.value = false
}

function toggleExpand(row) {
  expandedLog.value =
    expandedLog.value && expandedLog.value.id === row.id ? null : row
}

// ✅ 页面第一次加载
onMounted(() => loadPage())

// ✅ 每次路由切换到 /errorlogs 时重新加载
watch(
  () => route.fullPath,
  (newPath) => {
    if (newPath.includes('/errorlogs')) {
      loadPage()
    }
  }
)


</script>

<style scoped>
.error-log-page {
  padding: 20px;
  color: #fff;
  background: #000;
  min-height: 100vh;
}
.page-title {
  color: #ffd24d;
  font-weight: 800;
  margin-bottom: 16px;
}
.stack-panel {
  margin-top: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
}
.stack-text {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 13px;
  color: #ddd;
  padding: 8px;
}
.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>
