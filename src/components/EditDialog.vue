<template>
  <el-dialog v-model="visible" title="编辑用户" width="850px" @close="onClose" destroy-on-close>
    <el-form v-if="visible" :model="form" :rules="rules" ref="formRef" label-width="90px">
      <!-- 基本信息 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户名" prop="userName">
            <el-input v-model="form.userName" placeholder="请输入用户名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
            <el-form-item label="新密码" prop="password">
              <el-input v-model="form.password" placeholder="留空则不修改"/>
            </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" placeholder="再次输入新密码" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
            <el-form-item label="用户状态">
              <el-switch v-model="form.status" :active-value="0" :inactive-value="1" />
            </el-form-item>
        </el-col>
        <el-col :span="6">
            <el-form-item label="代理权限">
              <el-switch v-model="form.isAgent" :active-value="1" :inactive-value="0" />
            </el-form-item>
        </el-col>
      </el-row>
      
      <!-- 项目价格配置区域 -->
      <el-divider>项目价格配置</el-divider>

      <div style="display: flex; align-items: center; margin-bottom: 15px; gap: 10px;">
        <el-select
          v-model="selectedTemplateId"
          placeholder="选择模板批量修改售价"
          clearable
          style="width: 250px;"
          @change="applySelectedTemplate"
          :loading="templatesLoading"
        >
          <el-option
            v-for="template in priceTemplates"
            :key="template.id"
            :label="template.name"
            :value="template.id"
          />
        </el-select>
        <span style="color: #909399; font-size: 12px;">将使用模板价格覆盖下方匹配的项目。</span>
      </div>

      <!-- ==================== [MODIFIED] 更新表格列 ==================== -->
      <el-table :data="projectPrices" border max-height="350px" v-loading="pricesLoading">
        <el-table-column label="项目名称" prop="projectName" width="180" />
        <el-table-column label="项目ID" prop="projectId" align="center" width="80"/>
        <el-table-column label="线路ID" prop="lineId" align="center" width="80"/>
        <!-- <el-table-column label="成本(元)" prop="costPrice" align="center" width="90"/> -->
        <el-table-column label="最高售价(元)" prop="maxPrice" align="center" width="110"/>
        <el-table-column label="最低售价(元)" prop="minPrice" align="center" width="110"/>
        <el-table-column label="售价(元)" prop="price" min-width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="row.price"
              :precision="2"
              :step="0.1"
              :min="0"
              placeholder="设置售价"
              style="width: 100%;"
            />
          </template>
        </el-table-column>
      </el-table>
      <!-- ============================================================== -->

    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onCancel">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
// ==================== [MODIFIED] 导入 getProjectLis ====================
import { 
  updateUser, 
  getSubordinateUserProjectPrices, 
  updateUserProjectPrice,
  getAllPriceTemplates,
  getProjectLis
} from '@/api/admin.js'
// ======================================================================

const emit = defineEmits(['update:modelValue', 'updated', 'close'])
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: () => null },
})

const visible = ref(false)
const formRef = ref()
const saving = ref(false)

// 用户基本信息表单
const form = reactive({
  id: '',
  userName: '',
  password: '',
  confirmPassword: '',
  status: 0,
  isAgent: 0,
})

// 项目价格配置相关状态
const projectPrices = ref([])
const pricesLoading = ref(false)

// 价格模板相关状态
const priceTemplates = ref([])
const templatesLoading = ref(false)
const selectedTemplateId = ref(null)

