<template>
  <div class="dashboard">
    <NoticeBar />

    <!-- 🔔 公告栏 -->
    

    <!-- 💰 统计卡片区域 -->
<div class="stats-row">
  <el-card
    v-for="item in [
      { label: '💰 总余额', value: stats.totalPrice },
      { label: '👥 用户数', value: stats.totalUsers },
      { label: '🔢 总号码数', value: stats.totalNumbersReceived },
      { label: '📈 总体回码率', value: stats.overallCodeRate }
    ]"
    :key="item.label"
    class="stat-card"
    shadow="hover"
  >
    <div class="stat-value">
      {{ typeof item.value === 'number' ? item.value.toFixed(2) : item.value }}
    </div>
    <div class="stat-label">{{ item.label }}</div>
  </el-card>
</div>



    <!-- 📈 折线图区域 -->
    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><TrendCharts /></el-icon>
          <span>每日号码 / 验证码数量趋势</span>
        </div>
      </template>
      <v-chart :option="chartOption" class="chart" autoresize />
    </el-card>

    <!-- 🚀 快捷入口 -->
    <el-card class="shortcut-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Menu /></el-icon>
          <span>快捷入口</span>
        </div>
      </template>
      <div class="shortcut-grid">
        <el-button v-for="(btn, i) in shortcuts" :key="i" type="primary" @click="go(btn.path)">
          <el-icon :size="18" class="mr-1"><component :is="btn.icon" /></el-icon>
          {{ btn.label }}
        </el-button>
      </div>
    </el-card>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, TrendCharts, Setting, User, Tools, Document } from '@element-plus/icons-vue'
import NoticeBar from '@/components/NoticeBar.vue'
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { LineChart } from "echarts/charts"
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from "echarts/components"
import VChart from "vue-echarts"
import { getStatistics, viewAllNumbers } from '@/api/admin.js'
import { ElMessage } from 'element-plus'
// 注册 ECharts 模块
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const router = useRouter()



// 访问所有数据
// 统计卡片
const stats = ref({
  totalBalance: 0,
  totalUsers: 0,
  totalNumbersReceived: 0,
  overallCodeRate: '0%'
})
async function loadStats() {
  const res = await getStatistics ()
  console.log(res,"主页面的所有数据")
  if (res.code===200) {
     const d = res.data
    stats.value = {
      totalPrice: d.totalPrice || 0, // ✅ 用接口字段 totalPrice
      totalUsers: d.totalUsers || 0,
      totalNumbersReceived: d.totalNumbersReceived || 0,
      overallCodeRate: d.overallCodeRate || '0%'
    }
    ElMessage.success(res.message)
  } else {
    ElMessage.error(res.message || '加载配置失败')
  }
}


// 折线图数据
const chartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { data: ['取号数', '回码数'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: [] },
  yAxis: { type: 'value' },
  series: [
    {
      name: '取号数',
      type: 'line',
      smooth: true,
      data: []
    },
    {
      name: '回码数',
      type: 'line',
      smooth: true,
      data: []
    }
  ]
})

// 模拟加载折线图数据
onMounted(() => { loadChart(7); loadStats() })

// 折线图：按天聚合“取号/回码”
async function loadChart(days = 7) {
  const today = new Date()
  const dayKeys = []
  const labels = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const y = d.getFullYear()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    dayKeys.push(`${y}-${m}-${dd}`)
    labels.push(`${m}-${dd}`)
  }

  const countFetch = Object.fromEntries(dayKeys.map(k => [k, 0]))
  const countReply = Object.fromEntries(dayKeys.map(k => [k, 0]))

  const startDate = dayKeys[0] + ' 00:00:00'
  const endDate = dayKeys[dayKeys.length - 1] + ' 23:59:59'
  const res = await viewAllNumbers({ startDate, endDate })
  const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || [])

  const toKey = (v) => {
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return ''
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dd}`
  }
  const isReplied = (it) => {
    const s = (it.status || it.state || '').toString().toLowerCase()
    if (['success', 'ok', 'done', 'replied'].includes(s)) return true
    if (it.hasCode === true) return true
    if (it.code || it.smsCode || it.verifyCode) return true
    return false
  }

  for (const it of list) {
    const cKey = toKey(it.createdAt || it.createTime || it.created_at || it.time)
    if (cKey && cKey in countFetch) countFetch[cKey]++
    if (isReplied(it)) {
      const rKey0 = toKey(it.updatedAt || it.updateTime || it.updated_at || it.replyTime)
      const rKey = rKey0 || cKey
      if (rKey && rKey in countReply) countReply[rKey]++
    }
  }

  chartOption.value.xAxis.data = labels
  chartOption.value.series[0].data = dayKeys.map(k => countFetch[k])
  chartOption.value.series[1].data = dayKeys.map(k => countReply[k])
}

// 快捷入口
const shortcuts = [
  { label: '用户管理', path: '/usermanage', icon: User },
  { label: '项目配置', path: '/projectmanage', icon: Tools },
  { label: '系统设置', path: '/systemconfig', icon: Setting },
  { label: '日志查看', path: '/errorlogs ', icon: Document },
]

// 跳转
function go(path) {
  router.push(path)
}
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}



.stat-card {
  flex: 1;
  text-align: center;
  padding: 15px 0;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  color: #666;
  margin-top: 6px;
}

.stats-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.chart-card {
  width: 100%;
}

.chart {
  height: 300px;
  width: 100%;
}

.shortcut-card { min-height: 300px; }
.shortcut-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); grid-auto-rows: 44px; gap: 10px; align-content: start; }

.mr-1 {
  margin-right: 6px;
}
</style>
