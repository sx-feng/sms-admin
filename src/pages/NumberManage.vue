<template>
  <div class="number-manage-page">
    <h2>号码记录</h2>
    <el-form :model="queryParams" inline @submit.prevent="handleSearch">
      <el-form-item label="状态">
        <!-- 注意：这里的 value 已经改为与后端一致的数字类型 -->
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
          <el-option label="全部" value="" />
          <el-option label="待取码" :value="0" />
          <el-option label="取码中" :value="1" />
          <el-option label="成功" :value="2" />
          <el-option label="超时" :value="3" />
          <el-option label="无效" :value="4" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch" :loading="loading">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table
      :data="recordList"
      border
      stripe
      style="margin-top: 12px;"
      v-loading="loading"
    >
      <!-- 使用展开行来显示 remark 等详细信息，避免表格过宽 -->
      <el-table-column type="expand">
        <template #default="{ row }">
          <div style="padding: 10px 20px;">
            <p><strong>备注信息:</strong> {{ row.remark || '无' }}</p>
            <p><strong>错误详情:</strong> {{ row.errorInfo || '无' }}</p>
          </div>
        </template>
      </el-table-column>

      <!-- 调整 prop 以匹配 API 返回的字段名 -->
      <el-table-column prop="id" label="ID"  />
      <el-table-column prop="userId" label="用户ID"  />
      <el-table-column prop="projectId" label="项目ID" />
      <el-table-column prop="lineId" label="线路ID" />
      <!-- <el-table-column prop="projectName" label="项目名称" /> -->
      <el-table-column prop="phoneNumber" label="手机号" />
      <el-table-column prop="code" label="验证码"  />
      <el-table-column prop="status" label="状态" >
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ formatStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="价格" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column prop="updateTime" label="更新时间" width="180" />

      <template #empty>
        <el-empty description="暂无数据" />
      </template>
    </el-table>

    <el-pagination
      v-if="total > 0"
      background
      layout="total, prev, pager, next, jumper"
      :total="total"
      :page-size="queryParams.size"
      :current-page="queryParams.page"
      @current-change="handlePageChange"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue';
import { pageNumberList } from '@/api/admin'; // 假设你的 API 方法名是这个
import { ElMessage } from 'element-plus';

// --- state ---
const loading = ref(false);
const recordList = ref([]); // 变量名改为 recordList 更贴切
const total = ref(0);

const queryParams = reactive({
  page: 1,
  size: 10,
  status: '',
});

// --- functions ---
async function loadRecords() {
  if (loading.value) return;
  loading.value = true;
  try {
    // 适配新的 API 数据结构
    const res = await pageNumberList(queryParams);
    console.log("号码记录响应数据:", res);
    if (res?.code === 200) {
      const data = res.data;
      recordList.value = data.records || []; // 注意这里是 records
      total.value = data.total || 0;
    } else {
      ElMessage.error(res?.data?.message || '获取数据失败');
      recordList.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error("Failed to load number records:", error);
    ElMessage.error('网络错误，请稍后再试');
    recordList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryParams.page = 1;
  loadRecords();
}

function handlePageChange(currentPage) {
  queryParams.page = currentPage;
  loadRecords();
}

// --- formatting functions ---

// 根据后端实体类的注释，创建精确的状态映射
const statusMap = {
  0: { text: '待取码', type: 'info' },
  1: { text: '取码中', type: 'primary' },
  2: { text: '成功', type: 'success' },
  3: { text: '超时', type: 'warning' },
  4: { text: '无效', type: 'danger' },
};

function formatStatus(status) {
  return statusMap[status]?.text || '未知状态';
}

function getStatusTagType(status) {
  return statusMap[status]?.type || 'info';
}

// --- lifecycle hooks ---
onMounted(() => {
  loadRecords();
});
</script>

<style scoped>
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>