<template>
  <div class="bill-manage-page">
    <h2>账单管理</h2>
    <el-form inline>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadBills">查询</el-button>
        <el-button @click="exportExcel">导出Excel</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="bills" border stripe style="margin-top: 12px;">
      <el-table-column prop="userId" label="用户ID" width="100"/>
      <el-table-column prop="projectId" label="项目ID" width="100"/>
      <el-table-column prop="lineId" label="线路ID" width="100"/>
      <el-table-column prop="amount" label="金额" width="100"/>
      <el-table-column prop="type" label="类型" width="120"/>
      <el-table-column prop="before" label="扣费前余额" width="120"/>
      <el-table-column prop="after" label="扣费后余额" width="120"/>
      <el-table-column prop="time" label="时间" width="180"/>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link @click="openRecord(row)">明细</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      @current-change="loadBills"
      class="pagination"
    />

    <RecordDialog v-if="dialogVisible" :record="selected" @close="dialogVisible=false"/>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getBills, exportBills } from '@/utils/api.js'
import RecordDialog from '@/components/RecordDialog.vue'
import { ElMessage } from 'element-plus'

const dateRange = ref([])
const bills = ref([])
const total = ref(0)
const pageSize = 10
const selected = ref(null)
const dialogVisible = ref(false)

async function loadBills(page = 1) {
  const res = await getBills({ page, pageSize, dateRange: dateRange.value })
  if (res?.data?.code === 200) {
    bills.value = res.data.data.list
    total.value = res.data.data.total
  }
}
function openRecord(row) {
  selected.value = row
  dialogVisible.value = true
}
async function exportExcel() {
  const res = await exportBills({ dateRange: dateRange.value })
  if (res?.data?.code === 200) {
    window.open(res.data.data.file)
    ElMessage.success('导出成功')
  }
}
</script>
