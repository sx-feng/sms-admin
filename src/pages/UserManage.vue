<template>
  <div class="user-manage">
    <!-- 头部：标题、搜索和操作按钮 -->
    <div class="page-header">
      <h2>👤 用户管理</h2>
      <div class="actions">
        <el-input v-model="searchParentId" placeholder="查询上级ID的用户" size="small" clearable style="width: 180px; margin-right: 8px;" />
        <el-button type="primary" size="small" @click="handleSearch" :icon="Search">查询</el-button>
        <el-button type="success" size="small" @click="openAddDialog" :icon="Plus">新增用户</el-button>
      </div>
    </div>

    <!-- 用户数据表格 -->
    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="用户ID"  fixed />
      <el-table-column prop="userName" label="用户名" width="150" />
      <el-table-column prop="balance" label="余额" width="120">
        <template #default="{ row }">
          <span>¥ {{ Number(row.balance).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <!-- 根据实体类注释：0=正常，1=冻结/禁用 -->
          <el-tag :type="row.status === 0 ? 'success' : 'danger'">
            {{ row.status === 0 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isAgent" label="代理权限" width="110" align="center">
        <template #default="{ row }">
          <!-- 根据实体类注释：0=否, 1=是 -->
          <el-switch
            v-model="row.isAgent"
            :active-value="1"
            :inactive-value="0"
            :loading="row.agentLoading"
            @change="toggleAgent(row)"
          />
        </template>
      </el-table-column>
      
      <!-- 多级表头：展示统计数据 -->
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
      
      <!-- 操作列 -->
      <el-table-column label="操作" width="280" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button size="small" type="success" @click="openRechargeDialog(row)">充值</el-button>
          <el-button size="small" type="info" @click="openRecordDialog(row)">账单</el-button>
          <el-button size="small" type="danger" @click="deleteByUser(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <PaginationBar
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @change="getUserList"
    />

    <!-- 弹窗组件 -->
    <EditDialog v-model="editDialogVisible" :user="currentUser" @updated="getUserList" />
    <RechargeDialog v-model="rechargeDialogVisible" :user="currentUser" @updated="getUserList" />
    <RecordDialog v-model="recordDialogVisible" :user="currentUser" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Search, Plus } from '@element-plus/icons-vue';
import PaginationBar from '@/components/PaginationBar.vue';
import RecordDialog from '@/components/RecordDialog.vue';
import EditDialog from '@/components/EditDialog.vue';
import RechargeDialog from '@/components/RechargeDialog.vue';
// 假设你的API方法如下，请根据实际情况调整
import { listUsers, updateUser,deleteUser} from '@/api/admin';

// 响应式状态
const tableData = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const currentUser = ref(null);
const editDialogVisible = ref(false);
const rechargeDialogVisible = ref(false);
const recordDialogVisible = ref(false);
const searchParentId = ref('');

/**
 * 获取用户列表
 */
async function getUserList() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      size: pageSize.value,
      // 如果 searchParentId 为空字符串，则不传递该参数
      parentId: searchParentId.value || '', 
    };
    const res = await listUsers(params);
    // 为每行数据添加一个加载状态，用于控制代理权限开关的loading
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
 * 处理搜索
 */
function handleSearch() {
  page.value = 1; // 搜索时重置到第一页
  getUserList();
}

/**
 * 打开新增用户弹窗
 */
function openAddDialog() {
  currentUser.value = null; // 传入 null 或空对象表示新增
  editDialogVisible.value = true;
}

/**
 * 打开编辑用户弹窗
 */
function openEditDialog(user) {
  currentUser.value = { ...user }; // 使用副本以避免直接修改表格数据
  editDialogVisible.value = true;
}

/**
 * 打开充值弹窗
 */
function openRechargeDialog(user) {
  currentUser.value = { ...user };
  rechargeDialogVisible.value = true;
}

/**
 * 打开账单记录弹窗
 */
function openRecordDialog(user) {
  currentUser.value = { ...user };
  recordDialogVisible.value = true;
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
    
    row.agentLoading = true; // 开启加载状态
    // 实际调用更新接口
    await updateUser({ id: row.id, isAgent: row.isAgent });
    ElMessage.success(`用户 ${row.userName} 的代理权限已${newStatusText}`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('更新代理权限失败');
      // 如果失败，将开关状态恢复
      row.isAgent = row.isAgent === 1 ? 0 : 1;
    }
  } finally {
    row.agentLoading = false; // 关闭加载状态
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
    // 调用删除接口
    await deleteUser(user.id);
    ElMessage.success('删除成功');
    getUserList(); // 刷新列表
  })
  .catch(() => {
    // 用户取消操作
  });
}

// 组件挂载时自动获取第一页数据
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
</style>