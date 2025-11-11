<template>
  <div class="number-manage-page">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
    <el-button type="primary"  @click="$router.push('/dashboard')" >返回首页</el-button>
  </div>
    <h2>号码记录</h2>
    <!-- 查询表单 -->
     <div class="search-form-container">
    <el-form :model="queryParams" ref="queryForm" inline @submit.prevent="handleSearch">
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="queryParams.userName" placeholder="请输入用户名" clearable />
      </el-form-item>
      <el-form-item label="项目ID" prop="projectId">
        <el-input v-model="queryParams.projectId" placeholder="请输入项目ID" clearable />
      </el-form-item>
      <el-form-item label="线路ID" prop="lineId">
        <el-input v-model="queryParams.lineId" placeholder="请输入线路ID" clearable />
      </el-form-item>
      <el-form-item label="手机号" prop="phoneNumber">
        <el-input v-model="queryParams.phoneNumber" placeholder="请输入手机号" clearable />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
          <el-option label="全部" value="" />
          <el-option label="待取码" :value="0" />
          <el-option label="取码中" :value="1" />
          <el-option label="成功" :value="2" />
          <el-option label="超时" :value="3" />
          <el-option label="无效" :value="4" />
        </el-select>
      </el-form-item>
      <el-form-item label="扣费状态" prop="charged">
        <el-select v-model="queryParams.charged" placeholder="扣费状态" clearable>
          <el-option label="全部" value="" />
          <el-option label="未扣费" :value="0" />
          <el-option label="已扣费" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="取号时间">
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD HH:mm:ss"
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
      :data="recordList"
      border
      stripe
      style="margin-top: 12px;"
      v-loading="loading"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div style="padding: 10px 20px;">
            <p><strong>平台手机码ID:</strong> {{ row.apiPhoneId || '无' }}</p>
            <p><strong>取号前余额:</strong> {{ row.balanceBefore }}</p>
            <p><strong>取号后余额:</strong> {{ row.balanceAfter }}</p>
            <p><strong>开始取码时间:</strong> {{ row.startCodeTime || 'N/A' }}</p>
            <p><strong>取码完成时间:</strong> {{ row.codeReceivedTime || 'N/A' }}</p>
            <p><strong>错误详情:</strong> {{ row.errorInfo || '无' }}</p>
            <p><strong>备注信息:</strong> {{ row.remark || '无' }}</p>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="id" label="ID"  />
      <el-table-column prop="userId" label="用户ID"  />
      <el-table-column prop="projectId" label="项目ID"  />
       <el-table-column prop="userName" label="用户名"  />
      <el-table-column prop="lineId" label="线路ID"  />
      <el-table-column prop="phoneNumber" label="手机号" />
      <el-table-column prop="code" label="验证码" />
      <el-table-column prop="status" label="状态" >
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ formatStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
       <el-table-column prop="charged" label="是否扣费" >
        <template #default="{ row }">
          <el-tag :type="row.charged === 1 ? 'success' : 'info'">
            {{ row.charged === 1 ? '已扣费' : '未扣费' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="价格"  />
      <el-table-column prop="getNumberTime" label="取号时间"  />
      <el-table-column prop="updateTime" label="更新时间"  />

      <template #empty>
        <el-empty description="暂无数据" />
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
import { pageNumberList } from '@/api/admin'; // 确保你的API路径正确
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';

// --- state ---
const loading = ref(false);
const recordList = ref([]);
const total = ref(0);
const queryForm = ref(null); // 用于表单重置

// 查询参数
const queryParams = reactive({
  page: 1,
  size: 10,
  status: '',
  userName: '',
  projectId: '',
  phoneNumber: '',
  charged: '',
  startTime: '',
  endTime: '',
  lineId: ''
});

// 日期范围选择器的绑定值
const dateRange = ref([]);

// --- functions ---
async function loadRecords() {
  if (loading.value) return;
  loading.value = true;
  try {
    // 创建一个副本，移除空值参数，避免URL过长或后端解析问题
    const params = Object.entries(queryParams)
      .filter(([, value]) => value !== '' && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    // console.log("发送的查询参数:", params);

    const res = await pageNumberList(params);
    // console.log("号码记录响应数据:", res);

    if (res?.code === 200) {
      const data = res.data;
      recordList.value = data.records || [];
      total.value = data.total || 0;
    } else {
      ElMessage.error(res?.data?.message || '获取数据失败');
      recordList.value = [];
      total.value = 0;
    }
  } catch (error) {
    // console.error("加载号码记录失败:", error);
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

function handleReset() {
  // 重置queryParams对象
  queryParams.page = 1;
  queryParams.size = 10;
  queryParams.status = '';
  queryParams.userName = '';
  queryParams.projectId = '';
  queryParams.phoneNumber = '';
  queryParams.charged = '';
  queryParams.startTime = '';
  queryParams.endTime = '';
  queryParams.lineId = '';
  
  // 清空日期选择器
  dateRange.value = [];

  // 重新加载数据
  loadRecords();
}


function handlePageChange(currentPage) {
  queryParams.page = currentPage;
  loadRecords();
}

function handleSizeChange(currentSize) {
    queryParams.size = currentSize;
    queryParams.page = 1; // 切换每页大小时，通常回到第一页
    loadRecords();
}

function handleDateChange(dates) {
  if (dates && dates.length === 2) {
    queryParams.startTime = dates[0];
    queryParams.endTime = dates[1];
  } else {
    queryParams.startTime = '';
    queryParams.endTime = '';
  }
}

// --- formatting functions ---
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
.number-manage-page {
  padding: 5px;
}
.el-form-item {
  margin-right: 12px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 使用 BEM 命名规范或者一个清晰的容器类来避免样式污染 */
.search-form-container {
  padding: 20px;
  background-color: #f5f7fa; /* 设置一个浅灰色背景，使其与页面其他部分区分开 */
  border-radius: 8px; /* 添加圆角 */
  margin-bottom: 20px; /* 与下方内容保持间距 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 添加轻微的阴影效果 */
}

/* :deep() 是 ::v-deep 的别名，推荐使用，用于修改子组件内部样式 */
:deep(.el-form) {
  display: flex;
  flex-wrap: wrap; /* 允许表单项换行 */
  gap: 15px 20px; /* 设置表单项之间的垂直和水平间距 */
  align-items: center; /* 垂直居中对齐 */
}

/* 统一设置表单项的样式 */
:deep(.el-form-item) {
  margin-bottom: 0 !important; /* Element Plus 默认有 margin-bottom，我们用 gap 替代，所以重置掉 */
  flex-grow: 1; /* 允许表单项在需要时伸展 */
  min-width: 280px; /* 为每个表单项设置一个最小宽度 */
}

/* 统一输入框和选择器的宽度 */
:deep(.el-form-item .el-input),
:deep(.el-form-item .el-select),
:deep(.el-form-item .el-date-editor) {
  width: 100%; /* 宽度占满父容器 (el-form-item) */
}

/* 针对按钮组的特殊处理 */
.el-form-item:last-child {
  /* 让最后一个表单项（按钮组）不伸展，并且内容靠右对齐 */
  flex-grow: 0;
  margin-left: auto; /* 关键样式：将按钮推到右侧 */
  min-width: auto; /* 取消最小宽度限制 */
}

/* 美化按钮 */
:deep(.el-button) {
  transition: all 0.3s ease; /* 添加过渡效果 */
}

:deep(.el-button .el-icon) {
  margin-right: 5px; /* 让图标和文字之间有点间距 */
}

/* 响应式布局：当屏幕宽度小于 768px 时，让每个表单项占据一行 */
@media (max-width: 768px) {
  :deep(.el-form-item) {
    width: 100%;
    min-width: unset; /* 在小屏幕上取消最小宽度 */
  }

  .el-form-item:last-child {
    width: 100%;
    margin-left: 0;
  }

  :deep(.el-form-item:last-child .el-button) {
    width: 48%; /* 让两个按钮平分一行 */
  }
}
</style>