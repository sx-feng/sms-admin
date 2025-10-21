<template>
  <div class="system-config-page">
    <h2>系统配置</h2>
    <el-form label-width="160px" :model="config" v-loading="loading">
      <el-form-item label="是否开启封禁模式">
        <el-switch v-model="config.banMode" :active-value="1" :inactive-value="0" />
      </el-form-item>

      <el-form-item label="筛选 API">
        <el-input v-model="config.filterApi" placeholder="请输入筛选API地址" />
      </el-form-item>

      <el-form-item label="筛选卡密">
        <el-input v-model="config.filterKey" placeholder="请输入授权密钥" />
      </el-form-item>

      <el-form-item label="24小时回码率限制">
        <el-input-number v-model="config.rateLimit" :min="0" :max="100" /> %
      </el-form-item>

      <el-form-item label="余额封控下限">
        <el-input-number v-model="config.balanceLimit" :min="0" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        <el-button type="warning" @click="resetDefault">恢复默认配置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, updateSystemConfig } from '@/api/admin.js'

const config = ref({
  banMode: 0,
  filterApi: '',
  filterKey: '',
  rateLimit: 20,
  balanceLimit: 5
})

const loading = ref(false)
const saving = ref(false)

// ✅ 页面加载时自动拉取配置
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getSystemConfig()
    if (res.ok || res.code === 200) {
      // 防止空对象出错
      Object.assign(config.value, res.data || {})
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

// ✅ 保存配置
async function saveConfig() {
  saving.value = true
  try {
    const res = await updateSystemConfig(config.value)
    if (res.ok || res.code === 200) {
      ElMessage.success(res.message || '配置已保存并立即生效')
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

// ✅ 恢复默认配置
function resetDefault() {
  config.value = {
    banMode: 0,
    filterApi: '',
    filterKey: '',
    rateLimit: 20,
    balanceLimit: 5
  }
  ElMessage.info('已恢复默认配置（未保存）')
}

// 页面初始化
onMounted(fetchConfig)
</script>

<style scoped>
.system-config-page {
  padding: 20px;
  max-width: 600px;
  border: 2px solid #6abae9;
}
</style>
