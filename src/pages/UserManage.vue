<template>
  <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
    <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
  </div>
  <div class="user-manage">
    <!-- 头部：标题、搜索和操作按钮 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="actions">
        <el-input v-model="searchUserName" placeholder="按用户名模糊查询" size="small" clearable style="width: 180px; margin-right: 8px;" @clear="handleSearch" />
        <el-input v-model="searchParentId" placeholder="查询上级ID的用户" size="small" clearable style="width: 180px; margin-right: 8px;" />
        <el-button type="primary" size="small" @click="handleSearch" :icon="Search">查询</el-button>
        <el-button type="success" size="small" @click="openAddDialog" :icon="Plus">新增用户</el-button>
      </div>
    </div>

    <!-- 用户数据表格 -->
    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="用户ID" fixed />
      <el-table-column prop="userName" label="用户名" width="150" />
      <el-table-column prop="balance" label="余额" width="120">
        <template #default="{ row }">
          <span>¥ {{ Number(row.balance).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="用户状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'danger'">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isAgent" label="代理权限" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            v-model="row.isAgent"
            :active-value="1"
            :inactive-value="0"
            :loading="row.agentLoading"
            @change="toggleAgent(row)"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="最近24小时统计" align="center">
        <el-table-column prop="dailyGetCount" label="取号次数" width="110" align="center" />
        <el-table-column prop="dailyCodeCount" label="成功次数" width="110" align="center" />
        <el-table-column prop="dailyCodeRate" label="回码率" width="100" align="center">
           <template #default="{ row }">
              {{ (row.dailyCodeRate * 100).toFixed(1) }}%
           </template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="累计统计" align="center">
        <el-table-column prop="totalGetCount" label="总取号" width="110" align="center" />
        <el-table-column prop="totalCodeCount" label="总成功" width="110" align="center" />
        <el-table-column prop="totalCodeRate" label="总回码率" width="110" align="center">
          <template #default="{ row }">
              {{ (row.totalCodeRate * 100).toFixed(1) }}%
           </template>
        </el-table-column>
      </el-table-column>
      
      <el-table-column label="操作" width="350" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button size="small" type="success" @click="openFundDialog(row, 'recharge')">充值</el-button>
          <el-button size="small" type="warning" @click="openFundDialog(row, 'deduct')">扣款</el-button>
          <el-button size="small" type="info" @click="openRecordDialog(row)">账单</el-button>
          <el-button size="small" type="danger" @click="deleteByUser(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 弹窗组件 -->
    <EditDialog v-model="editDialogVisible" :user="currentUser" @updated="getUserList" />
    <RecordDialog v-model="recordDialogVisible" :user="currentUser" />

    <el-dialog
      v-model="fundDialogVisible"
      :title="fundForm.action === 'recharge' ? '用户充值' : '用户扣款'"
      width="450px"
      @close="resetFundForm"
      :close-on-click-modal="false"
    >
      <el-form :model="fundForm" :rules="fundFormRules" ref="fundFormRef" label-width="80px">
        <el-form-item label="用户名">
          <el-input :value="currentUser?.userName" disabled />
        </el-form-item>
        <el-form-item label="操作类型" prop="action">
           <el-radio-group v-model="fundForm.action">
            <el-radio label="recharge">充值</el-radio>
            <el-radio label="deduct">扣款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="操作金额" prop="amount">
          <el-input-number v-model="fundForm.amount" :precision="2" :step="10" :min="0.01" placeholder="请输入金额" style="width: 100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="fundDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleFundSubmit" :loading="fundSubmitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- ==================== 新增用户弹窗 (START) ==================== -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增用户"
      width="750px"
      @close="closeAddDialog"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="addForm" :rules="addFormRules" ref="addFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="addForm.username" placeholder="请输入用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="addForm.password"  placeholder="请输入密码"  />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="初始余额" prop="initialBalance">
              <el-input-number v-model="addForm.initialBalance" :precision="2" :step="100" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="代理权限" prop="isAgent">
              <el-switch v-model="addForm.isAgent" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider>项目价格配置</el-divider>

        <!-- =========== [MODIFIED] 价格模板区域更新 =========== -->
        <div style="display: flex; align-items: center; margin-bottom: 15px; gap: 10px;">
          <el-select
            v-model="selectedTemplateId"
            placeholder="请选择一个价格模板"
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
          <span style="color: #909399; font-size: 12px;">选择模板后将自动填充下方匹配的项目售价。</span>
        </div>
        <!-- =============================================== -->

        <p v-if="projectLoading" style="text-align: center; color: #909399;">项目列表加载中...</p>
        <p v-else-if="!addForm.projectPrices || addForm.projectPrices.length === 0" style="text-align: center; color: #909399;">暂无可配置的项目</p>
        
        <el-table v-else :data="addForm.projectPrices" border max-height="300px">
          <el-table-column label="项目名称" prop="projectName" />
          <el-table-column label="项目ID" prop="projectId"/>
          <el-table-column label="线路ID" prop="lineId"/>
          <el-table-column label="最大售价 (元)" prop="maxPrice"/>
          <el-table-column label="最低售价 (元)" prop="minPrice"/>
          <el-table-column label="售价 (元)" prop="price" min-width="190"> 
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
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-button 
                type="danger" 
                @click="handleDeleteProjectPrice($index)" 
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddSubmit" :loading="addSubmitLoading">确定创建</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive } from 'vue'; 
import { ElMessageBox, ElMessage } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';

import RecordDialog from '@/components/RecordDialog.vue';
import EditDialog from '@/components/EditDialog.vue';
// =========== [MODIFIED] 增加导入 getAllPriceTemplates 方法 ===========
import { listUsers, updateUser, deleteUser, rechargeUser, deductUser, createUser, getProjectLis, getAllPriceTemplates } from '@/api/admin';

// 表格和分页状态
const tableData = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchParentId = ref('');
const searchUserName = ref('');

// 通用状态
const currentUser = ref(null);

// ==================== 新增用户逻辑 (START) ====================
const addDialogVisible = ref(false);
const addSubmitLoading = ref(false);
const projectLoading = ref(false);
const addFormRef = ref(null);
const allProjects = ref([]); 

// =========== [MODIFIED] 新增用于价格模板的状态 ===========
const priceTemplates = ref([]);       // 存储所有价格模板
const templatesLoading = ref(false);  // 模板加载状态
const selectedTemplateId = ref(null); // 选中的模板ID
// ====================================================

const getInitialAddForm = () => ({
  username: '',
  password: '',
  initialBalance: 0.00,
  isAgent: false,
  projectPrices: [] 
});

const addForm = ref(getInitialAddForm());

// 主表单的校验规则
const addFormRules = reactive({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  initialBalance: [
    { required: true, message: '请输入初始余额', trigger: 'blur' },
    { type: 'number', min: 0, message: '余额不能为负数', trigger: 'blur' },
  ],
});

// 弹窗状态
const editDialogVisible = ref(false);
const recordDialogVisible = ref(false);

// 充值/扣款弹窗的状态
const fundDialogVisible = ref(false);
const fundSubmitLoading = ref(false);
const fundFormRef = ref(null);
const fundForm = ref({
  action: 'recharge',
  amount: undefined,
});
const fundFormRules = {
  amount: [
    { required: true, message: '请输入操作金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' },
  ],
};

/**
 * 获取用户列表
 */
async function getUserList() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      size: pageSize.value,
      parentId: searchParentId.value || "",
      userName: searchUserName.value || "",
    };
    const res = await listUsers(params);
    tableData.value = res.data.records.map(user => ({ ...user, agentLoading: false })) || [];
    total.value = res.data.total || 0;
  } catch (error) {
    ElMessage.error('获取用户列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

/**
 * 从待提交的项目价格列表中移除一个项目
 */
function handleDeleteProjectPrice(index) {
  addForm.value.projectPrices.splice(index, 1);
  ElMessage.info('已移除该项目价格配置');
}

watch([page, pageSize], getUserList);

/**
 * 处理搜索
 */
function handleSearch() {
  page.value = 1; 
  getUserList();
}

/**
 * 打开新增用户弹窗
 */
async function openAddDialog() {
  addDialogVisible.value = true;
  
  // 并行获取项目列表和价格模板
  const promises = [];
  if (allProjects.value.length === 0) {
    promises.push(fetchProjects());
  }
  if (priceTemplates.value.length === 0) {
    promises.push(fetchPriceTemplates());
  }
  await Promise.all(promises);
  
  // 基于获取到的项目列表，初始化价格配置
  addForm.value.projectPrices = allProjects.value.map(proj => ({
    dbId: proj.id,
    projectId: proj.projectId,
    lineId: proj.lineId,
    projectName: proj.projectName,
    price: proj.priceMax ?? 0.00,
    maxPrice: proj.priceMax ?? 0.00,
    minPrice: proj.priceMin ?? 0.00
  }));
}

/**
 * 获取所有项目列表 (用于价格配置)
 */
async function fetchProjects() {
  projectLoading.value = true;
  try {
    const res = await getProjectLis({ pageSize: -1 });
    allProjects.value = res.data.records || [];
  } catch (error) {
    ElMessage.error('获取项目列表失败');
    console.error(error);
  } finally {
    projectLoading.value = false;
  }
}

// =========== [NEW] 新增获取价格模板的方法 ===========
/**
 * 获取所有价格模板
 */
async function fetchPriceTemplates() {
  templatesLoading.value = true;
  try {
    const res = await getAllPriceTemplates();
    priceTemplates.value = res.data || [];
  } catch (error) {
    ElMessage.error('获取价格模板列表失败');
    console.error(error);
  } finally {
    templatesLoading.value = false;
  }
}

/**
 * [NEW] 应用选中的价格模板
 * @param {number} templateId - 选中的模板ID
 */
function applySelectedTemplate(templateId) {
  if (!templateId) return; // 如果清空选择，则不执行任何操作

  const selectedTemplate = priceTemplates.value.find(t => t.id === templateId);
  if (!selectedTemplate || !selectedTemplate.items) {
    ElMessage.error('未找到模板或模板数据格式不正确');
    return;
  }

  // 使用Map进行高效查找，键为 "projectId-lineId"
  const priceMap = new Map(selectedTemplate.items.map(item => [`${item.projectId}-${item.lineId}`, item.price]));

  let appliedCount = 0;
  // 遍历当前表单中的项目，应用模板价格
  addForm.value.projectPrices.forEach(project => {
    const key = `${project.projectId}-${project.lineId}`;
    if (priceMap.has(key)) {
      project.price = priceMap.get(key);
      appliedCount++;
    }
  });

  if (appliedCount > 0) {
    ElMessage.success(`模板 "${selectedTemplate.name}" 已应用，更新了 ${appliedCount} 个项目价格。`);
  } else {
    ElMessage.warning(`模板 "${selectedTemplate.name}" 中的项目与当前列表不匹配。`);
  }
}
// ====================================================

/**
 * 处理新增用户提交
 */
async function handleAddSubmit() {
  if (!addFormRef.value) return;
  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      addSubmitLoading.value = true;
      try {
        const payload = {
          username: addForm.value.username,
          password: addForm.value.password,
          initialBalance: addForm.value.initialBalance,
          isAgent: addForm.value.isAgent,
          projectPrices: addForm.value.projectPrices.map(p => ({
            projectId: p.projectId,
            lineId: p.lineId, 
            price: p.price
          }))
        };
        
        const eee = await createUser(payload);
        if (!eee || eee.ok === false) {
          throw new Error(eee?.message || '新增用户失败');
        }
        ElMessage.success('新增用户成功');
        addDialogVisible.value = false;
        await getUserList();
      } catch (error) {
        console.error(error);
        ElMessage.error(error.message || '新增用户失败，请检查网络或联系管理员');
      } finally {
        addSubmitLoading.value = false;
      }
    } else {
        ElMessage.warning('请检查表单输入项！');
    }
  });
}

