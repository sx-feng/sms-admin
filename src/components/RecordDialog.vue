<!-- src/components/RecordDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="记录详情"
    width="600px"
    destroy-on-close
  >
    <el-table :data="records" border style="width: 100%">
      <el-table-column prop="id" label="编号" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="amount" label="金额" />
      <el-table-column prop="time" label="时间" />
    </el-table>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
</script>

<style scoped>
.el-table {
  font-size: 13px;
}
</style>
