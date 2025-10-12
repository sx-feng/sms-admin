<template>
  <el-dialog v-model="visible" :title="`为用户扣款`" width="420px" @close="onClose">
    <el-form :model="form" label-width="80px">
      <el-form-item label="用户ID">
        <el-input :model-value="user?.id ?? user?.userId ?? ''" disabled />
      </el-form-item>
      <el-form-item label="金额" required>
        <el-input-number v-model="form.amount" :min="0.01" :precision="2" :step="10" controls-position="right" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { deductUser } from '@/api/admin.js'

const emit = defineEmits(['update:modelValue', 'updated', 'close'])
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const visible = ref(false)
const loading = ref(false)
const form = reactive({ amount: 0 })

watch(() => props.modelValue, (v) => { visible.value = !!v }, { immediate: true })
watch(visible, (v) => { if (v !== props.modelValue) emit('update:modelValue', v) })

function onCancel() { visible.value = false }
function onClose() { emit('close') }

async function onConfirm() {
  if (!props.user) { ElMessage.error('未选择用户'); return }
  if (!form.amount || form.amount <= 0) { ElMessage.error('请输入有效金额'); return }
  try {
    loading.value = true
    const targetUserId = props.user.id ?? props.user.userId
    const res = await deductUser(targetUserId, form.amount)
    if (res && (res.code === 200 || res.ok)) {
      ElMessage.success(res.message || '扣款成功')
      emit('updated')
      visible.value = false
    } else {
      ElMessage.error(res?.message || '扣款失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
</style>
