<template>
  <div class="user-line-stats-page">
    <!-- 返回首页按钮 (保持原有风格) -->
    <div class="block_index" style="position: fixed; top: 10px; left: 20px; z-index: 100;">
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>

    <h2>用户取号线路统计</h2>

    <!-- 查询表单 -->
    <div class="search-form-container">
      <el-form :model="queryParams" ref="queryForm" inline @submit.prevent="handleSearch">
        <el-form-item label="用户名" prop="userName">
          <el-input 
            v-model="queryParams.userName" 
            placeholder="请输入用户名" 
            clearable 
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        
        <el-form-item label="项目ID" prop="projectId">
          <el-input 
            v-model="queryParams.projectId" 
            placeholder="请输入项目ID" 
            clearable 
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="统计时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            @change="handleDateChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="tableData"
      border
      stripe
      style="margin-top: 12px;"
      v-loading="loading"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <!-- <el-table-column prop="userId" label="用户ID" width="100" align="center" /> -->
      <el-table-column prop="userName" label="用户名" min-width="120" align="center" />
      <el-table-column prop="projectId" label="项目ID" width="120" align="center" />
      <el-table-column prop="lineId" label="线路ID" width="120" align="center">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.lineId }}</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="totalNumbers" label="总取号数" align="center" sortable>
        <template #default="{ row }">
          <span style="color: #409EFF; font-weight: bold;">{{ row.totalNumbers }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="totalCodes" label="总取码数" align="center" sortable>
        <template #default="{ row }">
          <span style="color: #67C23A; font-weight: bold;">{{ row.totalCodes }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="successRate" label="来码率" align="center">
        <template #default="{ row }">
          <!-- 根据成功率显示不同颜色 -->
          <el-tag :type="getRateTagType(row.successRate)" effect="dark">
            {{ row.successRate }}
          </el-tag>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="暂无统计数据" />
      </template>
    </el-table>

    <!-- 分页组件 -->
    <el-pagination
      v-if="total > 0"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="queryParams.size"
      :current-page="queryParams.page"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue';
import { getUserLineStats } from '@/api/admin'; // 引入提供的API
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';

// --- State ---
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const dateRange = ref([]); // 时间选择器绑定值

// 设置默认时间为 00:00:00 - 23:59:59
const defaultTime = [
  new Date(2000, 1, 1, 0, 0, 0),
  new Date(2000, 1, 1, 23, 59, 59),
]

const queryParams = reactive({
  page: 1,
  size: 10,
  userName: '',
  projectId: '',
  startTime: '',
  endTime: ''
});

// --- Functions ---

// 加载数据
async function loadData() {
  if (loading.value) return;
  loading.value = true;
  try {
    // 过滤掉空参数
    const params = { ...queryParams };
    for (const key in params) {
      if (params[key] === '' || params[key] === null) {
        delete params[key];
      }
    }

    const res = await getUserLineStats(params);

    if (res?.code === 200) {
      const data = res.data;
      tableData.value = data.records || [];
      total.value = data.total || 0;
    } else {
      ElMessage.error(res?.message || '获取统计数据失败');
      tableData.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('API Error:', error);
    ElMessage.error('网络错误，请稍后再试');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  queryParams.page = 1;
  loadData();
}

// 重置
function handleReset() {
  queryParams.page = 1;
  queryParams.size = 10;
  queryParams.userName = '';
  queryParams.projectId = '';
  queryParams.startTime = '';
  queryParams.endTime = '';
  
  dateRange.value = [];
  loadData();
}

// 处理时间变动
function handleDateChange(dates) {
  if (dates && dates.length === 2) {
    queryParams.startTime = dates[0];
    queryParams.endTime = dates[1];
  } else {
    queryParams.startTime = '';
    queryParams.endTime = '';
  }
}

// 分页 - 页码改变
function handlePageChange(currentPage) {
  queryParams.page = currentPage;
  loadData();
}

// 分页 - 每页条数改变
function handleSizeChange(currentSize) {
  queryParams.size = currentSize;
  queryParams.page = 1;
  loadData();
}

// 辅助函数：根据来码率字符串（如 "15.46%"）返回 Tag 颜色类型
function getRateTagType(rateStr) {
  if (!rateStr) return 'info';
  const rate = parseFloat(rateStr.replace('%', ''));
  if (isNaN(rate)) return 'info';
  
  if (rate >= 30) return 'success'; // 高于30% 绿色
  if (rate >= 10) return 'warning'; // 10%-30% 橙色
  return 'danger'; // 低于10% 红色
}

// --- Lifecycle ---
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.user-line-stats-page {
  padding: 5px;
}

.search-form-container {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 样式复用之前的逻辑 */
:deep(.el-form) {
  display: flex;
  flex-wrap: wrap;
  gap: 15px 20px;
  align-items: center;
}

:deep(.el-form-item) {
  margin-bottom: 0 !important;
  flex-grow: 1;
  min-width: 240px; /* 稍微调小一点适应统计表单 */
}

/* 按钮组靠右 */
.el-form-item:last-child {
  flex-grow: 0;
  margin-left: auto;
  min-width: auto;
}

:deep(.el-form-item .el-input),
:deep(.el-form-item .el-date-editor) {
  width: 100%;
}

/* 响应式适配 */
@media (max-width: 768px) {
  :deep(.el-form-item) {
    width: 100%;
    min-width: unset;
  }
  .el-form-item:last-child {
    width: 100%;
    margin-left: 0;
  }
}
</style>