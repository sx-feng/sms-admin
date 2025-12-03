<template>
  <div>
    <el-table :data="localList" border size="small" style="width: 100%">
      <el-table-column label="Key" prop="key">
        <template #default="{ row }">
          <el-input v-model="row.key" placeholder="Key" />
        </template>
      </el-table-column>
      <el-table-column label="Value" prop="value">
        <template #default="{ row }">
          <el-input v-model="row.value" placeholder="Value" />
        </template>
      </el-table-column>
      <el-table-column width="60" align="center" label="操作">
        <template #default="{ $index }">
          <!-- 这里使用文本删除，避免图标不显示的问题 -->
          <el-button link type="danger" @click="removeRow($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 新增：显眼的添加按钮放在表格下面 -->
    <div style="margin-top: 5px;">
      <el-button type="primary" link @click="addRow">+ 添加一行</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// 本地副本
const localList = ref(JSON.parse(JSON.stringify(props.modelValue || [])))

// 监听本地变化 -> 通知父组件
watch(localList, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

// 监听父组件变化 -> 更新本地
watch(() => props.modelValue, (newVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(localList.value)) {
    localList.value = JSON.parse(JSON.stringify(newVal || []))
  }
}, { deep: true })

const addRow = () => {
  localList.value.push({ key: '', value: '' })
}

const removeRow = (index) => {
  localList.value.splice(index, 1)
}
</script>