/**
 * 关闭并重置新增用户表单
 */
function closeAddDialog() {
  if (addFormRef.value) {
    addFormRef.value.resetFields();
  }
  addForm.value = getInitialAddForm();
  // =========== [MODIFIED] 重置模板选择 ===========
  selectedTemplateId.value = null; 
}

/**
 * 打开编辑用户弹窗
 */
function openEditDialog(user) {
  currentUser.value = { ...user };
  editDialogVisible.value = true;
}

/**
 * 打开账单记录弹窗
 */
function openRecordDialog(user) {
  currentUser.value = { ...user };
  recordDialogVisible.value = true;
}

/**
 * 打开充值/扣款弹窗
 */
function openFundDialog(user, actionType) {
  currentUser.value = { ...user };
  fundForm.value.action = actionType;
  fundDialogVisible.value = true;
}

/**
 * 处理充值/扣款提交
 */
async function handleFundSubmit() {
  if (!fundFormRef.value) return;
  await fundFormRef.value.validate(async (valid) => {
    if (valid) {
      fundSubmitLoading.value = true;
      try {
        const { action, amount } = fundForm.value;
        const targetUserId = currentUser.value.id;
        const actionText = action === 'recharge' ? '充值' : '扣款';

        if (action === 'recharge') {
          await rechargeUser(targetUserId, amount);
        } else {
          if (currentUser.value.balance < amount) {
             ElMessage.error('用户余额不足，无法扣款');
             fundSubmitLoading.value = false;
             return;
          }
          await deductUser(targetUserId, amount);
        }
        
        ElMessage.success(`${actionText}成功`);
        fundDialogVisible.value = false;
        await getUserList();
      } catch (error) {
        console.error(error);
        ElMessage.error('操作失败，请查看控制台');
      } finally {
        fundSubmitLoading.value = false;
      }
    }
  });
}

