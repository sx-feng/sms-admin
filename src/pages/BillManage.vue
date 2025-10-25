<template>
  <div class="bill-manage-page">
    <h2>账单管理</h2>
    <!-- 搜索表单 -->
    <el-form inline>
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
      <el-form-item label="用户ID">
        <el-input v-model="query.userId" placeholder="请输入用户ID" clearable/>
      </el-form-item>
      <el-form-item>
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
    >
      <el-table-column prop="id" label="账单ID" width="80" align="center"/>
      <el-table-column prop="userId" label="用户ID" width="100" align="center"/>
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
      <el-table-column prop="timestamp" label="时间" width="180" align="center"/>
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
      layout="total, prev, pager, next, jumper"
      :total="total"
      :page-size="query.pageSize"
      :current-page="query.page"
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
        <el-descriptions-item label="用户ID">{{ selectedRecord.userId }}</el-descriptions-item>
        
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
  userId: ''
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
      ...(query.userId && { userId: query.userId }),
      ...(query.dateRange?.length === 2 && {
        startTime: query.dateRange[0],
        endTime: query.dateRange[1]
      })
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

function handlePageChange(currentPage) {
  query.page = currentPage
  loadBillList()
}

/**
 * 修改：打开明细弹窗
 * 将当前行数据赋值给 selectedRecord，并显示弹窗
 */
function openRecordDetail(row) {
  selectedRecord.value = row
  dialogVisible.value = true
}

// --- 格式化函数 ---
/**
 * 格式化资金类型
 */
function formatFundType(type) {
  // 根据实体类定义：0-业务扣费, 1-后台操作
  const map = {
    0: '业务扣费',
    1: '后台操作'
  }
  return map[type] ?? '未知类型'
}

/**
 * 新增：格式化账本类型
 */
function formatLedgerType(type) {
  // 根据实体类定义：1-入账，0-出账
  const map = {
    0: '出账',
    1: '入账'
  }
  return map[type] ?? '未知状态'
}

/**
 * 计算并格式化变动金额
 * 优化：现在可以直接使用 price 字段，但为了兼容旧数据，保留通过余额计算的逻辑作为后备
 * 同时，根据 ledgerType 决定符号，更准确
 */
function formatAmount(row) {
  if (row.price != null) {
    const sign = row.ledgerType === 1 ? '+' : '-'
    return `${sign}${Number(row.price).toFixed(2)}`
  }
  // 后备逻辑
  const amount = Number(row.balanceAfter) - Number(row.balanceBefore)
  return amount >= 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2)
}

/**
 * 根据账本类型返回不同颜色
 * 优化：直接根据 ledgerType 判断，入账为绿，出账为红
 */
function getAmountColor(row) {
  return row.ledgerType === 1 ? '#67C23A' : '#F56C6C' 
}


// --- 导出 ---
async function exportExcel() {
  // const res = await exportBills({ dateRange: dateRange.value, userId: query.userId })
  // if (res?.data?.code === 200) {
  //   window.open(res.data.data.file)
  //   ElMessage.success('导出成功')
  // } else {
  //   ElMessage.error('导出失败')
  // }
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
</style>