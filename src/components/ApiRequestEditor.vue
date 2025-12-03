<template>
  <div class="api-editor">
    <!-- 第一行：方法、URL、调试按钮 -->
    <div class="url-bar">
      <el-select v-model="localConfig.method" style="width: 110px" placeholder="Method">
        <el-option value="GET" label="GET" />
        <el-option value="POST" label="POST" />
        <el-option value="PUT" label="PUT" />
        <el-option value="DELETE" label="DELETE" />
      </el-select>
      
      <el-input 
        v-model="localConfig.url" 
        placeholder="输入接口地址 (支持变量如 {{token}}，例如： https://api.example.com/user?token={{token }})" 
        class="url-input"
        @keyup.enter="handleDebug"
      >
        <template #prepend>URL</template>
      </el-input>

      <!-- 调试按钮 -->
      <el-button 
        type="primary" 
        color="#626aef" 
        :loading="debugLoading" 
        @click="handleDebug"
      >
        <el-icon style="margin-right: 5px"><VideoPlay /></el-icon> 调试
      </el-button>
    </div>

    <!-- 第二行：配置 Tabs -->
    <el-tabs v-model="activeTab" type="border-card" class="config-tabs">
      
      <!-- 0. 前置操作 -->
      <el-tab-pane label="前置操作" name="preHooks">
         <el-alert title="在请求发送前设置或计算变量" type="warning" :closable="false" style="margin-bottom:10px;" />
         <key-value-editor v-model="localConfig.preHooks" />
      </el-tab-pane>

      <!-- 1. Query 参数 -->
      <el-tab-pane label="Params (Query)" name="params">
        <key-value-editor v-model="localConfig.params" />
      </el-tab-pane>

      <!-- 2. Body 请求体 -->
      <el-tab-pane label="Body" name="body">
        <el-radio-group v-model="localConfig.bodyType" style="margin-bottom: 10px;">
          <el-radio label="NONE">无</el-radio>
          <el-radio label="JSON">JSON</el-radio>
          <el-radio label="FORM_DATA">Form Data</el-radio>
          <el-radio label="X_WWW_FORM">x-www-form-urlencoded</el-radio>
        </el-radio-group>

        <!-- JSON 编辑器 -->
        <div v-if="localConfig.bodyType === 'JSON'">
          <el-input
            v-model="localConfig.jsonBody"
            type="textarea"
            :rows="6"
            placeholder='{ "key": "value" }'
            style="font-family: monospace;"
          />
        </div>

        <!-- 表单编辑器 -->
        <div v-if="['FORM_DATA', 'X_WWW_FORM'].includes(localConfig.bodyType)">
          <key-value-editor v-model="localConfig.formBody" />
        </div>
      </el-tab-pane>

      <!-- 3. Headers -->
      <el-tab-pane label="Headers" name="headers">
        <key-value-editor v-model="localConfig.headers" />
      </el-tab-pane>

      <!-- 4. 变量提取 -->
      <el-tab-pane label="后置操作 (提取变量)" name="extract">
        <el-alert title="从响应中提取数据存为变量" type="info" :closable="false" style="margin-bottom:10px;" />
        
        <el-table :data="localConfig.extractRules" border style="width: 100%">
          <el-table-column label="变量名称" width="180">
            <template #default="{ row }">
              <el-input v-model="row.targetVariable" placeholder="如: token" />
            </template>
          </el-table-column>
          <el-table-column label="来源" width="120">
            <template #default="{ row }">
              <el-select v-model="row.source">
                <el-option label="JSON Body" value="BODY" />
                <el-option label="Header" value="HEADER" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="JSONPath / 表达式">
            <template #default="{ row }">
              <el-input v-model="row.jsonPath" placeholder="如: $.data.access_token" />
            </template>
          </el-table-column>
          <el-table-column width="60" align="center" label="操作">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeRule($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 5px;">
           <el-button type="primary" link @click="addRule">+ 添加提取规则</el-button>
        </div>
      </el-tab-pane>

      <!-- 5. 调试结果 -->
      <el-tab-pane name="response">
        <template #label>
          <span style="display: flex; align-items: center;">
            调试结果
            <el-tag v-if="debugResponse" size="small" :type="debugResponse.status === 200 ? 'success' : 'danger'" style="margin-left: 5px; height: 16px; line-height: 14px; padding: 0 4px;">
              {{ debugResponse.status }}
            </el-tag>
          </span>
        </template>

        <div v-loading="debugLoading" element-loading-text="请求中...">
          <el-empty v-if="!debugResponse && !debugLoading" description="点击上方“调试”按钮开始请求" :image-size="80" />
          
          <div v-if="debugResponse" class="response-container">
            <!-- 状态行 -->
            <div class="status-bar">
              <div class="status-item">
                <span class="label">Status:</span>
                <span :class="['value', debugResponse.status === 200 ? 'success' : 'error']">
                  {{ debugResponse.status }}
                </span>
              </div>
              <div class="status-item">
                <span class="label">Time:</span>
                <span class="value">{{ debugResponse.time }} ms</span>
              </div>
              <div class="status-item" style="flex: 1; text-align: right; color: #909399; font-size: 12px;">
                 {{ new Date().toLocaleTimeString() }}
              </div>
            </div>

            <!-- 响应内容 Tabs -->
            <el-tabs type="card" style="margin-top: 10px;">
              <el-tab-pane label="Body (响应体)">
                
                <!-- 视图切换开关 -->
                <div class="view-mode-switch">
                  <el-radio-group v-model="responseViewMode" size="small">
                    <el-radio-button label="raw">Raw (源码)</el-radio-button>
                    <el-radio-button label="preview">Preview (结构预览)</el-radio-button>
                  </el-radio-group>
                  <span v-if="responseViewMode === 'preview'" class="tip-text">
                    <el-icon><InfoFilled /></el-icon> 点击对应行可快速生成提取规则
                  </span>
                </div>

                <!-- 纯文本模式 -->
                <el-input 
                  v-if="responseViewMode === 'raw'"
                  v-model="debugResponse.bodyStr" 
                  type="textarea" 
                  :rows="12" 
                  readonly 
                  style="font-family: monospace;"
                />

                <!-- 结构化预览模式 (新增核心功能) -->
                <div v-else class="json-preview-container">
                  <el-table 
                    :data="flattenedJsonData" 
                    border 
                    size="small" 
                    height="300px" 
                    highlight-current-row
                    @row-click="openExtractDialog"
                    style="width: 100%; cursor: pointer;"
                  >
                    <el-table-column prop="path" label="Key / Path" min-width="180">
                      <template #default="{ row }">
                        <el-tag size="small" type="info" effect="plain" style="font-family: monospace;">{{ row.path }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="value" label="Value">
                      <template #default="{ row }">
                        <span style="color: #409EFF;" v-if="typeof row.value === 'string'">"{{ row.value }}"</span>
                        <span style="color: #E6A23C;" v-else-if="typeof row.value === 'number'">{{ row.value }}</span>
                        <span style="color: #F56C6c;" v-else-if="typeof row.value === 'boolean'">{{ row.value }}</span>
                        <span style="color: #909399;" v-else>{{ row.value }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="80" align="center">
                      <template #default>
                        <el-icon color="#409EFF"><Plus /></el-icon>
                      </template>
                    </el-table-column>
                  </el-table>
                  <div v-if="flattenedJsonData.length === 0" style="padding: 20px; text-align: center; color: #999;">
                    无法解析 JSON 或内容为空
                  </div>
                </div>

              </el-tab-pane>
              <el-tab-pane label="Headers (响应头)">
                 <div class="headers-view">
                   <div v-for="(val, key) in debugResponse.headers" :key="key" class="header-row">
                     <span class="header-key">{{ key }}:</span>
                     <span class="header-val">{{ val }}</span>
                   </div>
                 </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增：提取变量确认弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加提取规则"
      width="400px"
      append-to-body
    >
      <el-form :model="tempRule" label-position="top">
        <el-form-item label="JSONPath (自动生成)">
          <el-input v-model="tempRule.jsonPath" readonly />
        </el-form-item>
        <el-form-item label="当前值预览">
          <el-input v-model="tempRule.previewValue" disabled />
        </el-form-item>
        <el-form-item label="变量名称 (Variable Name)" required>
          <el-input v-model="tempRule.targetVariable" placeholder="例如: access_token" v-focus />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAddRule">确定添加</el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { VideoPlay, InfoFilled, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import KeyValueEditor from './KeyValueEditor.vue'
import { ApiRequest } from '@/api/admin' // 假设的API路径

// 自定义指令：自动聚焦 (v-focus)
const vFocus = {
  mounted: (el) => el.querySelector('input')?.focus()
}

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      url: '',
      method: 'GET',
      params: [],
      headers: [],
      bodyType: 'NONE',
      jsonBody: '',
      formBody: [],
      extractRules: [],
      preHooks: [] 
    })
  }
})

