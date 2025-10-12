<template>
  <el-card class="notice-bar" shadow="hover" :style="noticeStyle">
    <template #header>
      <div class="card-header">
        <el-icon><BellFilled /></el-icon>
        <span>{{ title }}</span>
      </div>
    </template>

    <div v-if="loading" class="loading">
      <el-skeleton animated :rows="3" />
    </div>
    <div v-else>
      <el-empty v-if="items.length === 0" description="暂无公告" />
      <ul v-else class="notice-list">
        <li v-for="(n, i) in items" :key="i" class="notice-item">
          <span class="dot">📢</span>
          <span class="text">{{ renderText(n) }}</span>
          <span v-if="renderTime(n)" class="time">{{ renderTime(n) }}</span>
        </li>
      </ul>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { BellFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getUserNotice } from '@/api/admin.js'

const props = defineProps({
  title: { type: String, default: '系统公告' },
  // 限制公告可视高度（像素或 CSS 长度），默认更紧凑
  maxHeight: { type: [Number, String], default: 100 },
})

const noticeStyle = computed(() => ({
  '--notice-max-h': typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : String(props.maxHeight),
}))

const loading = ref(false)
const items = ref([])

function renderText(n) {
  if (!n) return ''
  if (typeof n === 'string') return n
  return (
    n.content || n.text || n.notice || n.message || n.msg || n.title || n.value || ''
  )
}
function renderTime(n) {
  if (!n || typeof n === 'string') return ''
  return n.time || n.createdAt || n.updatedAt || ''
}

async function loadNotices() {
  loading.value = true
  try {
    const res = await getUserNotice()
    const payload = res?.data
    let list = []
    if (Array.isArray(payload)) {
      list = payload
    } else if (payload && Array.isArray(payload.list)) {
      list = payload.list
    } else if (payload && typeof payload === 'object') {
      const single = payload.content || payload.text || payload.notice || payload.message || payload.msg || payload.title || payload.value
      if (single) list = [single]
    } else if (typeof payload === 'string') {
      list = payload.split(/\r?\n/).filter(Boolean)
    }
    items.value = list
    if (!list.length && res && res.message) {
      ElMessage.info(res.message)
    }
  } catch (e) {
    ElMessage.error('公告加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadNotices)
</script>

<style scoped>
.notice-bar :deep(.el-card__header) { padding: 8px 12px; }
.notice-bar :deep(.el-card__body) { padding: 8px 12px; max-height: var(--notice-max-h); overflow-y: auto; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.notice-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.notice-item { display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 6px; font-size: 14px; color: #555; }
.dot { opacity: 0.9; }
.time { color: #999; font-size: 12px; }
.loading { padding: 4px 0; }
</style>
