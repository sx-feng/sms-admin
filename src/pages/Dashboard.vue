<template>
  <div class="dashboard">
    <NoticeBar />
    <div class="stats-row">
      <el-card v-for="item in [
        { label: '💰 总余额', value: stats.totalPrice },
        { label: '👥 用户数', value: stats.totalUsers },
        { label: '🔢 总号码数', value: stats.totalNumbersReceived },
        { label: '📈 总体回码率', value: stats.overallCodeRate }
      ]" :key="item.label" class="stat-card" shadow="hover">
        <div class="stat-value">
          {{ typeof item.value === 'number' ? item.value.toFixed(2) : item.value }}
        </div>
        <div class="stat-label">{{ item.label }}</div>
      </el-card>
    </div>
    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon>
            <TrendCharts />
          </el-icon>
          <span>每日号码 / 验证码数量趋势</span>
        </div>
      </template>
      <v-chart :option="chartOption" class="chart" autoresize />
    </el-card>
    <el-card class="shortcut-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon>
            <Menu />
          </el-icon>
          <span>快捷入口</span>
        </div>
      </template>
      <div class="shortcut-grid">
        <el-button v-for="(btn, i) in shortcuts" :key="i" type="primary" @click="go(btn.path)">
          <el-icon :size="18" class="mr-1">
            <component :is="btn.icon" />
          </el-icon>
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
import { getStatistics, getDailyStats } from '@/api/admin.js'
import { ElMessage } from 'element-plus'

// 注册 ECharts 模块
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const router = useRouter()

// 统计卡片
const stats = ref({
  totalPrice: 0,
  totalUsers: 0,
  totalNumbersReceived: 0,
  overallCodeRate: '0%'
})

async function loadStats() {
  try {
    const res = await getStatistics()
    console.log(res, "主页面的所有数据")
    if (res.code === 200) {
      const d = res.data
      stats.value = {
        totalPrice: d.totalPrice || 0,
        totalUsers: d.totalUsers || 0,
        totalNumbersReceived: d.totalNumbersReceived || 0,
        overallCodeRate: d.overallCodeRate || '0%'
      }
      // ElMessage.success(res.message) // 建议在非关键数据加载时，成功提示可以省略，避免过多打扰
    } else {
      ElMessage.error(res.message || '加载统计数据失败')
    }
  } catch (error) {
    ElMessage.error('加载统计数据时发生网络错误')
    console.error(error)
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

async function loadChart(days = 7) {
  try {
    const res = await getDailyStats({ days })
    if (res.code !== 200 || !Array.isArray(res.data)) {
      ElMessage.error(res.message || '加载图表数据失败')
      return
    }

    // 将返回的数组数据转换为 Map 以便按日期快速查找
    const statsMap = new Map(res.data.map(item => [item.date, item]))

    // 生成最近 'days' 天的日期标签，确保 X 轴的连续性
    const labels = []
    const dateKeys = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const dd = `${d.getDate()}`.padStart(2, '0')
      dateKeys.push(`${y}-${m}-${dd}`)
      labels.push(`${m}-${dd}`)
    }

    // 根据日期序列，从 Map 中获取数据，如果某天没有数据则补 0
    const numberCounts = dateKeys.map(key => statsMap.get(key)?.numberCount || 0)
    // 假设 API 返回的数据中包含 codeCount 字段代表回码数
    const codeCounts = dateKeys.map(key => statsMap.get(key)?.codeCount || 0)

    // 更新图表配置
    chartOption.value.xAxis.data = labels
    chartOption.value.series[0].data = numberCounts
    chartOption.value.series[1].data = codeCounts

  } catch (error) {
    console.error("加载图表数据时出错:", error)
    ElMessage.error('加载图表数据时发生网络错误')
  }
}


// 页面加载时执行
onMounted(() => {
  loadStats()
  loadChart(7) // 默认加载最近7天的数据
})


// 快捷入口
const shortcuts = [
  { label: '用户管理', path: '/usermanage', icon: User },
  { label: '项目配置', path: '/projectmanage', icon: Tools },
  { label: '系统设置', path: '/systemconfig', icon: Setting },
  { label: '日志查看', path: '/errorlogs', icon: Document },
  { label: '号码管理', path: '/usernumbermanage', icon: TrendCharts },
  { label: '账单管理', path: '/billManage', icon: TrendCharts }
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
  border: 2px solid #6abae9;
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

.shortcut-card {
  min-height: 300px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: 44px;
  gap: 10px;
  align-content: start;
}

.mr-1 {
  margin-right: 6px;
}
</style>
