<template>
  <div class="number-manage-page">
    <h2>号码记录</h2>
    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="status" placeholder="请选择状态">
          <el-option label="全部" value="" />
          <el-option label="取号中" value="fetching" />
          <el-option label="成功" value="success" />
          <el-option label="超时" value="timeout" />
          <el-option label="失败" value="failed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadNumbers">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="numbers" border stripe style="margin-top: 12px;">
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column prop="projectId" label="项目ID" width="100" />
      <el-table-column prop="lineId" label="线路ID" width="100" />
      <el-table-column prop="number" label="手机号" width="150" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column prop="updatedAt" label="更新时间" width="180" />
    </el-table>

    <el-pagination
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      @current-change="loadNumbers"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getNumbers } from '@/utils/api.js'

const status = ref('')
const numbers = ref([])
const total = ref(0)
const pageSize = 10

async function loadNumbers(page = 1) {
  const res = await getNumbers({ page, pageSize, status: status.value })
  if (res?.data?.code === 200) {
    numbers.value = res.data.data.list
    total.value = res.data.data.total
  }
}
</script>
