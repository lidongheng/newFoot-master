<template>
  <div class="bet-order-list">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon total-amount">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(stats.totalAmount) }}</div>
              <div class="stat-label">总投注金额</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon potential-win">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(stats.totalPotentialWin) }}</div>
              <div class="stat-label">总预计可赢</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon actual-win">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ formatMoney(stats.totalActualWin) }}</div>
              <div class="stat-label">总实际赢取</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pending-count">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingCount }} 单</div>
              <div class="stat-label">待结算</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索卡片 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 130px">
            <el-option label="待结算" value="pending" />
            <el-option label="已结算" value="settled" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="searchForm.result" clearable placeholder="全部结果" style="width: 120px">
            <el-option label="赢" value="win" />
            <el-option label="输" value="lose" />
            <el-option label="走水" value="push" />
            <el-option label="赢半" value="half_win" />
            <el-option label="输半" value="half_lose" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="订单号/球队/联赛" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增订单</el-button>
      <el-button type="success" :icon="Check" :disabled="!selectedPendingIds.length" @click="handleBatchSettle">
        批量结算 ({{ selectedPendingIds.length }})
      </el-button>
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
        <el-table-column prop="orderId" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column label="比赛" width="200">
          <template #default="{ row }">
            <div class="match-info">
              <span class="teams">{{ row.homeTeam }} vs {{ row.awayTeam }}</span>
              <span class="league">{{ row.league }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="betType" label="投注类型" width="140" />
        <el-table-column label="选择" width="130">
          <template #default="{ row }">
            <span>{{ row.selection }}</span>
            <span class="value" v-if="row.value">({{ row.value }})</span>
          </template>
        </el-table-column>
        <el-table-column prop="odds" label="赔率" width="80" align="center">
          <template #default="{ row }">
            <span class="odds">{{ row.odds }}</span>
          </template>
        </el-table-column>
        <el-table-column label="投注金额" width="100" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="预计可赢" width="100" align="right">
          <template #default="{ row }">
            <span class="potential-win-text">¥{{ formatMoney(row.potentialWin) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.result" :type="getResultType(row.result)" size="small">
              {{ getResultText(row.result) }}
            </el-tag>
            <span v-else class="no-result">-</span>
          </template>
        </el-table-column>
        <el-table-column label="实际赢取" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.actualWin !== null" :class="row.actualWin > 0 ? 'win-text' : ''">
              ¥{{ formatMoney(row.actualWin) }}
            </span>
            <span v-else class="no-result">-</span>
          </template>
        </el-table-column>
        <el-table-column label="下注时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="small" 
              type="success" 
              link 
              v-if="row.status === 'pending'"
              @click="handleSettle(row)"
            >结算</el-button>
            <el-button 
              size="small" 
              type="warning" 
              link 
              v-if="row.status === 'settled'"
              @click="handleReSettle(row)"
            >改结算</el-button>
            <el-button 
              size="small" 
              type="warning" 
              link 
              v-if="row.status === 'pending'"
              @click="handleCancel(row)"
            >取消</el-button>
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
      :title="isEdit ? '编辑订单' : '新增订单'"
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="比赛ID" prop="matchId">
              <el-input v-model="formData.matchId" placeholder="关联的比赛ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联赛" prop="league">
              <el-input v-model="formData.league" placeholder="联赛名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="主队" prop="homeTeam">
              <el-input v-model="formData.homeTeam" placeholder="主队名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客队" prop="awayTeam">
              <el-input v-model="formData.awayTeam" placeholder="客队名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投注阶段" prop="betMode">
              <el-select v-model="formData.betMode" style="width: 100%">
                <el-option label="早盘" value="early" />
                <el-option label="滚球" value="live" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="玩法" prop="marketType">
              <el-select v-model="formData.marketType" style="width: 100%">
                <el-option label="让球" value="handicap" />
                <el-option label="大小球" value="overUnder" />
                <el-option label="独赢" value="moneyline" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选项键" prop="selectionKey">
              <el-select v-model="formData.selectionKey" style="width: 100%">
                <el-option label="主队" value="home" />
                <el-option label="客队" value="away" />
                <el-option label="大" value="over" />
                <el-option label="小" value="under" />
                <el-option label="平局" value="draw" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="盘口版本" prop="marketVersion">
              <el-input-number v-model="formData.marketVersion" :min="1" :step="1" step-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投注类型" prop="betType">
              <el-input v-model="formData.betType" placeholder="如: 让球" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="选择项" prop="selection">
              <el-input v-model="formData.selection" placeholder="如: 阿森纳" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="盘口值">
              <el-input v-model="formData.value" placeholder="如: -0.5" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="赔率" prop="odds">
              <el-input-number v-model="formData.odds" :precision="2" :step="0.01" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投注金额" prop="amount">
              <el-input-number v-model="formData.amount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="formData.status" style="width: 100%">
                <el-option label="待结算" value="pending" />
                <el-option label="已结算" value="settled" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 结算对话框 -->
    <el-dialog v-model="settleDialogVisible" title="订单结算" width="450px">
      <el-form label-width="100px">
        <el-form-item label="结算结果">
          <el-select v-model="settleForm.result" style="width: 100%">
            <el-option label="赢 (本金 + 全部盈利)" value="win" />
            <el-option label="赢半 (本金 + 一半盈利)" value="half_win" />
            <el-option label="走水 (只返还本金)" value="push" />
            <el-option label="输半 (返还一半本金)" value="half_lose" />
            <el-option label="输 (不返还)" value="lose" />
          </el-select>
        </el-form-item>
        <el-form-item label="最终主队比分">
          <el-input-number v-model="settleForm.finalHomeScore" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最终客队比分">
          <el-input-number v-model="settleForm.finalAwayScore" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSettle">确定</el-button>
      </template>
    </el-dialog>

    <!-- 修改结算对话框 -->
    <el-dialog v-model="reSettleDialogVisible" title="修改结算" width="500px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        修改结算将撤销原结算结果并重新计算，请确认操作无误。
      </el-alert>
      <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
        <el-descriptions-item label="订单号">{{ reSettleOrder.orderId }}</el-descriptions-item>
        <el-descriptions-item label="比赛">{{ reSettleOrder.homeTeam }} vs {{ reSettleOrder.awayTeam }}</el-descriptions-item>
        <el-descriptions-item label="投注金额">¥{{ formatMoney(reSettleOrder.amount) }}</el-descriptions-item>
        <el-descriptions-item label="赔率">{{ reSettleOrder.odds }}</el-descriptions-item>
        <el-descriptions-item label="当前结果">
          <el-tag v-if="reSettleOrder.result" :type="getResultType(reSettleOrder.result)" size="small">
            {{ getResultText(reSettleOrder.result) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前实际赢取">¥{{ formatMoney(reSettleOrder.actualWin) }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-width="100px">
        <el-form-item label="新结算结果">
          <el-select v-model="reSettleForm.result" style="width: 100%">
            <el-option label="赢 (本金 + 全部盈利)" value="win" />
            <el-option label="赢半 (本金 + 一半盈利)" value="half_win" />
            <el-option label="走水 (只返还本金)" value="push" />
            <el-option label="输半 (返还一半本金)" value="half_lose" />
            <el-option label="输 (不返还)" value="lose" />
          </el-select>
        </el-form-item>
        <el-form-item label="最终主队比分">
          <el-input-number v-model="reSettleForm.finalHomeScore" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最终客队比分">
          <el-input-number v-model="reSettleForm.finalAwayScore" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reSettleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="reSettleLoading" @click="submitReSettle">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Check, Money, Clock, Coin, TrendCharts } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getBetOrderList,
  createBetOrder,
  updateBetOrder,
  deleteBetOrder,
  batchDeleteBetOrders,
  batchSettleBetOrders,
  reSettleBetOrder,
  cancelBetOrder
} from '@/api/betOrder'

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const dateRange = ref([])

// 统计数据
const stats = reactive({
  totalAmount: 0,
  totalPotentialWin: 0,
  totalActualWin: 0,
  pendingCount: 0,
  settledCount: 0,
  totalCount: 0
})

// 搜索表单
const searchForm = reactive({
  status: '',
  result: '',
  keyword: '',
  startDate: '',
  endDate: ''
})

// 监听日期范围变化
watch(dateRange, (val) => {
  if (val && val.length === 2) {
    searchForm.startDate = val[0]
    searchForm.endDate = val[1]
  } else {
    searchForm.startDate = ''
    searchForm.endDate = ''
  }
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 选中的ID
const selectedIds = computed(() => selectedRows.value.map(item => item._id))
const selectedPendingIds = computed(() => 
  selectedRows.value.filter(item => item.status === 'pending').map(item => item._id)
)

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentEditId = ref('')

// 表单数据
const formData = reactive({
  matchId: '',
  league: '',
  homeTeam: '',
  awayTeam: '',
  homeScore: 0,
  awayScore: 0,
  betMode: 'early',
  marketType: 'handicap',
  selectionKey: 'home',
  betPeriod: '',
  betMinute: 0,
  marketVersion: 1,
  betType: '',
  selection: '',
  value: '',
  odds: 1.90,
  amount: 100,
  status: 'pending'
})

// 表单验证规则
const formRules = {
  matchId: [{ required: true, message: '请输入比赛ID', trigger: 'blur' }],
  league: [{ required: true, message: '请输入联赛', trigger: 'blur' }],
  homeTeam: [{ required: true, message: '请输入主队', trigger: 'blur' }],
  awayTeam: [{ required: true, message: '请输入客队', trigger: 'blur' }],
  betMode: [{ required: true, message: '请选择投注阶段', trigger: 'change' }],
  marketType: [{ required: true, message: '请选择玩法', trigger: 'change' }],
  selectionKey: [{ required: true, message: '请选择选项键', trigger: 'change' }],
  marketVersion: [{ required: true, message: '请输入盘口版本', trigger: 'blur' }],
  betType: [{ required: true, message: '请输入投注类型', trigger: 'blur' }],
  selection: [{ required: true, message: '请输入选择项', trigger: 'blur' }],
  odds: [{ required: true, message: '请输入赔率', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入投注金额', trigger: 'blur' }]
}

// 结算对话框
const settleDialogVisible = ref(false)
const settleForm = reactive({
  ids: [],
  result: 'win',
  finalHomeScore: 0,
  finalAwayScore: 0
})

// 修改结算对话框
const reSettleDialogVisible = ref(false)
const reSettleLoading = ref(false)
const reSettleOrder = reactive({
  _id: '',
  orderId: '',
  homeTeam: '',
  awayTeam: '',
  amount: 0,
  odds: 0,
  result: null,
  actualWin: null
})
const reSettleForm = reactive({
  result: 'win',
  finalHomeScore: 0,
  finalAwayScore: 0
})

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const data = await getBetOrderList({
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    tableData.value = data.list
    pagination.total = data.total
    
    // 更新统计数据
    if (data.stats) {
      Object.assign(stats, data.stats)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchData()
}

// 重置
function handleReset() {
  searchForm.status = ''
  searchForm.result = ''
  searchForm.keyword = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  dateRange.value = []
  handleSearch()
}

// 选择变化
function handleSelectionChange(selection) {
  selectedRows.value = selection
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
    matchId: row.matchId,
    league: row.league,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeScore: row.homeScore || 0,
    awayScore: row.awayScore || 0,
    betMode: row.betMode,
    marketType: row.marketType,
    selectionKey: row.selectionKey,
    betPeriod: row.betPeriod,
    betMinute: row.betMinute,
    marketVersion: row.marketVersion,
    betType: row.betType,
    selection: row.selection,
    value: row.value,
    odds: row.odds,
    amount: row.amount,
    status: row.status
  })
}

// 重置表单
function resetForm() {
  formData.matchId = ''
  formData.league = ''
  formData.homeTeam = ''
  formData.awayTeam = ''
  formData.homeScore = 0
  formData.awayScore = 0
  formData.betMode = 'early'
  formData.marketType = 'handicap'
  formData.selectionKey = 'home'
  formData.betPeriod = ''
  formData.betMinute = 0
  formData.marketVersion = 1
  formData.betType = ''
  formData.selection = ''
  formData.value = ''
  formData.odds = 1.90
  formData.amount = 100
  formData.status = 'pending'
}

// 提交表单
async function handleSubmit() {
  await formRef.value?.validate()
  
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateBetOrder(currentEditId.value, formData)
      ElMessage.success('更新成功')
    } else {
      await createBetOrder(formData)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    submitLoading.value = false
  }
}

// 删除
async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该订单吗？待结算订单删除会自动退还金额', '提示', { type: 'warning' })
  await deleteBetOrder(row._id)
  ElMessage.success('删除成功')
  fetchData()
}

// 批量删除
async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个订单吗？`, '提示', { type: 'warning' })
  await batchDeleteBetOrders(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedRows.value = []
  fetchData()
}

// 单个结算
function handleSettle(row) {
  settleForm.ids = [row._id]
  settleForm.result = 'win'
  settleForm.finalHomeScore = row.finalHomeScore || 0
  settleForm.finalAwayScore = row.finalAwayScore || 0
  settleDialogVisible.value = true
}

// 批量结算
function handleBatchSettle() {
  settleForm.ids = selectedPendingIds.value
  settleForm.result = 'win'
  settleForm.finalHomeScore = 0
  settleForm.finalAwayScore = 0
  settleDialogVisible.value = true
}

// 提交结算
async function submitSettle() {
  await batchSettleBetOrders(settleForm)
  ElMessage.success('结算成功')
  settleDialogVisible.value = false
  selectedRows.value = []
  fetchData()
}

// 修改结算
function handleReSettle(row) {
  Object.assign(reSettleOrder, {
    _id: row._id,
    orderId: row.orderId,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    amount: row.amount,
    odds: row.odds,
    result: row.result,
    actualWin: row.actualWin
  })
  reSettleForm.result = row.result || 'win'
  reSettleForm.finalHomeScore = row.finalHomeScore || 0
  reSettleForm.finalAwayScore = row.finalAwayScore || 0
  reSettleDialogVisible.value = true
}

// 提交修改结算
async function submitReSettle() {
  await ElMessageBox.confirm(
    `确定将结算结果从「${getResultText(reSettleOrder.result)}」修改为「${getResultText(reSettleForm.result)}」吗？此操作将重新计算账户余额。`,
    '确认修改结算',
    { type: 'warning' }
  )
  reSettleLoading.value = true
  try {
    await reSettleBetOrder(reSettleOrder._id, {
      result: reSettleForm.result,
      finalHomeScore: reSettleForm.finalHomeScore,
      finalAwayScore: reSettleForm.finalAwayScore
    })
    ElMessage.success('修改结算成功')
    reSettleDialogVisible.value = false
    fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    reSettleLoading.value = false
  }
}

// 取消订单
async function handleCancel(row) {
  await ElMessageBox.confirm('确定取消该订单吗？取消后会退还投注金额', '提示', { type: 'warning' })
  await cancelBetOrder(row._id)
  ElMessage.success('取消成功')
  fetchData()
}

// 格式化金额
function formatMoney(value) {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toFixed(2)
}

// 状态相关
function getStatusType(status) {
  const types = {
    pending: 'warning',
    settled: 'success',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    pending: '待结算',
    settled: '已结算',
    cancelled: '已取消'
  }
  return texts[status] || status
}

// 结果相关
function getResultType(result) {
  const types = {
    win: 'success',
    lose: 'danger',
    push: 'info',
    half_win: 'success',
    half_lose: 'warning'
  }
  return types[result] || 'info'
}

function getResultText(result) {
  const texts = {
    win: '赢',
    lose: '输',
    push: '走水',
    half_win: '赢半',
    half_lose: '输半'
  }
  return texts[result] || result
}

// 格式化日期
function formatDate(dateStr) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="less" scoped>
.bet-order-list {
  .stats-row {
    margin-bottom: 16px;
    
    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #fff;
          
          &.total-amount {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          &.potential-win {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          
          &.actual-win {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }
          
          &.pending-count {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }
        
        .stat-info {
          .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #303133;
          }
          
          .stat-label {
            font-size: 12px;
            color: #909399;
            margin-top: 4px;
          }
        }
      }
    }
  }
  
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
  
  .match-info {
    display: flex;
    flex-direction: column;
    
    .teams {
      font-weight: 500;
    }
    
    .league {
      font-size: 12px;
      color: #909399;
    }
  }
  
  .value {
    color: #909399;
    margin-left: 4px;
  }
  
  .odds {
    color: #409eff;
    font-weight: bold;
  }
  
  .potential-win-text {
    color: #e6a23c;
  }
  
  .win-text {
    color: #67c23a;
    font-weight: bold;
  }
  
  .no-result {
    color: #c0c4cc;
  }
  
  .pagination-wrap {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
