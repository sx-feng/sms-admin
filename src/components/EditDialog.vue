<template>
  <el-dialog v-model="visible" title="编辑用户" width="520px" @close="onClose">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
      <el-form-item label="用户ID">
        <el-input :model-value="form.id || form.userId" disabled />
      </el-form-item>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" placeholder="可选" />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="form.password" type="password" placeholder="留空则不修改" show-password />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入新密码" show-password />
      </el-form-item>
      <el-form-item label="启用状态">
        <el-switch v-model="form.status" />
      </el-form-item>
      <el-form-item label="代理权限">
        <el-switch v-model="form.isAgent" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
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
  user: { type: Object, default: null },
})

const visible = ref(false)
const form = reactive({ id: '', userId: '', username: '', phone: '', password: '', confirmPassword: '', status: true, isAgent: false })
const formRef = ref()
const saving = ref(false)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
}

watch(() => props.user, (val) => {
  if (val) {
    form.id = val.id ?? val.userId ?? ''
    form.userId = val.userId ?? val.id ?? ''
    form.username = val.username ?? val.userName ?? ''
    form.phone = val.phone ?? val.mobile ?? val.tel ?? ''
    form.status = !!(val.status ?? true)
    form.isAgent = !!val.isAgent
  }
  form.password = ''
  form.confirmPassword = ''
}, { immediate: true })

watch(() => props.modelValue, (v) => {
  visible.value = !!v
}, { immediate: true })

watch(visible, (v) => {
  if (v !== props.modelValue) emit('update:modelValue', v)
})

async function onSave() {
  if (form.password || form.confirmPassword) {
    if (form.password !== form.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }
    if (form.password.length < 6) {
      ElMessage.error('密码长度至少为 6 位')
      return
    }
  }
  const id = form.id || form.userId
  if (!id) {
    ElMessage.error('缺少用户ID，无法保存')
    return
  }
  try {
    saving.value = true
    const payload = {
      userId: form.userId || form.id,
      id: form.id || form.userId,
      username: form.username,
      phone: form.phone,
      isAgent: form.isAgent,
      status: form.status,
    }
    if (form.password) payload.password = form.password
    const res = await updateUser(payload)
    if (res && (res.code === 200 || res.ok)) {
      ElMessage.success(res.message || '保存成功')
      emit('updated')
      visible.value = false
    } else {
      ElMessage.error(res?.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}
function onCancel() { visible.value = false }
function onClose() { emit('close') }
</script>

<style scoped>
</style>
