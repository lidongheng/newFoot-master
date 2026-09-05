<template>
  <div class="league-list">
    <!-- 搜索卡片 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="国家">
          <el-select v-model="searchForm.country" clearable placeholder="全部国家" style="width: 150px">
            <el-option v-for="country in countryOptions" :key="country" :label="country" :value="country" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="联赛名称/ID" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增联赛</el-button>
      <el-button type="danger" :icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">
        批量删除 ({{ selectedIds.length }})
      </el-button>
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        row-key="_id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="leagueId" label="联赛ID" width="150" show-overflow-tooltip />
        <el-table-column label="国旗" width="80" align="center">
          <template #default="{ row }">
            <span class="flag">{{ row.flag }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="联赛名称" width="220" />
        <el-table-column prop="country" label="国家" width="120" />
        <el-table-column prop="matchCount" label="比赛数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.matchCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑联赛' : '新增联赛'"
      width="500px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="联赛ID" prop="leagueId">
          <el-input v-model="formData.leagueId" placeholder="如: laliga" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="联赛名称" prop="name">
          <el-input v-model="formData.name" placeholder="如: 西班牙甲级联赛" />
        </el-form-item>
        <el-form-item label="国家" prop="country">
          <el-input v-model="formData.country" placeholder="如: 西班牙" />
        </el-form-item>
        <el-form-item label="国旗" prop="flag">
          <el-input v-model="formData.flag" placeholder="国旗emoji，如: 🇪🇸" />
          <div class="flag-preview" v-if="formData.flag">
            预览: <span class="flag">{{ formData.flag }}</span>
          </div>
        </el-form-item>
        <el-form-item label="比赛数量">
          <el-input-number v-model="formData.matchCount" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getLeagueList,
  getCountries,
  createLeague,
  updateLeague,
  deleteLeague,
  batchDeleteLeagues
} from '@/api/league'

const loading = ref(false)
const tableData = ref([])
const selectedIds = ref([])
const countryOptions = ref([])

// 搜索表单
const searchForm = reactive({
  country: '',
  keyword: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentEditId = ref('')

// 表单数据
const formData = reactive({
  leagueId: '',
  name: '',
  country: '',
  flag: '',
  matchCount: 0
})

// 表单验证规则
const formRules = {
  leagueId: [{ required: true, message: '请输入联赛ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入联赛名称', trigger: 'blur' }],
  country: [{ required: true, message: '请输入国家', trigger: 'blur' }]
}

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const data = await getLeagueList({
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    tableData.value = data.list
    pagination.total = data.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 获取国家列表
async function fetchCountries() {
  try {
    const data = await getCountries()
    countryOptions.value = data || []
  } catch (e) {
    console.error(e)
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 重置
function handleReset() {
  searchForm.country = ''
  searchForm.keyword = ''
  handleSearch()
}

// 选择变化
function handleSelectionChange(selection) {
  selectedIds.value = selection.map(item => item._id)
}

// 新增
function handleCreate() {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}

// 编辑
function handleEdit(row) {
  isEdit.value = true
  currentEditId.value = row._id
  dialogVisible.value = true
  
  Object.assign(formData, {
    leagueId: row.leagueId,
    name: row.name,
    country: row.country,
    flag: row.flag,
    matchCount: row.matchCount || 0
  })
}

// 重置表单
function resetForm() {
  formData.leagueId = ''
  formData.name = ''
  formData.country = ''
  formData.flag = ''
  formData.matchCount = 0
}

// 提交表单
async function handleSubmit() {
  await formRef.value?.validate()
  
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateLeague(currentEditId.value, formData)
      ElMessage.success('更新成功')
    } else {
      await createLeague(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
    fetchCountries()
  } catch (e) {
    console.error(e)
  } finally {
    submitLoading.value = false
  }
}

// 删除
async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该联赛吗？', '提示', { type: 'warning' })
  await deleteLeague(row._id)
  ElMessage.success('删除成功')
  fetchData()
  fetchCountries()
}

// 批量删除
async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个联赛吗？`, '提示', { type: 'warning' })
  await batchDeleteLeagues(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  fetchData()
  fetchCountries()
}

// 格式化日期
function formatDate(dateStr) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  fetchData()
  fetchCountries()
})
</script>

<style lang="less" scoped>
.league-list {
  .search-card {
    margin-bottom: 16px;
    
    .search-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
  
  .action-bar {
    margin-bottom: 16px;
    display: flex;
    gap: 12px;
  }
  
  .flag {
    font-size: 24px;
  }
  
  .flag-preview {
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
  }
  
  .pagination-wrap {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
