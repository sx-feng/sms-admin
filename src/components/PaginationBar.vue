<!-- src/components/PaginationBar.vue -->
<template>
  <div class="pagination-bar">
    <el-pagination
      background
      layout="prev, pager, next, jumper, ->, total"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

// eslint-disable-next-line no-unused-vars
const props = defineProps({
  total: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 10
  },
  currentPage: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:currentPage', 'change'])

function handlePageChange(page) {
  emit('update:currentPage', page)
  emit('change', page)
}
</script>

<style scoped>
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 10px 0;
}
</style>
