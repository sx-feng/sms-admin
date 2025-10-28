<template>
  <div>
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
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="flattenedProjectPrices"
      border
      style="width: 100%"
    >
      <el-table-column label="用户ID" prop="userId" width="100" />
      <el-table-column label="用户名" prop="userName" />
      <el-table-column label="项目名称" prop="projectName" />
      <el-table-column label="项目ID" prop="projectId" />
      <el-table-column label="线路ID" prop="lineId" />
      <el-table-column label="代理售价 (元)" prop="price" />
      <el-table-column label="成本价 (元)" prop="costPrice" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope.row)">
            编辑
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
            <!-- 遍历从 getProjectLis 获取的项目列表 -->
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUserProjectPrices, updateUserProjectPrice ,getProjectLis} from '@/api/admin'

// --- 响应式状态定义 ---

const loading = ref(false)
const updateLoading = ref(false)

const allProjects = ref([])
const projectLoading = ref(false)

const selectedProjectId = ref(null);

// 存储扁平化后用于表格展示的数据
const flattenedProjectPrices = ref([])

// 搜索参数
const searchParams = reactive({
  userName: '',
  projectId: '',
  lineId: ''
})

// 分页参数
const pagination = reactive({
  pageNum: 1,
  pageSize: 5, // 与后端默认值保持一致
  total: 0
})

// 编辑弹窗相关
const editDialogVisible = ref(false)
const currentEditData = ref({})

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
    
    // `pageData.records` 是后端返回的用户列表，每个用户包含一个 `projectPrices` 数组
    const userList = pageData.records || []

    // 核心数据转换：使用 flatMap 将嵌套数据结构转换为扁平的列表
    // 这样每一条项目价格配置都成为表格中的一行
    flattenedProjectPrices.value = userList.flatMap(user =>
      (user.projectPrices || []).map(project => ({
        // 组合用户和项目的信息
        userId: user.userId,
        userName: user.userName,
        // 展开项目价格配置的所有字段
        ...project
      }))
    )

    // 从后端获取总条目数，用于分页
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

// [新增] 获取所有项目列表的函数
const fetchAllProjects = async () => {
  // 如果已经加载过，就不再重复加载
  if (allProjects.value.length > 0) return;

  projectLoading.value = true;
  try {
    // 传入-1或一个很大的数表示获取全部数据
    const res = await getProjectLis({ pageSize: -1 }); 
    allProjects.value = res.data.records || [];
  } catch (error) {
    ElMessage.error('获取项目列表失败，请刷新页面重试');
    console.error(error);
  } finally {
    projectLoading.value = false;
  }
}

// 组件挂载时，获取用户价格数据和所有项目列表
onMounted(() => {
  fetchUserProjectPrices();
  fetchAllProjects(); // [新增] 调用获取项目列表的函数
})


// --- 事件处理 ---

/**
 * 搜索按钮点击或分页大小改变
 */
const handleSearch = () => {
  pagination.pageNum = 1 // 每次新搜索或改变页大小都回到第一页
  fetchUserProjectPrices()
}

/**
 * 重置搜索条件
 */
const handleReset = () => {
  searchParams.userName = ''
  searchParams.projectId = ''
  searchParams.lineId = ''
  handleSearch() // 重置后立即执行一次搜索
}

const handleEdit = (row) => {
  currentEditData.value = { ...row }
  
  // [修改] 找到当前行项目在 'allProjects' 列表中的对应项
  const currentProject = allProjects.value.find(
    p => p.projectId === row.projectId && p.lineId === row.lineId
  );
  // [修改] 设置下拉框的默认选中值
  selectedProjectId.value = currentProject ? currentProject.id : null;

  editDialogVisible.value = true
}

// [新增] 当用户在下拉框中选择了一个新的项目时触发
function handleProjectChange(selectedDbId) {
    const selectedProject = allProjects.value.find(p => p.id === selectedDbId);
    if (selectedProject) {
        // 更新表单数据中的 projectId 和 lineId，用于提交
        currentEditData.value.projectId = selectedProject.projectId;
        currentEditData.value.lineId = selectedProject.lineId;
        // （可选）同时更新项目名称，虽然它不提交，但可以保持数据一致性
        currentEditData.value.projectName = selectedProject.projectName;
    }
}

const handleCancel = () => {
  editDialogVisible.value = false
  currentEditData.value = {}
  selectedProjectId.value = null; // [新增] 关闭时清空选择
}
/**
 * 提交更新
 */
const handleUpdate = async () => {
  // [新增] 校验：确保用户选择了一个新项目
  if (!selectedProjectId.value) {
      ElMessage.warning('请选择一个新的项目和线路');
      return;
  }

  updateLoading.value = true
  try {
    // [修改] 构建 payload，确保 projectId 和 lineId 是最新的
    const payload = {
      userProjectLineTableId: currentEditData.value.userProjectLineTableId,
      price: currentEditData.value.price,
      projectId: currentEditData.value.projectId, // 使用更新后的 projectId
      lineId: currentEditData.value.lineId,       // 使用更新后的 lineId
    }

    await updateUserProjectPrice(payload)
    ElMessage.success("更新成功！")
    editDialogVisible.value = false

    // 局部更新前端数据，避免重新请求
    const index = flattenedProjectPrices.value.findIndex(
      item => item.userProjectLineTableId === currentEditData.value.userProjectLineTableId
    )
    if (index !== -1) {
      // 更新所有相关字段
      flattenedProjectPrices.value[index].price = currentEditData.value.price;
      flattenedProjectPrices.value[index].projectId = currentEditData.value.projectId;
      flattenedProjectPrices.value[index].lineId = currentEditData.value.lineId;
      flattenedProjectPrices.value[index].projectName = currentEditData.value.projectName;
    } else {
      fetchUserProjectPrices() // 兜底方案：重新加载
    }
  } catch (error) {
    console.error("更新失败:", error)
    ElMessage.error(error.message || "更新失败，请稍后重试。")
  } finally {
    updateLoading.value = false
  }
}
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
.el-form-item {
  margin-bottom: 10px; /* 调整搜索表单项间距 */
}
</style>