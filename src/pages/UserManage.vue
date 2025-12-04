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
        <el-input v-model="searchParentId" placeholder="通过用户名查询下级" size="small" clearable style="width: 180px; margin-right: 8px;" />
        <el-button type="primary" size="small" @click="handleSearch" :icon="Search">查询</el-button>
        <el-button type="success" size="small" @click="openAddDialog" :icon="Plus">新增用户</el-button>
      </div>
    </div>

    <!-- 用户数据表格 (保持不变) -->
    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="用户ID" fixed width="80" />
      <el-table-column prop="userName" label="用户名" width="150" />
      <el-table-column prop="parentName" label="上级用户名" width="150">
        <template #default="{ row }">
          <span v-if="row.parentName">{{ row.parentName }}</span>
          <span v-else>无上级</span>
        </template>
      </el-table-column>
      <el-table-column prop="templateId" label="价格模板ID" width="100" align="center">
        
         <template #default="{ row }">
           <el-tag type="info" v-if="row.templateId">{{ row.templateId }}</el-tag>
           <span v-else class="text-gray">未配置</span>
         </template>
      </el-table-column>
      <!-- 模板名称 templateName -->
      <el-table-column prop="templateName" label="价格模板名称" min-width="150" >
        <template #default="{ row }">
          <span v-if="row.templateName">{{ row.templateName }}</span>
          <span v-else class="text-gray">未配置</span>
        </template>
      </el-table-column>

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
      <el-table-column prop="lastLoginTime" label="最后登录时间"  align="center" width="180">
        <template #default="{ row }">
          <span v-if="row.lastLoginTime">{{ new Date(row.lastLoginTime).toLocaleString() }}</span>
          <span v-else>从未登录</span>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="注册时间"  align="center" width="180">
        <template #default="{ row }">
          <span>{{ new Date(row.createTime).toLocaleString() }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近24小时统计" align="center">
        <el-table-column prop="dailyGetCount" label="取号次数" width="100" align="center" />
        <el-table-column prop="dailyCodeCount" label="成功次数" width="100" align="center" />
        <el-table-column prop="dailyCodeRate" label="回码率" width="100" align="center">
           <template #default="{ row }">
              {{ (row.dailyCodeRate * 100).toFixed(1) }}%
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

    <!-- 资金弹窗 (保持不变) -->
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
      <div style="margin-bottom: 15px; display: flex; justify-content: flex-end;">
        <el-button type="warning" plain size="small" @click="handlePasteFromLocal">
          粘贴上次创建的账号密码
        </el-button>
      </div>
      
      <el-form :model="addForm" :rules="addFormRules" ref="addFormRef" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="addForm.username" placeholder="请输入用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="addForm.password"  placeholder="请输入密码" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属代理" prop="parentId">
              <el-select 
                v-model="addForm.parentId" 
                placeholder="默认归属平台(无上级)" 
                clearable 
                filterable
                style="width: 100%"
              >
                <el-option label="平台直属 (无代理)" :value="0" />
                <el-option
                  v-for="agent in agentList"
                  :key="agent.id"
                  :label="agent.userName + ' (ID:' + agent.id + ')'"
                  :value="agent.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="初始余额" prop="initialBalance">
              <el-input-number v-model="addForm.initialBalance" :precision="2" :step="100" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item label="代理权限" prop="isAgent">
                  <el-switch v-model="addForm.isAgent" active-text="是" inactive-text="否" />
                </el-form-item>
            </el-col>
        </el-row>
        
        <el-divider>项目与价格配置</el-divider>

        <!-- 价格模板选择 (必填) -->
        <el-form-item label="价格模板" prop="templateId">
          <el-select
            v-model="addForm.templateId"
            placeholder="请选择一个价格模板 (必选)"
            clearable
            filterable
            style="width: 100%;"
            :loading="templatesLoading"
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

        <!-- [修改] 价格预览 + 黑名单配置表格 -->
        <div v-if="addForm.templateId" style="padding: 0 20px 20px 20px;">
          <!-- 搜索框 -->
          <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
             <span style="font-size: 13px; color: #409EFF; font-weight: bold;">
              <el-icon style="vertical-align: middle; margin-right: 4px;"><InfoFilled /></el-icon>
              权限与价格预览
             </span>
             <el-input
                v-model="addSearchKeyword"
                placeholder="搜索项目ID..."
                prefix-icon="Search"
                style="width: 250px;"
                size="small"
                clearable
              />
          </div>

          <el-table 
            :data="filteredAddPreviewPrices" 
            border 
            stripe
            size="small" 
            height="300"
            v-loading="previewLoading"
            empty-text="该模板暂无配置项"
          >
            <el-table-column prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip/>
            <el-table-column prop="projectId" label="项目ID" width="80" align="center"/>
            <el-table-column prop="lineId" label="线路" width="70" align="center"/>
            
            <el-table-column prop="price" label="模板售价" width="90" align="center">
               <template #default="{ row }">
                 <span style="color: #E6A23C; font-weight: bold;">{{ row.price }}</span>
               </template>
            </el-table-column>
            
            <!-- 状态列 -->
            <el-table-column label="用户项目权限" width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="isAddBlacklisted(row)" type="danger" size="small" effect="dark">已禁用</el-tag>
                <el-tag v-else type="success" size="small" effect="plain">正常</el-tag>
              </template>
            </el-table-column>

            <!-- 操作列 -->
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <el-button 
                  v-if="!isAddBlacklisted(row)"
                  type="danger" 
                  link 
                  size="small" 
                  @click="toggleAddBlacklist(row)"
                >
                  加入黑名单
                </el-button>
                <el-button 
                  v-else
                  type="primary" 
                  link 
                  size="small" 
                  @click="toggleAddBlacklist(row)"
                >
                  移除黑名单
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

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
import { ref, onMounted, watch, reactive, computed } from 'vue'; 
import { ElMessageBox, ElMessage } from 'element-plus';
import { Search, Plus, InfoFilled } from '@element-plus/icons-vue'; // 引入 InfoFilled

import RecordDialog from '@/components/RecordDialog.vue';
import EditDialog from '@/components/EditDialog.vue';
// 移除 getProjectLis，因为不再需要加载全量项目
import { getTemplateItems ,listUsers, getAllAgents, updateUser, deleteUser, rechargeUser, deductUser, createUser, getAllPriceTemplates } from '@/api/admin';

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
// const projectLoading = ref(false); // 已移除
const addFormRef = ref(null);
// const allProjects = ref([]); // 已移除

// 价格模板相关
const priceTemplates = ref([]);       
const templatesLoading = ref(false); 

// 代理列表
const agentList = ref([]); 
const agentLoading = ref(false);

const previewPrices = ref([]); // 用于存储预览的价格数据
const previewLoading = ref(false); 
const addSearchKeyword = ref(''); // [新增] 搜索关键词

// 初始化新增表单
const getInitialAddForm = () => ({
  username: '',
  password: '',
  parentId: null,
  initialBalance: 0.00,
  isAgent: false,
  templateId: null, // 必填：关联模板ID
  blacklistedProjects: [] // 选填：黑名单列表 ["pid-lid", ...]
});
const addForm = ref(getInitialAddForm());

// 校验规则
const addFormRules = reactive({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  initialBalance: [
    { required: true, message: '请输入初始余额', trigger: 'blur' },
    { type: 'number', min: 0, message: '余额不能为负数', trigger: 'blur' },
  ],
  templateId: [{ required: true, message: '请选择价格模板', trigger: 'change' }]
});

// [新增] 计算属性：过滤预览表格
const filteredAddPreviewPrices = computed(() => {
  if (!addSearchKeyword.value) return previewPrices.value;
  const kw = addSearchKeyword.value.toLowerCase();
  return previewPrices.value.filter(item => {
    return (
      (item.projectName && item.projectName.toLowerCase().includes(kw)) ||
      String(item.projectId).includes(kw) ||
      String(item.lineId).includes(kw)
    );
  });
});

// [新增] 判断是否在黑名单
function isAddBlacklisted(row) {
  const key = `${row.projectId}-${row.lineId}`;
  return addForm.value.blacklistedProjects.includes(key);
}

// [新增] 切换黑名单状态
function toggleAddBlacklist(row) {
  const key = `${row.projectId}-${row.lineId}`;
  const index = addForm.value.blacklistedProjects.indexOf(key);
  if (index > -1) {
    addForm.value.blacklistedProjects.splice(index, 1);
  } else {
    addForm.value.blacklistedProjects.push(key);
  }
}

// 弹窗状态
const editDialogVisible = ref(false);
const recordDialogVisible = ref(false);
const fundDialogVisible = ref(false);
const fundSubmitLoading = ref(false);
const fundFormRef = ref(null);
const fundForm = ref({ action: 'recharge', amount: undefined });
const fundFormRules = {
  amount: [
    { required: true, message: '请输入操作金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' },
  ],
};

/**
 * 获取所有代理商列表
 */
async function fetchAgents() {
  agentLoading.value = true;
  try {
    const res = await getAllAgents();
    agentList.value = res.data || [];
  } catch (error) {
    ElMessage.error('获取代理列表失败');
  } finally {
    agentLoading.value = false;
  }
}

// 复制和粘贴逻辑 (保持不变)...
async function handleCopyAndAlert(username, password) {
  const creds = { username, password };
  localStorage.setItem('LAST_USER_CREDS', JSON.stringify(creds));
  const textToCopy = `账号：${username}\n密码：${password}`;
  try {
    await navigator.clipboard.writeText(textToCopy);
    ElMessage.success('账号密码已自动复制到剪贴板！');
  } catch (err) {
    console.error('自动复制失败', err);
  }
  ElMessageBox.alert(
    `
    <div style="text-align: center; font-size: 16px;">
      <p><strong>操作成功！</strong></p>
      <div style="background: #f5f7fa; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: left;">
        <p>账号：<span style="color: #409EFF; font-weight: bold;">${username}</span></p>
        <p>密码：<span style="color: #F56C6C; font-weight: bold;">${password}</span></p>
      </div>
      <p style="font-size: 12px; color: #909399;">已自动复制，也可点击下方按钮再次复制</p>
    </div>
    `,
    '账号信息',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '复制并关闭',
      callback: () => {
        navigator.clipboard.writeText(textToCopy);
      }
    }
  );
}

