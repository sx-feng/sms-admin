<template>
  <el-dialog v-model="visible" title="编辑用户" width="520px" @close="onClose">
    <!-- 使用 :key 来确保每次打开弹窗时，表单状态都是全新的 -->
    <el-form v-if="visible" :model="form" :rules="rules" ref="formRef" label-width="90px">
      <el-form-item label="用户ID">
        <!-- 统一使用 id 字段 -->
        <el-input :model-value="form.id" disabled />
      </el-form-item>
      <!-- prop 对应 form 的字段名，label 对应 Java 实体类注释 -->
      <el-form-item label="用户名" prop="userName">
        <el-input v-model="form.userName" placeholder="请输入用户名" />
      </el-form-item>
      <!-- <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" placeholder="可选" />
      </el-form-item> -->
      <el-form-item label="新密码" prop="password">
        <el-input v-model="form.password" type="password" placeholder="留空则不修改" show-password />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" show-password />
      </el-form-item>
      <el-form-item label="启用状态">
        <!-- el-switch 默认值是布尔型，这里通过 active-value 和 inactive-value 直接处理 -->
        <el-switch v-model="form.status" :active-value="0" :inactive-value="1" />
      </el-form-item>
      <el-form-item label="代理权限">
        <el-switch v-model="form.isAgent" :active-value="1" :inactive-value="0" />
      </el-form-item>
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
import { updateUser } from '@/api/admin.js'

const emit = defineEmits(['update:modelValue', 'updated', 'close'])
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 建议将 user prop 的类型定义得更具体，或者至少要求为 Object
  user: { type: Object, default: () => null },
})

const visible = ref(false)
const formRef = ref()
const saving = ref(false)

// 初始化表单数据结构，字段名与 Java 实体类对齐
const form = reactive({
  id: '',
  userName: '',
  phone: '',
  password: '',
  confirmPassword: '',
  status: 0, // 0=正常, 1=禁用
  isAgent: 0, // 0=否, 1=是
})

// 自定义密码校验规则
const validateConfirmPassword = (rule, value, callback) => {
  if (form.password && value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 表单校验规则
const rules = reactive({
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    // 只有在输入了新密码时，才校验长度
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
        // 确认密码必须和新密码一同存在
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

// 监听 user prop 的变化，用一个独立的函数来重置表单，使逻辑更清晰
watch(() => props.user, (newUser) => {
  if (newUser) {
    resetForm(newUser)
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
  // 统一使用 id
  form.id = user.id ?? user.userId ?? ''
  // 与 Java 实体类字段 userName 对齐
  form.userName = user.userName ?? user.username ?? ''
  // 兼容多种可能的手机号字段
  // form.phone = user.phone ?? user.mobile ?? user.tel ?? ''
  // 直接使用后端返回的 0 或 1
  form.status = user.status ?? 0
  form.isAgent = user.isAgent ?? 0
  
  // 清空密码字段
  form.password = ''
  form.confirmPassword = ''

  // 在 DOM 更新后清除校验状态
  // nextTick(() => {
  //   formRef.value?.clearValidate()
  // })
}

async function onSave() {
  if (!formRef.value) return
  
  try {
    // 调用 Element Plus 的表单校验方法
    await formRef.value.validate()

    saving.value = true

    // 构建与后端 DTO 匹配的 payload
    const payload = {
      id: form.id,
      userName: form.userName,
      // phone: form.phone,
      status: form.status,
      isAgent: form.isAgent,
    }
    // 只有当用户输入了新密码时，才将其包含在 payload 中
    if (form.password) {
      payload.password = form.password
    }

    const res = await updateUser(payload)
    if (res && (res.code === 200 || res.ok)) {
      ElMessage.success(res.message || '保存成功')
      emit('updated')
      visible.value = false
    } else {
      ElMessage.error(res?.message || '保存失败')
    }
  } catch (validationError) {
    // 校验失败时，提示用户
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