const emit = defineEmits(['update:modelValue'])

const localConfig = ref(JSON.parse(JSON.stringify(props.modelValue)))
const activeTab = ref('params')
const debugLoading = ref(false)
const debugResponse = ref(null)

// 新增状态：响应视图模式
const responseViewMode = ref('raw') 
// 新增状态：弹窗控制
const dialogVisible = ref(false)
const tempRule = ref({
  jsonPath: '',
  previewValue: '',
  targetVariable: ''
})

watch(localConfig, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

watch(() => props.modelValue, (newVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(localConfig.value)) {
    localConfig.value = JSON.parse(JSON.stringify(newVal))
  }
}, { deep: true })

// ---------------------------------------------------------
// 核心逻辑 1：将 JSON 拍平成路径列表 ($.a.b: value)
// ---------------------------------------------------------
const flattenedJsonData = computed(() => {
  if (!debugResponse.value || !debugResponse.value.bodyStr) return []
  
  try {
    const jsonObj = JSON.parse(debugResponse.value.bodyStr)
    const result = []

    // 递归函数
    const traverse = (obj, path) => {
      if (obj !== null && typeof obj === 'object') {
        // 如果是数组
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            traverse(item, `${path}[${index}]`)
          })
        } else {
          // 如果是对象
          Object.keys(obj).forEach(key => {
            // 处理特殊字符 key，如果包含点或空格，可能需要用 ['key'] 格式，这里简化处理
            traverse(obj[key], `${path}.${key}`)
          })
        }
      } else {
        // 基本类型（String, Number, Boolean, null）
        result.push({
          path: path,
          value: obj
        })
      }
    }

    traverse(jsonObj, '$') // JSONPath 通常以 $ 开头
    return result
  } catch (e) {
    // 解析失败则返回空，界面会提示
    return []
  }
})

