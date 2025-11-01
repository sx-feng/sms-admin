<template>
  <div>
    <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
    <!-- 搜索表单 -->
    <el-form :inline="true" :model="searchParams" class="search-form" @submit.prevent="handleSearch">
      <el-form-item label="用户名">
        <el-input v-model="searchParams.userName" placeholder="支持模糊查询" clearable />
      </el-form-item>
      <el-form-item label="项目ID">
        <el-input v-model="searchParams.projectId" placeholder="请输入项目ID" clearable />
      </el-form-item>
      <el-form-item label="线路ID">
        <el-input v-model="searchParams.lineId" placeholder="请输入线路ID" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSearch">
          查询
        </el-button>
        <el-button @click="handleReset">
          重置
        </el-button>
        <!-- [新增] 添加配置按钮 -->
        <el-button type="success" @click="handleAdd">
          自定义添加用户配置
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="flattenedProjectPrices"
      border
      style="width: 100%"
    >
      <!-- ... 表格列定义保持不变 ... -->
      <el-table-column label="用户ID" prop="userId" width="100" />
      <el-table-column label="用户名" prop="userName" />
      <el-table-column label="项目名称" prop="projectName" />
      <el-table-column label="项目ID" prop="projectId" />
      <el-table-column label="线路ID" prop="lineId" />
      <el-table-column label="代理售价 (元)" prop="price" />
      <el-table-column label="成本价 (元)" prop="costPrice" />
      <el-table-column label="操作"  fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope.row)">
            编辑
          </el-button>
          <el-button type="success" size="small" @click="handleAddForRow(scope.row)">
            添加项目
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <el-pagination
      v-if="pagination.total > 0"
      v-model:current-page="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :page-sizes="[5, 10, 20, 50, 100]"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; justify-content: flex-end;"
      @size-change="handleSearch"
      @current-change="fetchUserProjectPrices"
    />

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑价格配置"
      width="500px"
      @close="handleCancel"
    >
      <el-form :model="currentEditData" label-width="120px">
        <el-form-item label="用户名">
          <el-input :value="currentEditData.userName" disabled />
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input :value="currentEditData.projectName"  />
        </el-form-item>
        <el-form-item label="项目/线路" prop="selectedProject">
          <el-select 
            v-model="selectedProjectId" 
            placeholder="请选择新的项目和线路" 
            style="width: 100%"
            filterable 
            @change="handleProjectChange"
            :loading="projectLoading"
          >
            <el-option
              v-for="project in allProjects"
              :key="project.id"
              :label="`${project.projectName} (ID: ${project.projectId} / 线路: ${project.lineId})`"
              :value="project.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="代理售价 (元)">
          <el-input-number
            v-model="currentEditData.price"
            :precision="2"
            :step="0.1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="updateLoading" @click="handleUpdate">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- [新增] 添加配置弹窗 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加用户项目价格配置"
      width="600px"
      @close="handleCancelAdd"
    >
      <el-form ref="addFormRef" :model="addForm" label-width="100px">
        <el-form-item label="目标用户ID" prop="userId" :rules="[{ required: true, message: '用户ID不能为空', trigger: 'blur' }]">
          <el-input-number v-model="addForm.userId" :min="1" controls-position="right" placeholder="请输入用户ID" style="width: 100%;" />
        </el-form-item>

        <el-divider content-position="center">要添加的项目</el-divider>

        <!-- 动态增减的项目价格表单 -->
        <div v-for="(item, index) in addForm.pricesToAdd" :key="index" style="display: flex; align-items: center; gap: 10px; margin-bottom: 18px;">
          <el-form-item
            :label="`项目 ${index + 1}`"
            :prop="`pricesToAdd.${index}.selectedDbId`"
            :rules="[{ required: true, message: '请选择项目', trigger: 'change' }]"
            style="flex: 1; margin-bottom: 0;"
          >
            <el-select
              v-model="item.selectedDbId"
              placeholder="请选择项目和线路"
              style="width: 100%"
              filterable
              :loading="projectLoading"
              @change="(selectedDbId) => handleAddProjectChange(selectedDbId, item)"
            >
              <el-option
                v-for="project in allProjects"
                :key="project.id"
                :label="`${project.projectName} (ID: ${project.projectId} / 线路: ${project.lineId})`"
                :value="project.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            label-width="0"
            :prop="`pricesToAdd.${index}.price`"
            :rules="[{ required: true, message: '价格不能为空' }, { type: 'number', min: 0, message: '价格不能为负数' }]"
            style="flex: 0.5; margin-bottom: 0;"
          >
            <el-input-number
              v-model="item.price"
              :precision="2"
              :step="0.1"
              :min="0"
              placeholder="价格"
              style="width: 100%"
            />
          </el-form-item>

          <el-button type="danger" :icon="Delete" circle @click="removeProjectPriceItem(item)" />
        </div>

        <el-form-item>
            <el-button type="primary" plain @click="addProjectPriceItem">新增一项</el-button>
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCancelAdd">取消</el-button>
          <el-button type="primary" :loading="addLoading" @click="handleConfirmAdd">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
