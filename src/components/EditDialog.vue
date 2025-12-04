<template>
  <el-dialog v-model="visible" title="编辑用户" width="800px" @close="onClose" destroy-on-close>
    <el-form v-if="visible" :model="form" :rules="rules" ref="formRef" label-width="110px">
      <!-- 基本信息 (保持不变) -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户名" prop="userName">
            <el-input v-model="form.userName" placeholder="请输入用户名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="新密码" prop="password">
            <el-input v-model="form.password" placeholder="留空则不修改" show-password />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" placeholder="再次输入新密码" show-password />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="代理权限">
            <el-switch v-model="form.isAgent" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="用户状态">
        <el-radio-group v-model="form.status">
          <el-radio :label="0">正常启用</el-radio>
          <el-radio :label="1">禁用账户</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 项目配置区域 -->
      <el-divider>项目与价格配置</el-divider>

      <!-- 价格模板选择 -->
      <el-form-item label="价格模板" prop="templateId">
        <el-select 
          v-model="form.templateId" 
          placeholder="请选择价格模板" 
          clearable 
          filterable 
          style="width: 100%;"
          :loading="dataLoading"
        >
          <el-option 
            v-for="template in priceTemplates" 
            :key="template.id" 
            :label="template.name"
            :value="template.id" 
          />
        </el-select>
        <div style="font-size: 12px; color: #909399; margin-top: 5px;">
          修改模板将重置下方列表。您可以针对特定项目进行禁用操作（加入黑名单）。
        </div>
      </el-form-item>

      <!-- 表格区域：包含价格预览和黑名单操作 -->
      <div v-if="form.templateId" style="padding: 0 20px 20px 20px;">
        <!-- 增加一个搜索框，方便在列表中查找项目 -->
        <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项目ID..."
            prefix-icon="Search"
            style="width: 250px;"
            clearable
          />
        </div>

        <el-table 
          :data="filteredPreviewPrices" 
          border 
          stripe 
          size="small" 
          height="350"
          v-loading="previewLoading" 
          empty-text="该模板暂无配置项"
        >
          <el-table-column prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="projectId" label="项目ID" width="80" align="center" />
          <el-table-column prop="lineId" label="线路" width="70" align="center" />
          
          <el-table-column prop="price" label="模板售价" width="90" align="center">
            <template #default="{ row }">
              <span style="color: #E6A23C; font-weight: bold;">{{ row.price }}</span>
            </template>
          </el-table-column>
          
          <!-- 新增：状态列 -->
          <el-table-column label="当前用户项目权限" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="isBlacklisted(row)" type="danger" size="small" effect="dark">已禁用</el-tag>
              <el-tag v-else type="success" size="small" effect="plain">正常</el-tag>
            </template>
          </el-table-column>

          <!-- 新增：操作列 -->
          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-button 
                v-if="!isBlacklisted(row)"
                type="danger" 
                link 
                size="small" 
                @click="toggleBlacklist(row)"
              >
                加入黑名单
              </el-button>
              <el-button 
                v-else
                type="primary" 
                link 
                size="small" 
                @click="toggleBlacklist(row)"
              >
                移除黑名单
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onCancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存修改</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue' // 引入图标
import {
  updateUser,
  getAllPriceTemplates,
  getUserConfigInfo,
  getTemplateItems
} from '@/api/admin.js' // 注意：这里移除了 getProjectLis，因为不再需要全量加载

const emit = defineEmits(['update:modelValue', 'updated', 'close'])
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: () => null },
})

const visible = ref(false)
const formRef = ref()
const saving = ref(false)
const dataLoading = ref(false)

const previewPrices = ref([])
const previewLoading = ref(false)
const priceTemplates = ref([])
// const allProjects = ref([]) // 移除：不再需要加载全量项目列表

// 本地搜索关键词
const searchKeyword = ref('')

const form = reactive({
  id: '',
  userName: '',
  password: '',
  confirmPassword: '',
  status: 0,
  isAgent: 0,
  templateId: null,
  blacklistedProjects: [] // 存储格式 ['projectId-lineId', ...]
})

