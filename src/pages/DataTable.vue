<template>
  <!-- 返回首页的悬浮按钮 -->
  <div class="fixed-home-button">
    <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
  </div>

  <div class="data-report-container">
    <!-- 头部标题和刷新按钮 -->
    <div class="page-header">
      <h2>数据报表</h2>
      <el-button type="primary" :icon="Refresh" @click="fetchDataReport" :loading="loading">刷新</el-button>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-container">
      <el-form :inline="true" :model="queryParams" @keyup.enter="handleSearch">
        <el-form-item label="项目名称">
          <el-input v-model="queryParams.projectName" placeholder="请输入项目名称" clearable />
        </el-form-item>
        <el-form-item label="项目ID">
          <el-input v-model="queryParams.projectId" placeholder="请输入项目ID" clearable />
        </el-form-item>
        <el-form-item label="线路ID">
          <el-input v-model="queryParams.lineId" placeholder="请输入线路ID" type="number" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 主数据表格 -->
    <el-table
      :data="reportData"
      border
      v-loading="loading"
      style="width: 100%"
      row-key="projectId"
      :expand-row-keys="expandRowKeys"
      @expand-change="handleExpandChange"
    >
      <!-- 空状态 -->
      <template #empty>
        <el-empty description="暂无数据报表信息" />
      </template>
      
      <!-- 可展开列，用于展示线路详情 -->
      <el-table-column type="expand">
        <template #default="props">
          <div class="nested-table-container">
            <h4>项目 [{{ props.row.projectName }}] - 线路详情</h4>
            <el-table :data="props.row.lineDetails" border>
              <el-table-column label="线路ID" prop="lineId" align="center" width="120" />
              <el-table-column label="取号次数" prop="totalRequests" align="center" />
              <el-table-column label="成功次数" prop="successCount" align="center" />
              <el-table-column label="回码率" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.successRate >= 60 ? 'success' : row.successRate >= 30 ? 'warning' : 'danger'">
                    {{ row.successRate.toFixed(1) }}%
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="收入" prop="totalRevenue" align="center">
                 <template #default="{ row }">
                    <span style="color: #67C23A;">+ ¥{{ Number(row.totalRevenue).toFixed(2) }}</span>
                 </template>
              </el-table-column>
              <el-table-column label="成本" prop="totalCost" align="center">
                 <template #default="{ row }">
                   <span style="color: #F56C6C;">- ¥{{ Number(row.totalCost).toFixed(2) }}</span>
                 </template>
              </el-table-column>
              <el-table-column label="盈利" prop="totalProfit" align="center">
                 <template #default="{ row }">
                    <span :style="{ color: row.totalProfit >= 0 ? '#67C23A' : '#F56C6C' }">
                      ¥{{ Number(row.totalProfit).toFixed(2) }}
                    </span>
                 </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </el-table-column>

      <!-- 主表列定义 -->
      <el-table-column label="项目名称" prop="projectName" fixed width="180" />
      <el-table-column label="项目ID" prop="projectId" width="150" />
      <el-table-column label="线路数" prop="lineCount" align="center" width="90" />
      <el-table-column label="总取号" prop="totalRequests" align="center" />
      <el-table-column label="总成功" prop="successCount" align="center" />
      <el-table-column label="总回码率" align="center">
        <template #default="{ row }">
            <el-progress 
              :percentage="parseFloat(row.successRate.toFixed(1))" 
              :color="row.successRate > 80 ? '#67c23a' : row.successRate > 50 ? '#e6a23c' : '#f56c6c'"
            />
        </template>
      </el-table-column>
      <el-table-column label="总收入" prop="totalRevenue" align="center">
        <template #default="{ row }">
            <span style="font-weight: bold; color: #67C23A;">+ ¥{{ Number(row.totalRevenue).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="总成本" prop="totalCost" align="center">
         <template #default="{ row }">
            <span style="font-weight: bold; color: #F56C6C;">- ¥{{ Number(row.totalCost).toFixed(2) }}</span>
         </template>
      </el-table-column>
      <el-table-column label="总盈利" prop="totalProfit" align="center" fixed="right" width="150">
         <template #default="{ row }">
            <span :style="{ fontWeight: 'bold', fontSize: '16px', color: row.totalProfit >= 0 ? '#67C23A' : '#F56C6C' }">
              ¥{{ Number(row.totalProfit).toFixed(2) }}
            </span>
         </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <div class="pagination-container">
        <el-pagination
            background
            :current-page="pagination.current"
            :page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Search } from '@element-plus/icons-vue';
import { getDataReport } from '@/api/admin';

// 表格数据
const reportData = ref([]);
// 加载状态
const loading = ref(false);
// 控制展开行
const expandRowKeys = ref([]);

// 筛选查询参数
const queryParams = reactive({
  projectName: '',
  projectId: '',
  lineId: ''
});

// 分页参数
const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
});

/**
 * 获取数据报表
 */
async function fetchDataReport() {
  loading.value = true;
  // 清空展开行，避免数据刷新后行 key 不存在的问题
  expandRowKeys.value = []; 

  try {
    // 整合查询参数和分页参数
    const params = {
      ...queryParams,
      current: pagination.current,
      size: pagination.size
    };
    const res = await getDataReport(params);
    // 后端返回的是分页结构，表格数据在 res.data.records
    reportData.value = res.data?.records || [];
    pagination.total = res.data?.total || 0;
  } catch (error) {
    ElMessage.error('获取数据报表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

/**
 * 处理查询操作
 */
function handleSearch() {
  pagination.current = 1; // 每次搜索都从第一页开始
  fetchDataReport();
}

/**
 * 处理重置操作
 */
function handleReset() {
  queryParams.projectName = '';
  queryParams.projectId = '';
  queryParams.lineId = '';
  pagination.current = 1;
  pagination.size = 10;
  fetchDataReport();
}

/**
 * 处理分页大小变化
 * @param {number} newSize
 */
function handleSizeChange(newSize) {
  pagination.size = newSize;
  fetchDataReport();
}

/**
 * 处理当前页码变化
 * @param {number} newPage
 */
function handleCurrentChange(newPage) {
  pagination.current = newPage;
  fetchDataReport();
}

/**
 * 处理展开行变化事件，保持只展开一行
 */
function handleExpandChange(row, expandedRows) {
    if (expandedRows.length > 0) {
        expandRowKeys.value = [row.projectId];
    } else {
        expandRowKeys.value = [];
    }
}

// 组件挂载时自动获取数据
onMounted(() => {
  fetchDataReport();
});
</script>

<style scoped>
.fixed-home-button {
  position: fixed;
  top: 15px;
  left: 20px;
  z-index: 1000;
}

.data-report-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
}

.filter-container {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.nested-table-container {
  padding: 15px 25px;
  background-color: #f9f9f9;
}

.nested-table-container h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: normal;
  color: #303133;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>