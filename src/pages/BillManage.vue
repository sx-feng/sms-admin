<template>
  <div class="bill-manage-page">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
      <el-button type="primary"  @click="$router.push('/dashboard')" >返回首页</el-button>
    </div>
    <h2>账单管理</h2>
    <!-- 搜索表单 -->
    <!-- 增加一个自定义 class 'responsive-form' 以便应用响应式样式 -->
    <el-form :model="query" inline class="responsive-form">
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="query.dateRange"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 360px;"
        />
      </el-form-item>
      <el-form-item label="用户名">
        <el-input v-model="query.username" placeholder="请输入用户名" clearable/>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="query.remark" placeholder="请输入备注" clearable/>
      </el-form-item>
      <el-form-item label="资金类型">
        <el-select v-model="query.fundType" placeholder="请选择资金类型" clearable style="width: 150px;">
          <el-option label="业务扣费" :value="0"></el-option>
          <el-option label="后台操作" :value="1"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="账本类型">
        <el-select v-model="query.ledgerType" placeholder="请选择账本类型" clearable style="width: 150px;">
          <el-option label="出账" :value="0"></el-option>
          <el-option label="入账" :value="1"></el-option>
        </el-select>
      </el-form-item>
      <!-- 将按钮也放入一个 el-form-item 中，以便更好地控制布局 -->
      <el-form-item class="form-buttons">
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <!-- <el-button :icon="Download" @click="exportExcel">导出Excel</el-button> -->
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      :data="billList"
      border
      stripe
      style="margin-top: 12px;"
      v-loading="loading"
      :default-sort="{prop: 'timestamp', order: 'descending'}"
      @sort-change="handleSortChange"
    >
      <!-- ... 表格内容保持不变 ... -->
       <el-table-column prop="id" label="账单ID" width="80" align="center"/>
      <el-table-column prop="userName" label="用户名" width="100" align="center"/>
      <el-table-column label="变动金额" width="120" align="center">
        <template #default="{ row }">
          <span :style="{ color: getAmountColor(row) }">
            {{ formatAmount(row) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="balanceAfter" label="变动后余额" width="140" align="center"/>
      <el-table-column prop="fundType" label="资金类型" width="120" align="center">
         <template #default="{ row }">
          <el-tag :type="row.fundType === 0 ? 'warning' : 'success'">
            {{ formatFundType(row.fundType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="180"/>
      <el-table-column prop="timestamp" label="时间" width="180" align="center" sortable/>
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openRecordDetail(row)">明细</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-if="total > 0"
      background
      :layout="`total, sizes, prev, pager, next, jumper`"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="query.pageSize"
      :current-page="query.page"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
      class="pagination"
    />

    <!-- 明细弹窗 -->
    <!-- ... 弹窗内容保持不变 ... -->
    <el-dialog
      title="账单明细"
      v-model="dialogVisible"
      width="600px"
      destroy-on-close
    >
      <el-descriptions v-if="selectedRecord" :column="2" border>
        <el-descriptions-item label="账单ID">{{ selectedRecord.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ selectedRecord.userName }}</el-descriptions-item>

        <el-descriptions-item label="账本类型">
           <el-tag :type="selectedRecord.ledgerType === 1 ? 'success' : 'danger'">
            {{ formatLedgerType(selectedRecord.ledgerType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="资金类型">
          <el-tag :type="selectedRecord.fundType === 0 ? 'warning' : 'success'">
            {{ formatFundType(selectedRecord.fundType) }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="变动金额" :span="2">
          <span :style="{ color: getAmountColor(selectedRecord), fontWeight: 'bold' }">
            {{ formatAmount(selectedRecord) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="变动前余额">{{ selectedRecord.balanceBefore }}</el-descriptions-item>
        <el-descriptions-item label="变动后余额">{{ selectedRecord.balanceAfter }}</el-descriptions-item>

        <!-- 仅当是业务扣费时，显示以下业务相关信息 -->
        <template v-if="selectedRecord.fundType === 0">
          <el-descriptions-item label="项目ID">{{ selectedRecord.projectId || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="线路ID">{{ selectedRecord.lineId || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="手机号码">{{ selectedRecord.phoneNumber || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="验证码">{{ selectedRecord.code || 'N/A' }}</el-descriptions-item>
        </template>

        <el-descriptions-item label="操作时间" :span="2">{{ selectedRecord.timestamp }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ selectedRecord.remark || '无' }}</el-descriptions-item>

      </el-descriptions>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { pageAllLedger } from '@/api/admin.js'
import { ElMessage } from 'element-plus'
import { Search, Download } from '@element-plus/icons-vue'

// 查询参数
const query = reactive({
  page: 1,
  pageSize: 10,
  dateRange: [],
  userId: '',
  remark: '',
  username: '',
  fundType: '',   // 新增：资金类型
  ledgerType: '', // 新增：账本类型
  // 新增排序字段
  sortField: 'timestamp',
  sortOrder: 'desc',
})

const billList = ref([])
const total = ref(0)
const loading = ref(false)

// 详情弹窗相关
const selectedRecord = ref(null)
const dialogVisible = ref(false)

// --- 数据加载 ---
async function loadBillList() {
  loading.value = true
  try {
    const params = {
      page: query.page,
      size: query.pageSize,
      ...(query.userId && { filterByUserId: query.userId }),
      ...(query.dateRange?.length === 2 && {
        startTime: query.dateRange[0],
        endTime: query.dateRange[1]
      }),
      username: query.username || '',
    
      remark: query.remark || '',
      ...(query.fundType !== '' && query.fundType != null && { fundType: query.fundType }),
      ...(query.ledgerType !== '' && query.ledgerType != null && { ledgerType: query.ledgerType }),
      // 新增：传递排序参数
      sortField: query.sortField,
      sortOrder: query.sortOrder,
    }
    const res = await pageAllLedger(params)
    if (res?.code === 200) {
      billList.value = res.data.records
      total.value = res.data.total
    } else {
      ElMessage.error(res?.data?.message || '数据加载失败')
      billList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error("Failed to load bills:", error)
    ElMessage.error('网络错误，请稍后再试')
  } finally {
    loading.value = false
  }
}

// 组件挂载时自动加载
onMounted(() => {
  loadBillList()
})

// --- 事件处理 ---
function handleSearch() {
  query.page = 1
  loadBillList()
}

function handleSizeChange(newSize) {
  query.pageSize = newSize
  query.page = 1
  loadBillList()
}

function handlePageChange(currentPage) {
  query.page = currentPage
  loadBillList()
}

// 新增：处理表格排序
function handleSortChange({ prop, order }) {
  query.sortField = prop
  // element-plus 的 order 是 'ascending' 或 'descending'，需要转换为 'asc' 或 'desc'
  query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  loadBillList()
}

function openRecordDetail(row) {
  selectedRecord.value = row
  dialogVisible.value = true
}

// --- 格式化函数 ---
function formatFundType(type) {
  const map = {
    0: '业务扣费',
    1: '后台操作'
  }
  return map[type] ?? '未知类型'
}

function formatLedgerType(type) {
  const map = {
    0: '出账',
    1: '入账'
  }
  return map[type] ?? '未知状态'
}

function formatAmount(row) {
  if (row.price != null) {
    const sign = row.ledgerType === 1 ? '+' : '-'
    return `${sign}${Number(row.price).toFixed(2)}`
  }
  const amount = Number(row.balanceAfter) - Number(row.balanceBefore)
  return amount >= 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2)
}

function getAmountColor(row) {
  return row.ledgerType === 1 ? '#67C23A' : '#F56C6C'
}

// --- 导出 (逻辑未变) ---
async function exportExcel() {
  // ...
}

</script>

<style scoped>
.bill-manage-page {
  padding: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* --- 新增：响应式表单样式 --- */

/* 默认（桌面端）样式微调 */
.responsive-form {
  display: flex;
  flex-wrap: wrap; /* 允许表单项换行 */
  align-items: center; /* 垂直居中对齐 */
  gap: 10px; /* 表单项之间的间距 */
}

/* 移除 Element Plus 默认的 inline-block 间距，使用 gap 控制 */
.responsive-form .el-form-item {
  margin-right: 0;
  margin-bottom: 0; /* 在移动端堆叠时，我们将使用 gap，所以这里也重置 */
}

/* 移动端适配 (屏幕宽度小于 768px) */
@media (max-width: 768px) {
  .responsive-form {
    flex-direction: column; /* 垂直堆叠 */
    align-items: stretch;   /* 拉伸表单项以填充容器宽度 */
    gap: 15px; /* 增大垂直间距 */
  }

  .responsive-form .el-form-item {
    width: 100%; /* 每个表单项占据整行 */
    margin-bottom: 0; /* 重置底部边距，因为我们使用 gap */
  }

  /* 使表单项内的输入控件也占据100%宽度 */
  .responsive-form .el-form-item .el-input,
  .responsive-form .el-form-item .el-select,
  .responsive-form .el-form-item .el-date-editor {
    width: 100% !important;
  }

  /* 对于按钮组，可以让它们靠右或居中显示 */
  .responsive-form .form-buttons {
     text-align: right;
  }
  .responsive-form .form-buttons .el-button {
    width: auto; /* 按钮不需要全宽 */
    min-width: 100px;
  }
}

/* 优化分页在小屏幕上的显示 */
@media (max-width: 500px) {
  .pagination {
    justify-content: center; /* 居中显示 */
  }
  /* 在非常小的屏幕上可以考虑简化分页器布局 */
  .pagination >>> .el-pagination__sizes,
  .pagination >>> .el-pagination__jumper {
    display: none;
  }
}

</style>