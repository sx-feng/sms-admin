<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`用户 [${user?.userName}] 的账单记录`"
    width="1000px"
    @open="handleOpen"
    @close="handleClose"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-table :data="recordData" v-loading="loading" border height="50vh" style="width: 100%">
      <el-table-column type="expand" width="50" align="center">
        <template #default="{ row }">
          <!-- 展开行的逻辑保持不变，依然根据 fundType 为 0 (业务扣费) 来判断 -->
          <div v-if="row.fundType === 0" style="padding: 10px 20px">
            <el-descriptions title="业务详情" :column="2" border>
              <el-descriptions-item label="项目ID">{{ row.projectId || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="项目线路ID">{{ row.lineId || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="手机号码">{{ row.phoneNumber || 'N/A' }}</el-descriptions-item>
              <el-descriptions-item label="验证码">{{ row.code || 'N/A' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="时间" width="180" align="center" />
      
      <!-- 修改：将“账本类型”改为“交易类型”，并使用新的格式化函数 -->
      <el-table-column label="交易类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getTagTypeByPrice(row.price)" effect="light">
            {{ formatFundType(row.fundType) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <!-- 修改：金额的显示逻辑，直接根据 price 的正负来判断 -->
      <el-table-column label="金额 (元)" width="150" align="right">
        <template #default="{ row }">
          <span :style="{ color: Number(row.price) >= 0 ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
            {{ Number(row.price) > 0 ? '+' : '' }}{{ Number(row.price).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="操作前余额 (元)" prop="balanceBefore" width="150" align="right">
        <template #default="{ row }">
          {{ Number(row.balanceBefore).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="操作后余额 (元)" prop="balanceAfter" width="150" align="right">
        <template #default="{ row }">
          {{ Number(row.balanceAfter).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" min-width="180" />
    </el-table>

    <!-- 分页组件 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageChange"
        @current-change="handlePageChange"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { getUserLedgerRecords } from '@/api/admin';

// props 和 emits 保持不变
const props = defineProps({
  modelValue: Boolean,
  user: Object,
});
const emit = defineEmits(['update:modelValue']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// 组件内部状态保持不变
const recordData = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

// 新增：根据 Java FundType Enum 创建一个映射
const fundTypeMap = {
  0: '业务扣费',
  1: '代理充值',
  2: '代理扣款',
  4: '代理回款',
  3: '管理员操作'
};

/**
 * 获取账单记录的函数保持不变
 */
async function fetchRecords() {
  if (!props.user?.id) return;
  
  loading.value = true;
  try {
    const params = {
      pageNum: page.value,
      pageSize: pageSize.value,
      userId: props.user.id,
    };
    const res = await getUserLedgerRecords(params);
    recordData.value = res.data.records || [];
    total.value = res.data.total || 0;
  } catch (error) {
    ElMessage.error('获取账单记录失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 分页、打开和关闭的回调函数保持不变
function handlePageChange() { fetchRecords(); }
function handleOpen() { page.value = 1; fetchRecords(); }
function handleClose() {
  recordData.value = [];
  total.value = 0;
  page.value = 1;
  pageSize.value = 10;
}

// ------ 修改：格式化函数 ------

/**
 * 格式化资金类型显示文本
 * @param {number} fundTypeCode - 后端返回的资金类型 Code
 */
function formatFundType(fundTypeCode) {
  return fundTypeMap[fundTypeCode] || '未知类型';
}

/**
 * 根据金额的正负返回对应的 Element Plus 标签类型
 * @param {number | string} price - 交易金额
 */
function getTagTypeByPrice(price) {
  const amount = Number(price);
  if (amount > 0) return 'success'; // 入账
  if (amount < 0) return 'danger';  // 出账
  return 'info';                    // 其他
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>