// [修改] 引入新增的API方法和图标
import { getUserProjectPrices, updateUserProjectPrice ,getProjectLis, addUserProjectPrices } from '@/api/admin'
import { Delete } from '@element-plus/icons-vue'

// --- 响应式状态定义 ---

const loading = ref(false)
const updateLoading = ref(false)

const allProjects = ref([])
const projectLoading = ref(false)

const selectedProjectId = ref(null)

const flattenedProjectPrices = ref([])

const searchParams = reactive({
  userName: '',
  projectId: '',
  lineId: ''
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 5,
  total: 0
})

// 编辑弹窗相关
const editDialogVisible = ref(false)
const currentEditData = ref({})

// [新增] 添加配置弹窗相关状态
const addDialogVisible = ref(false)
const addLoading = ref(false)
const addFormRef = ref(null) // 新增表单的引用
const addForm = reactive({
  userId: null,
  pricesToAdd: [] // 存储待添加的项目价格列表
})


/**
 * [新增] 点击行内 "添加项目" 按钮时触发
 * @param {object} row - 当前行的数据对象
 */
const handleAddForRow = (row) => {
  // 填充用户信息到表单
  addForm.userId = row.userId;
  addForm.userName = row.userName;

  // 为方便操作，默认添加一个空的待选项目
  addProjectPriceItem();

  addDialogVisible.value = true;
};

// --- 数据获取与处理 ---

