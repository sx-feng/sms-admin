<template>
  <div class="bill-manage-page">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
      <el-button type="primary"  @click="$router.push('/dashboard')" >返回首页</el-button>
    </div>
    <h2>账单管理</h2>
    <!-- 搜索表单 -->
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
      
      <!-- 修改：资金类型筛选，使用 v-for 动态渲染 -->
      <el-form-item label="资金类型">
        <el-select v-model="query.fundType" placeholder="请选择资金类型" clearable style="width: 150px;">
          <el-option
            v-for="item in fundTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="账本类型">
        <el-select v-model="query.ledgerType" placeholder="请选择账本类型" clearable style="width: 150px;">
          <el-option label="出账" :value="0"></el-option>
          <el-option label="入账" :value="1"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item class="form-buttons">
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
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
           <!-- 修改：标签颜色根据账本类型（入账/出账）判断，更准确 -->
          <el-tag :type="row.ledgerType === 1 ? 'success' : 'warning'">
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
           <!-- 修改：标签颜色根据账本类型判断 -->
          <el-tag :type="selectedRecord.ledgerType === 1 ? 'success' : 'warning'">
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
import { Search } from '@element-plus/icons-vue'

// 新增：定义与后端枚举匹配的资金类型选项和映射
const fundTypeOptions = ref([
  { value: 0, label: '业务扣费' },
  { value: 1, label: '代理充值' },
  { value: 2, label: '代理扣款' },
  { value: 4, label: '代理回款' },
  { value: 3, label: '管理员操作' }
]);

const fundTypeMap = {
  0: '业务扣费',
  1: '代理充值',
  2: '代理扣款',
  4: '代理回款',
  3: '管理员操作'
};

const query = reactive({
  page: 1,
  pageSize: 10,
  dateRange: [],
  userId: '',
  remark: '',
  username: '',
  fundType: '',
  ledgerType: '',
  sortField: 'timestamp',
  sortOrder: 'desc',
})

const billList = ref([])
const total = ref(0)
const loading = ref(false)
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

onMounted(() => { loadBillList() })

// --- 事件处理 ---
function handleSearch() { query.page = 1; loadBillList() }
function handleSizeChange(newSize) { query.pageSize = newSize; query.page = 1; loadBillList() }
function handlePageChange(currentPage) { query.page = currentPage; loadBillList() }
function handleSortChange({ prop, order }) {
  query.sortField = prop
  query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  loadBillList()
}
function openRecordDetail(row) { selectedRecord.value = row; dialogVisible.value = true }

// --- 格式化函数 ---
// 修改：使用新的 fundTypeMap 进行格式化
function formatFundType(type) {
  return fundTypeMap[type] ?? '未知类型'
}

function formatLedgerType(type) {
  const map = { 0: '出账', 1: '入账' }
  return map[type] ?? '未知状态'
}

function formatAmount(row) {
  if (row.price != null) {
    const sign = row.ledgerType === 1 ? '+' : ''
    // 注意：出账金额本身可能是负数，这里统一由 ledgerType 控制符号，取 price 绝对值
    return `${sign}${Number(row.price).toFixed(2)}`
  }
  const amount = Number(row.balanceAfter) - Number(row.balanceBefore)
  return amount >= 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2)
}

function getAmountColor(row) {
  return row.ledgerType === 1 ? '#67C23A' : '#F56C6C'
}

</script>

<style scoped>
/* 样式部分保持不变 */
.bill-manage-page {
  padding: 20px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.responsive-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.responsive-form .el-form-item {
  margin-right: 0;
  margin-bottom: 0;
}
@media (max-width: 768px) {
  .responsive-form {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  .responsive-form .el-form-item {
    width: 100%;
    margin-bottom: 0;
  }
  .responsive-form .el-form-item .el-input,
  .responsive-form .el-form-item .el-select,
  .responsive-form .el-form-item .el-date-editor {
    width: 100% !important;
  }
  .responsive-form .form-buttons {
     text-align: right;
  }
  .responsive-form .form-buttons .el-button {
    width: auto;
    min-width: 100px;
  }
}
@media (max-width: 500px) {
  .pagination {
    justify-content: center;
  }
  .pagination >>> .el-pagination__sizes,
  .pagination >>> .el-pagination__jumper {
    display: none;
  }
}
</style>