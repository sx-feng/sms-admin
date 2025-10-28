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
      <el-table-column label="账本类型" width="100" align="center">
        <template #default="{ row }">
          <!-- ledgerType: 1=收入, 2=支出, 0=业务 -->
          <el-tag :type="getFundTypeTag(row.ledgerType)" effect="light">
            {{ formatFundType(row.ledgerType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额 (元)" width="150" align="right">
        <template #default="{ row }">
          <span :style="{ color: row.fundType === 1 ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
            {{ row.fundType === 1 ? '+' : '-' }} {{ Number(row.price).toFixed(2) }}
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
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
// 导入刚刚创建的 API 函数
import { getUserLedgerRecords } from '@/api/admin';

// 定义 props 和 emits，用于与父组件进行 v-model 通信
const props = defineProps({
  modelValue: Boolean,
  user: Object,
});
const emit = defineEmits(['update:modelValue']);

// 通过 computed 属性使 v-model 生效
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// 组件内部状态
const recordData = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

/**
 * 获取账单记录
 */
async function fetchRecords() {
  // 确保 user prop 存在且有 ID
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

/**
 * 监听分页变化
 */
function handlePageChange() {
  fetchRecords();
}

/**
 * 弹窗打开时的回调
 */
function handleOpen() {
  // 重置到第一页并获取数据
  page.value = 1;
  fetchRecords();
}

/**
 * 弹窗关闭时的回调
 */
function handleClose() {
  // 清理数据，防止下次打开时看到旧数据
  recordData.value = [];
  total.value = 0;
  page.value = 1;
  pageSize.value = 10;
}

// ------ 格式化函数 ------

/**
 * 格式化资金类型显示文本
 * @param {number} fundType - 资金类型
 */
function formatFundType(fundType) {
  switch (fundType) {
    case 1: return '入账';
    case 0: return '出账';
    default: return '业务';
  }
}

/**
 * 根据资金类型返回对应的 Element Plus 标签类型 （1-入账，0-出账）
 * @param {number} fundType - 资金类型
 */
function getFundTypeTag(fundType) {
  switch (fundType) {
    case 1: return 'success'; // 收入
    case 0: return 'warning'; // 支出
    default: return 'info';    // 业务
  }
}
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>