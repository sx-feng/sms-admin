<template>
  <div class="system-config-page">
    <h2>系统配置</h2>
    <el-form label-width="160px" :model="config">
      <el-form-item label="是否开启封禁模式">
        <el-switch v-model="config.banMode" />
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
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
        <el-button type="warning" @click="resetDefault">恢复默认配置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const config = ref({
  banMode: false,
  filterApi: '',
  filterKey: '',
  rateLimit: 20,
  balanceLimit: 5
})

function saveConfig() {
  // 模拟保存逻辑
  ElMessage.success('配置已保存并立即生效')
}

function resetDefault() {
  config.value = {
    banMode: false,
    filterApi: '',
    filterKey: '',
    rateLimit: 20,
    balanceLimit: 5
  }
  ElMessage.info('已恢复默认配置')
}
</script>