function handlePasteFromLocal() {
  const cached = localStorage.getItem('LAST_USER_CREDS');
  if (!cached) {
    ElMessage.warning('暂无最近操作的账号记录');
    return;
  }
  try {
    const { username, password } = JSON.parse(cached);
    addForm.value.username = username;
    addForm.value.password = password;
    ElMessage.success('已自动填充上次的账号密码');
  } catch (e) {
    ElMessage.error('读取记录失败');
  }
}

/**
 * 获取用户列表
 */
async function getUserList() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      size: pageSize.value,
      parentName: searchParentId.value || "",
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

watch([page, pageSize], getUserList);

/**
 * 监听新增表单中 templateId 的变化
 */
watch(() => addForm.value.templateId, async (newVal) => {
  if (newVal) {
    previewLoading.value = true;
    try {
      const res = await getTemplateItems(newVal);
      previewPrices.value = res.data || [];
    } catch (e) {
      console.error(e);
      previewPrices.value = [];
    } finally {
      previewLoading.value = false;
    }
  } else {
    previewPrices.value = []; 
  }
});

function handleSearch() {
  page.value = 1; 
  getUserList();
}

/**
 * 打开新增用户弹窗
 */
async function openAddDialog() {
  addDialogVisible.value = true;
  
  const promises = [];
  // 移除：获取项目列表（不再需要）
  // if (allProjects.value.length === 0) { ... }
  
  // 获取价格模板（必填）
  if (priceTemplates.value.length === 0) {
    promises.push(fetchPriceTemplates());
  }
  // 获取代理
  promises.push(fetchAgents());
  
  await Promise.all(promises);
}

