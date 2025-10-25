<template>
  <div class="system-config-page">
    <h2>系统配置</h2>
    <el-form label-width="180px" :model="config" v-loading="loading">
      <!-- 新增：系统通知配置 -->
      <el-form-item label="系统通知">
        <el-input
          v-model="config.systemNotice"
          type="textarea"
          :rows="3"
          placeholder="将在用户端展示的系统通知"
        />
      </el-form-item>
      
      <el-form-item label="号码筛选API的URL">
        <el-input v-model="config.filterApiUrl" placeholder="请输入筛选API地址" />
      </el-form-item>

      <el-form-item label="号码筛选API的密钥">
        <el-input v-model="config.filterApiKey" placeholder="请输入授权密钥或卡密" />
      </el-form-item>
      
      <el-form-item>
        <!-- 使用 slot="label" 增加提示信息 -->
        <template #label>
          <span>是否开启封禁模式</span>
          <el-tooltip content="开启后，系统将根据回码率和余额自动封禁不达标的用户" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
        <el-switch v-model="config.enableBanMode" :active-value="1" :inactive-value="0" />
      </el-form-item>

      <el-form-item label="24小时最低回码率 (%)">
        <el-input-number v-model="config.min24hCodeRate" :min="0" :max="100" :precision="2" :step="1" />
      </el-form-item>

      <el-form-item label="余额封控下限 (元)">
        <el-input-number v-model="config.balanceThreshold" :min="0" :precision="2" :step="1" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        <el-button @click="fetchConfig">重新加载</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSystemConfig, updateSystemConfig } from '@/api/admin.js'
import { QuestionFilled } from '@element-plus/icons-vue' // 引入图标

// 1. 【优化】初始化数据模型，使其与后端实体类和API响应的字段完全对应
const config = ref({
  configId: 1,
  systemNotice: '',
  filterApiUrl: '',
  filterApiKey: '',
  enableBanMode: 0,
  min24hCodeRate: 0.0,
  balanceThreshold: 0.00
})

const loading = ref(false)
const saving = ref(false)

// 2. 【优化】改造数据获取逻辑，增加数据格式转换
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getSystemConfig()
    if (res.code === 200 && res.data) {
      // 直接将API返回的数据赋值给响应式对象
      Object.assign(config.value, res.data)
      
      // 【关键】将小数比率转换为百分比，用于UI展示
      if (config.value.min24hCodeRate != null) {
        config.value.min24hCodeRate = Number((config.value.min24hCodeRate * 100).toFixed(2))
      }
      ElMessage.success('配置加载成功')
    } else {
      ElMessage.error(res.message || '获取配置失败')
    }
  } catch (err) {
    console.error('获取配置失败', err)
    ElMessage.error('获取配置失败，请检查网络或接口')
  } finally {
    loading.value = false
  }
}

// 3. 【优化】改造保存逻辑，在提交前进行数据格式转换
async function saveConfig() {
  saving.value = true
  
  // 创建一个用于提交的副本，避免直接修改UI绑定的数据
  const payload = JSON.parse(JSON.stringify(config.value))
  
  // 【关键】将UI的百分比转换回后端需要的小数比率
  if (payload.min24hCodeRate != null) {
    payload.min24hCodeRate = payload.min24hCodeRate / 100
  }
  
  try {
    const res = await updateSystemConfig(payload)
    if (res.code === 200) {
      ElMessage.success(res.message || '配置已保存并立即生效')
      // 保存成功后重新加载一次数据，确保前后端同步
      fetchConfig()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    console.error('保存配置失败', err)
    ElMessage.error('保存配置失败，请检查网络')
  } finally {
    saving.value = false
  }
}

// 4. 【优化】移除 `resetDefault` 方法，改为更实用的“重新加载”
//    恢复默认值的操作业务逻辑不明确，可能导致误操作。
//    改为从服务器重新拉取最新配置，逻辑更清晰。

// 页面初始化时加载配置
onMounted(fetchConfig)
</script>

<style scoped>
.system-config-page {
  padding: 24px;
  max-width: 700px; /* 适当加宽以容纳更长的标签 */
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

/* 为 el-form-item 的 label 旁的 tooltip 图标添加样式 */
.el-form-item__label .el-icon {
  margin-left: 4px;
  vertical-align: middle;
}
</style>