// ---------------------------------------------------------
// 核心逻辑 2：点击行，打开提取配置弹窗
// ---------------------------------------------------------
const openExtractDialog = (row) => {
  tempRule.value = {
    jsonPath: row.path,
    previewValue: String(row.value),
    targetVariable: '' // 留空让用户填
  }
  dialogVisible.value = true
}

const confirmAddRule = () => {
  if (!tempRule.value.targetVariable) {
    ElMessage.warning('请输入变量名称')
    return
  }

  // 添加到规则列表
  if (!localConfig.value.extractRules) localConfig.value.extractRules = []
  
  localConfig.value.extractRules.push({
    targetVariable: tempRule.value.targetVariable,
    source: 'BODY',
    jsonPath: tempRule.value.jsonPath
  })

  dialogVisible.value = false
  ElMessage.success(`已添加规则: ${tempRule.value.targetVariable}`)
  
  // 可选：自动跳转到提取 Tab 查看
  // activeTab.value = 'extract' 
}

// 通用的规则操作
const addRule = () => {
  if (!localConfig.value.extractRules) localConfig.value.extractRules = []
  localConfig.value.extractRules.push({ targetVariable: '', source: 'BODY', jsonPath: '' })
}
const removeRule = (index) => {
  localConfig.value.extractRules.splice(index, 1)
}

// ---------------------------------------------------------
// 调试逻辑
// ---------------------------------------------------------
const handleDebug = async () => {
  if (!localConfig.value.url) {
    ElMessage.warning('请输入接口 URL')
    return
  }
  activeTab.value = 'response'
  debugLoading.value = true
  debugResponse.value = null

  // 每次重新调试，默认切回 raw 视图，或者保持 preview
  // responseViewMode.value = 'raw' 

  try {
    const startTime = Date.now()
    const proxyPayload = {
      url: localConfig.value.url,
      method: localConfig.value.method,
      headers: localConfig.value.headers,
      params: localConfig.value.params,
      bodyType: localConfig.value.bodyType,
      jsonBody: localConfig.value.jsonBody,
      formBody: localConfig.value.formBody
    }

    const res = await ApiRequest(proxyPayload)
    const endTime = Date.now()
    
    let responseBody = res.raw !== undefined ? res.raw : res.data
    // 尝试格式化 JSON 字符串
    if (typeof responseBody === 'string') {
        try {
            const parsed = JSON.parse(responseBody);
            responseBody = JSON.stringify(parsed, null, 2);
        } catch (e) { /* ignore */ }
    } else if (typeof responseBody === 'object') {
        responseBody = JSON.stringify(responseBody, null, 2)
    }

    debugResponse.value = {
      status: res.status,
      time: endTime - startTime,
      headers: res.headers || {}, // 确保 headers 存在
      bodyStr: responseBody
    }

  } catch (error) {
    debugResponse.value = {
      status: error.response?.status || 500,
      time: 0,
      headers: {},
      bodyStr: '请求失败: ' + (error.message || '未知错误')
    }
  } finally {
    debugLoading.value = false
  }
}
</script>

<style scoped>
.api-editor {
  border: 1px solid #dcdfe6;
  padding: 15px;
  border-radius: 4px;
  background-color: #f5f7fa;
}
.url-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.url-input {
  flex: 1;
}
.config-tabs {
  background-color: #fff;
  min-height: 400px; 
}

/* 调试结果样式 */
.response-container {
  display: flex;
  flex-direction: column;
}
.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 12px;
  background-color: #f4f4f5;
  border-radius: 4px;
  border: 1px solid #e9e9eb;
  margin-bottom: 10px;
}
.status-item {
  font-size: 14px;
}
.status-item .label {
  color: #909399;
  margin-right: 5px;
}
.status-item .value {
  font-weight: 600;
}
.status-item .value.success { color: #67c23a; }
.status-item .value.error { color: #f56c6c; }

/* 视图切换 */
.view-mode-switch {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.tip-text {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* JSON 预览表格容器 */
.json-preview-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.headers-view {
  background: #fafafa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #eee;
  max-height: 300px;
  overflow-y: auto;
}
.header-row {
  display: flex;
  border-bottom: 1px dashed #eee;
  padding: 4px 0;
  font-size: 12px;
}
.header-key {
  font-weight: bold;
  color: #606266;
  width: 150px;
  flex-shrink: 0;
}
.header-val {
  color: #303133;
  word-break: break-all;
}
</style>