// 移除：fetchProjects 函数

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
  } finally {
    templatesLoading.value = false;
  }
}

async function handleAddSubmit() {
  if (!addFormRef.value) return;
  await addFormRef.value.validate(async (valid) => {
    if (valid) {
      addSubmitLoading.value = true;
      try {
        const currentPassword = addForm.value.password;
        const currentUsername = addForm.value.username;

        const payload = {
          username: addForm.value.username,
          password: addForm.value.password,
          initialBalance: addForm.value.initialBalance,
          isAgent: addForm.value.isAgent,
          parentId: addForm.value.parentId,
          templateId: addForm.value.templateId,
          blacklistedProjects: addForm.value.blacklistedProjects
        };
        
        const res = await createUser(payload);
        if (!res || res.ok === false) {
           throw new Error(res?.message || '新增用户失败');
        }
        
        addDialogVisible.value = false; 
        await getUserList(); 
        
        handleCopyAndAlert(currentUsername, currentPassword);

      } catch (error) {
        console.error(error);
        ElMessage.error(error.message || '新增用户失败');
      } finally {
        addSubmitLoading.value = false;
      }
    } else {
        ElMessage.warning('请检查表单输入项！');
    }
  });
}

function closeAddDialog() {
  if (addFormRef.value) {
    addFormRef.value.resetFields();
  }
  addForm.value = getInitialAddForm();
  previewPrices.value = []; 
  addSearchKeyword.value = ''; // 清空搜索
}


function openEditDialog(user) {
  currentUser.value = { ...user };
  editDialogVisible.value = true;
}

function openRecordDialog(user) {
  currentUser.value = { ...user };
  recordDialogVisible.value = true;
}

function openFundDialog(user, actionType) {
  currentUser.value = { ...user };
  fundForm.value.action = actionType;
  fundDialogVisible.value = true;
}

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

function resetFundForm() {
    if (fundFormRef.value) {
        fundFormRef.value.resetFields();
    }
    fundForm.value.amount = undefined;
}

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
.text-gray {
  color: #909399;
}
/* 新增：表格内按钮间距微调 */
:deep(.el-table .cell) {
  padding: 0 8px;
}
</style>