/**
 * 重置充值/扣款表单
 */
function resetFundForm() {
    if (fundFormRef.value) {
        fundFormRef.value.resetFields();
    }
    fundForm.value.amount = undefined;
}

/**
 * 切换用户代理状态
 */
async function toggleAgent(row) {
  const newStatusText = row.isAgent === 1 ? '开启' : '关闭';
  try {
    await ElMessageBox.confirm(`确认要${newStatusText}用户 [${row.userName}] 的代理权限吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    row.agentLoading = true;
    await updateUser({ id: row.id, isAgent: row.isAgent });
    ElMessage.success(`用户 ${row.userName} 的代理权限已${newStatusText}`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('更新代理权限失败');
      row.isAgent = row.isAgent === 1 ? 0 : 1;
    }
  } finally {
    row.agentLoading = false;
  }
}

/**
 * 删除用户
 */
function deleteByUser(user) {
  ElMessageBox.confirm(`此操作将永久删除用户 [${user.userName}]，是否继续？`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  .then(async () => {
    await deleteUser(user.id);
    ElMessage.success('删除成功');
    await getUserList();
  })
  .catch(() => {});
}

onMounted(getUserList);
</script>

<style scoped>
.user-manage {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
    margin: 0;
    font-size: 20px;
}
.actions {
  display: flex;
  align-items: center;
}
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>