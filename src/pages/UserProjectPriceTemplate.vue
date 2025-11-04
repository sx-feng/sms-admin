<template>
  <div class="block_index" style="position: fixed;top: 10px;left: 20px;z-index: 100;">
    <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
  </div>
  <div class="price-template-manage">
    <!-- 头部：标题和操作按钮 -->
    <div class="page-header">
      <h2>价格模板管理</h2>
      <div class="actions">
        <el-button type="success" size="small" @click="openDialog()" :icon="Plus">新增模板</el-button>
      </div>
    </div>

    <!-- 价格模板数据表格 -->
    <el-table :data="tableData" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="模板ID" width="100" fixed />
      <el-table-column prop="name" label="模板名称" />
      <el-table-column prop="creatId" label="创建者用户ID(管理员创建为0)" />
      <el-table-column label="包含项目数" width="150" align="center">
        <template #default="{ row }">
          {{ row.items ? row.items.length : 0 }} 个
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑模板弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditMode ? '编辑价格模板' : '新增价格模板'"
      width="80%"
      @close="closeDialog"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-divider>项目价格配置</el-divider>

        <p v-if="projectLoading" style="text-align: center; color: #909399;">项目列表加载中...</p>
        <p v-else-if="!form.items || form.items.length === 0" style="text-align: center; color: #909399;">暂无可配置的项目</p>
        
        <el-table v-else :data="form.items" border max-height="500px">
          <el-table-column label="项目名称" prop="projectName" width="200" />
          <el-table-column label="项目ID" prop="projectId" width="120" />
          <el-table-column label="线路ID" prop="lineId" width="120" />
          <el-table-column label="售价 (元)" prop="price"> 
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
          <el-table-column label="成本价 (元)" prop="costPrice"> 
            <!-- <template #default="{ row }">
              <el-input-number
                v-model="row.costPrice"
                :precision="2"
                :step="0.1"
                :min="0"
                placeholder="设置成本价"
                style="width: 100%;"
              />
            </template> -->
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            {{ isEditMode ? '确认保存' : '确认创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'; 
import { ElMessageBox, ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { 
  getAllPriceTemplates, 
  createPriceTemplate, 
  updatePriceTemplate, 
  deletePriceTemplate,
  getProjectLis // 复用获取项目列表的接口
} from '@/api/admin';

// 表格状态
const tableData = ref([]);
const loading = ref(false);

// 弹窗和表单状态
const dialogVisible = ref(false);
const submitLoading = ref(false);
const projectLoading = ref(false);
const isEditMode = ref(false);
const formRef = ref(null);

// 全局项目列表缓存
const allProjects = ref([]);

// 初始化表单数据结构
const getInitialForm = () => ({
  id: null,
  name: '',
  items: [] // 用于在表单中展示和编辑项目价格
});

const form = ref(getInitialForm());

const formRules = reactive({
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
});

/**
 * 获取价格模板列表
 */
async function getTemplateList() {
  loading.value = true;
  try {
    const res = await getAllPriceTemplates();
    tableData.value = res.data || [];
  } catch (error) {
    ElMessage.error('获取价格模板列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

/**
 * 获取所有项目列表 (仅在需要时调用)
 */
async function fetchAllProjects() {
  if (allProjects.value.length > 0) {
    return; // 如果已缓存，则直接返回
  }
  projectLoading.value = true;
  try {
    const res = await getProjectLis({ pageSize: -1 }); // 传入-1表示获取全部
    allProjects.value = res.data.records || [];
  } catch (error) {
    ElMessage.error('获取项目列表失败');
    console.error(error);
  } finally {
    projectLoading.value = false;
  }
}

/**
 * 打开新增/编辑弹窗
 * @param {object|null} template - 如果是编辑模式，则传入模板对象
 */
async function openDialog(template = null) {
  isEditMode.value = !!template;
  dialogVisible.value = true;
  await fetchAllProjects();

  if (isEditMode.value) {
    // 编辑模式：填充表单
    form.value.id = template.id;
    form.value.name = template.name;
    
    // 创建一个价格映射表以便快速查找
    const priceMap = new Map();
    template.items.forEach(item => {
      const key = `${item.projectId}_${item.lineId}`;
      priceMap.set(key, { price: item.price, costPrice: item.costPrice });
    });

    // 基于所有项目列表构建表单项，并填入已有价格
    form.value.items = allProjects.value.map(proj => {
      const key = `${proj.projectId}_${proj.lineId}`;
      const savedPrice = priceMap.get(key);
      return {
        projectId: proj.projectId,
        projectName: proj.projectName,
        lineId: proj.lineId,
        price: savedPrice ? savedPrice.price : 0.00,
        costPrice: savedPrice ? savedPrice.costPrice : 0.00,
      };
    });

  } else {
    // 新增模式：基于所有项目列表初始化价格配置
    form.value.items = allProjects.value.map(proj => ({
      projectId: proj.projectId,
      projectName: proj.projectName,
      lineId: proj.lineId,
      price: 0.00,
      costPrice: proj.costPrice || 0.00,
    }));
  }
}

/**
 * 处理表单提交 (创建或更新)
 */
async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        // 构建提交给后端的 DTO
        const payload = {
          name: form.value.name,
          // 过滤并转换项目价格列表以匹配 PriceTemplateItemDTO 结构
          items: form.value.items.map(p => ({
            projectId: p.projectId,
            projectName: p.projectName, // DTO 中包含此字段
            lineId: p.lineId,
            price: p.price,
            costPrice: p.costPrice,
          }))
        };
        
        if (isEditMode.value) {
          await updatePriceTemplate(form.value.id, payload);
          ElMessage.success('更新模板成功');
        } else {
          await createPriceTemplate(payload);
          ElMessage.success('新增模板成功');
        }

        dialogVisible.value = false;
        await getTemplateList(); // 成功后刷新列表
      } catch (error) {
        console.error(error);
        ElMessage.error(error.message || '操作失败，请检查网络或联系管理员');
      } finally {
        submitLoading.value = false;
      }
    } else {
        ElMessage.warning('请检查表单输入项！');
    }
  });
}

/**
 * 处理删除操作
 * @param {object} template - 要删除的模板对象
 */
function handleDelete(template) {
  ElMessageBox.confirm(`此操作将永久删除模板 [${template.name}]，是否继续？`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  .then(async () => {
    try {
      await deletePriceTemplate(template.id);
      ElMessage.success('删除成功');
      await getTemplateList(); // 刷新列表
    } catch (error) {
      console.error(error);
      ElMessage.error(error.message || '删除失败');
    }
  })
  .catch(() => {
    // 用户取消操作
  });
}


/**
 * 关闭并重置弹窗表单
 */
function closeDialog() {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  form.value = getInitialForm();
}

// 组件挂载时自动获取模板列表
onMounted(getTemplateList);
</script>

<style scoped>
.price-template-manage {
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