// 表单校验规则 (保持不变)
const rules = reactive({
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (value && value.length < 6) {
          callback(new Error('密码长度至少为 6 位'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
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


// 监听 user prop 变化，重置表单并加载数据
watch(() => props.user, (newUser) => {
  if (newUser && newUser.id) {
    resetForm(newUser)
    // ==================== [MODIFIED] 更新数据加载逻辑 ====================
    loadInitialData(newUser.id)
    // ======================================================================
  }
}, { immediate: true, deep: true })


// 监听 v-model 的变化
watch(() => props.modelValue, (v) => {
  visible.value = v
}, { immediate: true })

watch(visible, (v) => {
  if (v !== props.modelValue) {
    emit('update:modelValue', v)
  }
})

// 封装表单重置逻辑
function resetForm(user) {
  form.id = user.id ?? ''
  form.userName = user.userName ?? ''
  form.status = user.status ?? 0
  form.isAgent = user.isAgent ?? 0
  form.password = ''
  form.confirmPassword = ''
  projectPrices.value = []
  selectedTemplateId.value = null
}

// ==================== [NEW] 统一的数据加载入口 ====================
/**
 * 加载所有初始化数据：用户价格、全局项目、价格模板
 * @param {number} userId 
 */
async function loadInitialData(userId) {
  pricesLoading.value = true;
  try {
    // 1. 并行发起所有必要的请求
    const [userPricesRes, allProjectsRes, templatesRes] = await Promise.all([
      getSubordinateUserProjectPrices(userId),
      getProjectLis({ pageSize: -1 }), // 获取所有项目
      getAllPriceTemplates()
    ]);

    const userPricesData = userPricesRes.data || [];
    const allProjectsData = allProjectsRes.data.records || [];
    priceTemplates.value = templatesRes.data || [];

    // 2. 创建一个用户已有价格的 Map，用于快速查找
    // Key: "projectId-lineId", Value: 用户的价格对象
    const userPriceMap = new Map(
      userPricesData.map(p => [`${p.projectId}-${p.lineId}`, p])
    );

    // 3. 遍历全局项目列表，生成最终的表格数据
    projectPrices.value = allProjectsData.map(globalProject => {
      const key = `${globalProject.projectId}-${globalProject.lineId}`;
      const existingUserPrice = userPriceMap.get(key);

      if (existingUserPrice) {
        // --- 情况一：用户已存在该项目的配置 ---
        // 合并数据：使用用户的价格，并从全局项目中更新最新信息
        return {
          ...existingUserPrice,
          projectName: globalProject.projectName, // 确保项目名是最新的
          price: existingUserPrice.agentPrice,    // 使用用户已有的代理价作为编辑售价
          maxPrice: globalProject.priceMax,       // 从全局项目获取最高价
          minPrice: globalProject.priceMin,       // 从全局项目获取最低价
          costPrice: globalProject.costPrice,          // 确保成本价也是最新的
        };
      } else {
        // --- 情况二：用户不存在该项目的配置 (新需求) ---
        // 创建一个新的默认配置，售价默认为最高价
        return {
          id: null, // 这是一个新条目，没有数据库ID
          projectTableId: null, // 同上
          projectId: globalProject.projectId,
          lineId: globalProject.lineId,
          projectName: globalProject.projectName,
          costPrice: globalProject.costPrice,
          maxPrice: globalProject.priceMax,
          minPrice: globalProject.priceMin,
          price: globalProject.priceMax, // 【核心】默认价格设置为最高售价
        };
      }
    });

  } catch (error) {
    ElMessage.error('加载项目价格配置失败');
    console.error("Data loading error:", error);
  } finally {
    pricesLoading.value = false;
  }
}

// [逻辑不变] 应用选中的价格模板
function applySelectedTemplate(templateId) {
  if (!templateId) return;

  const template = priceTemplates.value.find(t => t.id === templateId)
  if (!template || !template.items) {
    ElMessage.warning('模板数据无效')
    return
  }

  const priceMap = new Map(template.items.map(item => [`${item.projectId}-${item.lineId}`, item.price]))
  
  let appliedCount = 0
  projectPrices.value.forEach(proj => {
    const key = `${proj.projectId}-${proj.lineId}`
    if (priceMap.has(key)) {
      proj.price = priceMap.get(key) // 直接更新价格
      appliedCount++
    }
  })

  if (appliedCount > 0) {
    ElMessage.success(`成功应用模板，更新了 ${appliedCount} 个项目价格。`)
  } else {
    ElMessage.warning('模板中的项目与该用户的项目不匹配。')
  }
}

// [逻辑不变] 保存操作
async function onSave() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate() // 仅校验基本信息表单

    saving.value = true

    // 1. 准备更新用户基本信息的 Payload
    const userPayload = {
      id: form.id,
      userName: form.userName,
      status: form.status,
      isAgent: form.isAgent,
    }
    if (form.password) {
      userPayload.password = form.password
    }

    // 2. 准备更新用户价格配置的 Payload
    const pricesPayload = {
      userId: form.id,
      userName: form.userName,
      projectPrices: projectPrices.value.map(p => ({
        id: p.id,
        price: p.price,
        userProjectLineTableId: p.projectTableId,
        projectName: p.projectName,
        projectId: p.projectId,
        lineId: p.lineId,
        costPrice: p.costPrice,
        maxPrice: p.maxPrice,
        minPrice: p.minPrice,
      }))
    }

    // 3. 并行发起两个更新请求
    const [userResult, priceResult] = await Promise.all([
      updateUser(userPayload),
      updateUserProjectPrice(pricesPayload)
    ])

    const userSuccess = userResult && (userResult.code === 200 || userResult.ok)
    const priceSuccess = priceResult && (priceResult.code === 200 || priceResult.ok)

    if (userSuccess && priceSuccess) {
      ElMessage.success('用户信息和价格配置均已保存')
      emit('updated')
      visible.value = false
    } else {
      const errorMessages = []
      if (!userSuccess) errorMessages.push(`用户信息保存失败: ${userResult?.message || '未知错误'}`)
      if (!priceSuccess) errorMessages.push(`价格配置保存失败: ${priceResult?.message || '未知错误'}`)
      ElMessage.error(errorMessages.join('; '))
    }

  } catch (validationError) {
    ElMessage.warning('请检查表单输入项')
    console.log('Form validation failed:', validationError)
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