const fetchUserProjectPrices = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      userName: searchParams.userName || '',
      projectId: searchParams.projectId || '',
      lineId: searchParams.lineId || ''
    }

    const res = await getUserProjectPrices(params)
    const pageData = res.data || { records: [], total: 0 }
    
    const userList = pageData.records || []

    flattenedProjectPrices.value = userList.flatMap(user =>
      (user.projectPrices || []).map(project => ({
        userId: user.userId,
        userName: user.userName,
        ...project
      }))
    )

    pagination.total = pageData.total
    
  } catch (error) {
    console.error("获取用户项目价格数据失败:", error)
    ElMessage.error("数据加载失败！")
    flattenedProjectPrices.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const fetchAllProjects = async () => {
  if (allProjects.value.length > 0) return;

  projectLoading.value = true;
  try {
    const res = await getProjectLis({ pageSize: -1 }); 
    allProjects.value = res.data.records || [];
  } catch (error) {
    ElMessage.error('获取项目列表失败，请刷新页面重试');
    console.error(error);
  } finally {
    projectLoading.value = false;
  }
}

onMounted(() => {
  fetchUserProjectPrices();
  fetchAllProjects();
})


// --- 事件处理 ---

const handleSearch = () => {
  pagination.pageNum = 1 
  fetchUserProjectPrices()
}

const handleReset = () => {
  searchParams.userName = ''
  searchParams.projectId = ''
  searchParams.lineId = ''
  handleSearch()
}

const handleEdit = (row) => {
  currentEditData.value = { ...row }
  
  const currentProject = allProjects.value.find(
    p => p.projectId === row.projectId && p.lineId === row.lineId
  );
  selectedProjectId.value = currentProject ? currentProject.id : null;

  editDialogVisible.value = true
}

function handleProjectChange(selectedDbId) {
    const selectedProject = allProjects.value.find(p => p.id === selectedDbId);
    if (selectedProject) {
        currentEditData.value.projectId = selectedProject.projectId;
        currentEditData.value.lineId = selectedProject.lineId;
        currentEditData.value.projectName = selectedProject.projectName;
    }
}

const handleCancel = () => {
  editDialogVisible.value = false
  currentEditData.value = {}
  selectedProjectId.value = null;
}

const handleUpdate = async () => {
  if (!selectedProjectId.value) {
      ElMessage.warning('请选择一个新的项目和线路');
      return;
  }

  updateLoading.value = true
  try {
    const payload = {
      userProjectLineTableId: currentEditData.value.userProjectLineTableId,
      price: currentEditData.value.price,
      projectId: currentEditData.value.projectId,
      lineId: currentEditData.value.lineId,
    }

    await updateUserProjectPrice(payload)
    ElMessage.success("更新成功！")
    editDialogVisible.value = false

    const index = flattenedProjectPrices.value.findIndex(
      item => item.userProjectLineTableId === currentEditData.value.userProjectLineTableId
    )
    if (index !== -1) {
      flattenedProjectPrices.value[index].price = currentEditData.value.price;
      flattenedProjectPrices.value[index].projectId = currentEditData.value.projectId;
      flattenedProjectPrices.value[index].lineId = currentEditData.value.lineId;
      flattenedProjectPrices.value[index].projectName = currentEditData.value.projectName;
    } else {
      fetchUserProjectPrices()
    }
  } catch (error) {
    console.error("更新失败:", error)
    ElMessage.error(error.message || "更新失败，请稍后重试。")
  } finally {
    updateLoading.value = false
  }
}

// --- [新增] 添加配置相关方法 ---

/**
 * 打开新增配置弹窗
 */
const handleAdd = () => {
  addDialogVisible.value = true;
};

/**
 * 重置新增表单并关闭弹窗
 */
const resetAddForm = () => {
    addForm.userId = null;
    addForm.pricesToAdd = []; // 清空项目列表
    // 重置表单的校验状态
    if (addFormRef.value) {
        addFormRef.value.resetFields();
    }
}

const handleCancelAdd = () => {
  resetAddForm();
  addDialogVisible.value = false;
};

/**
 * 在新增表单中添加一个新的项目价格条目
 */
const addProjectPriceItem = () => {
  addForm.pricesToAdd.push({
    selectedDbId: null, // 用于 v-model 绑定 el-select
    projectId: null,
    lineId: null,
    price: undefined, // 设置为 undefined 以显示 placeholder
  });
};

/**
 * 从新增表单中移除一个项目价格条目
 */
const removeProjectPriceItem = (itemToRemove) => {
  const index = addForm.pricesToAdd.indexOf(itemToRemove);
  if (index !== -1) {
    addForm.pricesToAdd.splice(index, 1);
  }
};

/**
 * 当新增表单中的项目选择变化时，更新对应条目的 projectId 和 lineId
 */
const handleAddProjectChange = (selectedDbId, item) => {
  const selectedProject = allProjects.value.find(p => p.id === selectedDbId);
  if (selectedProject) {
    item.projectId = selectedProject.projectId;
    item.lineId = selectedProject.lineId;
  }
};

/**
 * 提交新增配置
 */
const handleConfirmAdd = async () => {
  if (!addFormRef.value) return;

  // 触发整个表单的校验
  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      if (addForm.pricesToAdd.length === 0) {
        ElMessage.warning('请至少添加一个项目配置');
        return;
      }

      addLoading.value = true;
      try {
        // 构建与后端 DTO 匹配的请求体
        const payload = {
          userId: addForm.userId,
          pricesToAdd: addForm.pricesToAdd.map(item => ({
            projectId: item.projectId,
            lineId: item.lineId,
            price: item.price
          }))
        };

        // 调用后端接口
        await addUserProjectPrices(payload);
        ElMessage.success('新增配置成功！');
        handleCancelAdd(); // 关闭并重置弹窗
        handleSearch(); // 刷新表格数据
      } catch (error) {
        console.error("新增配置失败:", error);
        ElMessage.error(error.message || '新增配置失败，请稍后重试。');
      } finally {
        addLoading.value = false;
      }
    } else {
      ElMessage.error('请检查并完成表单必填项');
      return false;
    }
  });
};

</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
.el-form-item {
  margin-bottom: 10px;
}
</style>