const rules = reactive({
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择一个价格模板', trigger: 'change' }],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (form.password && !value) {
          callback(new Error('请再次输入新密码'))
        } else if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
})

// 计算属性：前端过滤表格数据
const filteredPreviewPrices = computed(() => {
  if (!searchKeyword.value) return previewPrices.value
  const kw = searchKeyword.value.toLowerCase()
  return previewPrices.value.filter(item => {
    return (
      (item.projectName && item.projectName.toLowerCase().includes(kw)) ||
      String(item.projectId).includes(kw) ||
      String(item.lineId).includes(kw)
    )
  })
})

// 监听模板ID变化，加载预览数据
watch(() => form.templateId, async (newVal) => {
  if (newVal) {
    previewLoading.value = true
    try {
      const res = await getTemplateItems(newVal)
      previewPrices.value = res.data || []
    } catch (e) {
      console.error(e)
      previewPrices.value = []
    } finally {
      previewLoading.value = false
    }
  } else {
    previewPrices.value = []
  }
})

watch(() => props.user, (newUser) => {
  if (newUser && newUser.id) {
    resetForm(newUser)
    loadInitialData(newUser.id)
  }
}, { immediate: true, deep: true })

watch(() => props.modelValue, (v) => {
  visible.value = v
}, { immediate: true })

watch(visible, (v) => {
  if (v !== props.modelValue) {
    emit('update:modelValue', v)
  }
  if (!v) {
    searchKeyword.value = '' // 关闭时清空搜索
  }
})

function resetForm(user) {
  form.id = user.id ?? ''
  form.userName = user.userName ?? ''
  form.status = user.status ?? 0
  form.isAgent = user.isAgent ?? 0
  form.password = ''
  form.confirmPassword = ''
  form.templateId = user.templateId || null
  form.blacklistedProjects = []
  searchKeyword.value = ''
}

// 辅助函数：判断行是否在黑名单中
function isBlacklisted(row) {
  const key = `${row.projectId}-${row.lineId}`
  return form.blacklistedProjects.includes(key)
}

// 核心逻辑：切换黑名单状态
function toggleBlacklist(row) {
  const key = `${row.projectId}-${row.lineId}`
  const index = form.blacklistedProjects.indexOf(key)
  
  if (index > -1) {
    // 存在 -> 移除 (解禁)
    form.blacklistedProjects.splice(index, 1)
  } else {
    // 不存在 -> 添加 (禁用)
    form.blacklistedProjects.push(key)
  }
}

async function loadInitialData(userId) {
  dataLoading.value = true
  try {
    // 移除 getProjectLis，减少一次网络请求，提高弹窗速度
    const [templatesRes, userConfigRes] = await Promise.all([
      getAllPriceTemplates(),
      getUserConfigInfo({ userId: userId })
    ])

    priceTemplates.value = templatesRes.data || []
    const config = userConfigRes.data || {}

    if (config.templateId) {
      form.templateId = config.templateId
    }

    // 解析黑名单字符串
    if (config.blacklist && typeof config.blacklist === 'string') {
      form.blacklistedProjects = config.blacklist.split(',')
    } else {
      form.blacklistedProjects = []
    }

  } catch (error) {
    console.error('加载数据失败', error)
    ElMessage.error('加载用户配置信息失败')
  } finally {
    dataLoading.value = false
  }
}

async function onSave() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    saving.value = true

    const userPayload = {
      id: form.id,
      username: form.userName,
      status: form.status,
      isAgent: form.isAgent === 1,
      templateId: form.templateId,
      blacklistedProjects: form.blacklistedProjects // 后端接收List<String>
    }
    
    if (form.password) {
      userPayload.password = form.password
    }

    const res = await updateUser(userPayload)

    if (res && (res.code === 200 || res.ok)) {
      ElMessage.success('用户信息更新成功')
      emit('updated')
      visible.value = false
    } else {
      ElMessage.error(res?.message || '更新失败')
    }

  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

function onCancel() {
  visible.value = false
}
function onClose() {
  emit('close')
}
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
/* 可选：让表格内的按钮更紧凑 */
:deep(.el-table .cell) {
  padding: 0 8px;
}
</style>