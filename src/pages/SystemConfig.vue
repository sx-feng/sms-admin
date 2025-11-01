<template>
  <div class="system-config-page">
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
    <h2>系统配置</h2>
    <el-form label-width="220px" :model="config" v-loading="loading">
      
      <!-- ==================== 基础配置 ==================== -->
      <el-divider content-position="left">基础配置</el-divider>
      <el-form-item label="系统通知">
        <el-input
          v-model="config.systemNotice"
          type="textarea"
          :rows="3"
          placeholder="将在用户端展示的系统通知"
        />
      </el-form-item>

      <!-- ==================== 封禁风控配置 ==================== -->
      <el-divider content-position="left">封禁风控</el-divider>
      <el-form-item>
        <template #label>
          <span>是否开启自动封禁模式</span>
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

      <!-- ==================== 号码筛选API配置 ==================== -->
      <el-divider content-position="left">号码筛选</el-divider>
      <el-form-item label="是否开启号码筛选功能">
         <template #label>
          <span>是否开启号码筛选功能</span>
          <el-tooltip content="开启后，用户在获取号码时将通过外部API进行筛选" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
        <el-switch v-model="config.enableNumberFiltering" :active-value="true" :inactive-value="false" />
      </el-form-item>
      
      <!-- 条件渲染：只有当开启号码筛选时，才显示以下详细配置 -->
      <div v-if="config.enableNumberFiltering" class="api-config-group">
        <!-- <el-form-item label="筛选API的URL">
          <el-input v-model="config.filterApiUrl" placeholder="请输入筛选API的完整请求地址" />
        </el-form-item> -->

        <el-form-item label="筛选API的密钥">
          <el-input v-model="config.filterApiKey" placeholder="请输入授权密钥(Key)或卡密" show-password />
        </el-form-item>

        <!-- <el-form-item label="请求方法">
          <el-select v-model="config.selectNumberApiRouteMethod" placeholder="请选择API请求方法">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
          </el-select>
        </el-form-item> -->

        <!-- <el-form-item label="请求参数类型">
           <template #label>
            <span>请求参数类型</span>
            <el-tooltip placement="top">
              <template #content>
                - PARAM: 参数将以 a=1&b=2 的形式附加到URL或表单中<br/>
                - JSON: 参数将以 JSON 格式放在请求体中发送
              </template>
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-select v-model="config.selectNumberApiReauestType" placeholder="请选择参数类型">
            <el-option 
              v-for="item in requestTypeOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item> -->

        <!-- <el-form-item label="请求字段/值">
          <template #label>
            <span>请求字段/值</span>
            <el-tooltip content="根据上方选择的参数类型，填写对应的参数内容。例如，JSON类型可填写：{'phone':'%s'}" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-input 
            v-model="config.selectNumberApiReauestValue" 
            type="textarea"
            :rows="3"
            placeholder="请输入请求的参数，可使用 %s 作为手机号占位符" 
          />
        </el-form-item> -->

        <!-- <el-form-item label="响应解析字段">
           <template #label>
            <span>响应解析字段</span>
            <el-tooltip content="指定从API返回的JSON数据中，哪个字段代表筛选结果。例如：data.status" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-input v-model="config.responseSelectNumberApiField" placeholder="例如：data.status" />
        </el-form-item> -->
      </div>

      <!-- ==================== 操作按钮 ==================== -->
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        <el-button @click="fetchConfig">重新加载</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSystemConfig, updateSystemConfig } from '@/api/admin.js'
import { QuestionFilled } from '@element-plus/icons-vue'

// 【V1. 变更】初始化数据模型，与后端SystemConfig实体类完全对应
const config = ref({
  configId: 1,
  systemNotice: '系统通知',
  // 封禁风控
  enableBanMode: 0,
  min24hCodeRate: 0.0,
  balanceThreshold: 0.00,
  // 号码筛选
  enableNumberFiltering: false, // 对应后端的 Boolean enableNumberFiltering
  filterApiUrl: '',
  filterApiKey: '',
  selectNumberApiRouteMethod: 'GET', // 默认值
  selectNumberApiReauestType: 'PARAM', // 默认值，对应 RequestType 枚举
  selectNumberApiReauestValue: '',
  responseSelectNumberApiField: '',
})

// 【V2. 新增】为 selectNumberApiReauestType 提供选项
const requestTypeOptions = [
  { value: 'PARAM', label: 'PARAM (Query/Form)' },
  { value: 'JSON', label: 'JSON (Request Body)' }
]

const loading = ref(false)
const saving = ref(false)

// 数据获取逻辑
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getSystemConfig()
    if (res.code === 200 && res.data) {
      Object.assign(config.value, res.data)
      
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

// 保存逻辑
async function saveConfig() {
  saving.value = true
  const payload = JSON.parse(JSON.stringify(config.value))
  
  if (payload.min24hCodeRate != null) {
    payload.min24hCodeRate = payload.min24hCodeRate / 100
  }
  
  try {
    const res = await updateSystemConfig(payload)
    if (res.code === 200) {
      ElMessage.success(res.message || '配置已保存并立即生效')
      fetchConfig() // 保存成功后重新加载，确保数据同步
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

// 页面初始化时加载配置
onMounted(fetchConfig)
</script>

<style scoped>
.system-config-page {
  padding: 24px;
  max-width: 800px; /* 适当加宽以容纳更长的标签 */
  margin: 20px auto; /* 居中显示 */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.el-form-item__label .el-icon {
  margin-left: 4px;
  vertical-align: middle;
  cursor: pointer;
}

.api-config-group {
  padding: 10px 20px;
  margin-left: 20px; /* 轻微缩进，视觉上分组 */
  border-left: 3px solid #e0e0e0;
  transition: all 0.3s ease; /* 添加过渡效果 */
}

/* 分割线样式 */
.el-divider--horizontal {
  margin: 32px 0;
}
</style>