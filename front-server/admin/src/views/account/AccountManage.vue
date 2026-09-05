<template>
  <div class="account-manage">
    <!-- 账户概览 -->
    <el-row :gutter="16" class="account-overview">
      <el-col :span="8">
        <el-card class="balance-card" shadow="hover">
          <div class="balance-content">
            <div class="balance-icon">
              <el-icon><Wallet /></el-icon>
            </div>
            <div class="balance-info">
              <div class="balance-label">当前余额</div>
              <div class="balance-value">¥{{ formatMoney(account.balance) }}</div>
            </div>
            <el-button type="primary" @click="openAdjustDialog">调整余额</el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="hover">
          <el-row :gutter="24">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">总充值</div>
                <div class="stat-value deposit">¥{{ formatMoney(balanceStats.totalDeposit) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">总提现</div>
                <div class="stat-value withdraw">¥{{ formatMoney(balanceStats.totalWithdraw) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">总投注</div>
                <div class="stat-value bet">¥{{ formatMoney(balanceStats.totalBet) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-label">总赢取</div>
                <div class="stat-value win">¥{{ formatMoney(balanceStats.totalWin) }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 余额变动日志 -->
    <el-card shadow="never" class="logs-card">
      <template #header>
        <div class="card-header">
          <span>余额变动日志</span>
          <div class="header-actions">
            <el-button type="danger" size="small" :disabled="!selectedIds.length" @click="handleBatchDelete">
              批量删除 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" clearable placeholder="全部类型" style="width: 130px">
            <el-option label="投注" value="bet" />
            <el-option label="中奖" value="win" />
            <el-option label="充值" value="deposit" />
            <el-option label="提现" value="withdraw" />
            <el-option label="调整" value="adjust" />
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
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 日志表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        row-key="_id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动金额" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.amount >= 0 ? 'amount-plus' : 'amount-minus'">
              {{ row.amount >= 0 ? '+' : '' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动前余额" width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.balanceBefore) }}
          </template>
        </el-table-column>
        <el-table-column label="变动后余额" width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.balanceAfter) }}
          </template>
        </el-table-column>
        <el-table-column prop="relatedOrderId" label="关联订单" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.relatedOrderId">{{ row.relatedOrderId }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">
            <span v-if="row.updatedAt">{{ formatDate(row.updatedAt) }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
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
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>

    <!-- 编辑日志对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑余额日志" width="800px" destroy-on-close>
      <el-row :gutter="24">
        <!-- 左侧：详细信息（只读） -->
        <el-col :span="12">
          <div class="detail-section">
            <div class="section-title">
              <el-icon><Document /></el-icon>
              <span>日志详情（只读）</span>
            </div>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="日志ID">
                <el-text type="info" size="small">{{ logDetail._id || '-' }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item label="类型">
                <el-tag :type="getTypeTagType(logDetail.type)" size="small">
                  {{ getTypeText(logDetail.type) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="变动金额">
                <span :class="logDetail.amount >= 0 ? 'amount-plus' : 'amount-minus'">
                  {{ logDetail.amount >= 0 ? '+' : '' }}¥{{ formatMoney(logDetail.amount) }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="变动前余额">
                ¥{{ formatMoney(logDetail.balanceBefore) }}
              </el-descriptions-item>
              <el-descriptions-item label="变动后余额">
                ¥{{ formatMoney(logDetail.balanceAfter) }}
              </el-descriptions-item>
              <el-descriptions-item label="关联订单">
                {{ logDetail.relatedOrderId || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="备注">
                {{ logDetail.remark || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ logDetail.createdAt ? formatDate(logDetail.createdAt) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ logDetail.updatedAt ? formatDate(logDetail.updatedAt) : '-' }}
              </el-descriptions-item>
            </el-descriptions>
            
            <!-- 额外详情信息（后端返回的其他字段） -->
            <template v-if="hasExtraDetails">
              <div class="section-title extra-title">
                <el-icon><InfoFilled /></el-icon>
                <span>扩展信息</span>
              </div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item 
                  v-for="(value, key) in extraDetails" 
                  :key="key" 
                  :label="getExtraFieldLabel(key)"
                >
                  <template v-if="isDateField(key)">
                    {{ formatDate(value) }}
                  </template>
                  <template v-else-if="isMoneyField(key)">
                    ¥{{ formatMoney(value) }}
                  </template>
                  <template v-else-if="typeof value === 'object'">
                    <el-text type="info" size="small">{{ JSON.stringify(value) }}</el-text>
                  </template>
                  <template v-else>
                    {{ value ?? '-' }}
                  </template>
                </el-descriptions-item>
              </el-descriptions>
            </template>
          </div>
        </el-col>
        
        <!-- 右侧：编辑表单 -->
        <el-col :span="12">
          <div class="edit-section">
            <div class="section-title">
              <el-icon><Edit /></el-icon>
              <span>编辑信息</span>
            </div>
            <el-form ref="editFormRef" :model="editForm" :rules="editFormRules" label-width="90px" size="default">
              <el-form-item label="类型" prop="type">
                <el-select v-model="editForm.type" style="width: 100%">
                  <el-option label="投注" value="bet" />
                  <el-option label="中奖" value="win" />
                  <el-option label="充值" value="deposit" />
                  <el-option label="提现" value="withdraw" />
                  <el-option label="调整" value="adjust" />
                </el-select>
              </el-form-item>
              <el-form-item label="变动金额" prop="amount">
                <el-input-number v-model="editForm.amount" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="变动前" prop="balanceBefore">
                <el-input-number v-model="editForm.balanceBefore" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="变动后" prop="balanceAfter">
                <el-input-number v-model="editForm.balanceAfter" :min="0" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="关联订单">
                <el-input v-model="editForm.relatedOrderId" placeholder="关联的订单号（可选）" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
              </el-form-item>
              <el-form-item label="创建时间" prop="createdAt">
                <el-date-picker
                  v-model="editForm.createdAt"
                  type="datetime"
                  placeholder="选择创建时间"
                  style="width: 100%"
                  value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                />
              </el-form-item>
              <el-form-item label="更新时间" prop="updatedAt">
                <el-date-picker
                  v-model="editForm.updatedAt"
                  type="datetime"
                  placeholder="选择更新时间（结算时间）"
                  style="width: 100%"
                  value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                />
                <div class="form-tip">结算时请填写此字段记录结算时间</div>
              </el-form-item>
            </el-form>
          </div>
        </el-col>
      </el-row>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 调整余额对话框 -->
    <el-dialog v-model="adjustDialogVisible" title="调整余额" width="450px">
      <el-form label-width="100px">
        <el-form-item label="当前余额">
          <el-input :value="'¥' + formatMoney(account.balance)" disabled />
        </el-form-item>
        <el-form-item label="新余额">
          <el-input-number v-model="adjustForm.balance" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" placeholder="请输入调整原因" />
        </el-form-item>
      </el-form>
      <div class="adjust-preview" v-if="adjustForm.balance !== account.balance">
        <el-alert
          :title="adjustPreviewText"
          :type="adjustForm.balance > account.balance ? 'success' : 'warning'"
          :closable="false"
          show-icon
        />
      </div>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Wallet, Document, Edit, InfoFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getAccountInfo,
  setBalance,
  getBalanceLogs,
  getBalanceStats,
  deleteBalanceLog,
  batchDeleteBalanceLogs,
  updateBalanceLog
} from '@/api/account'

const loading = ref(false)
const tableData = ref([])
const selectedIds = ref([])
const dateRange = ref([])

// 账户信息
const account = reactive({
  _id: '',
  balance: 0
})

// 余额统计
const balanceStats = reactive({
  totalDeposit: 0,
  totalWithdraw: 0,
  totalBet: 0,
  totalWin: 0,
  totalAdjust: 0,
  count: 0
})

// 搜索表单
const searchForm = reactive({
  type: '',
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

// 调整余额对话框
const adjustDialogVisible = ref(false)
const adjustForm = reactive({
  balance: 0,
  remark: ''
})

// 编辑日志对话框
const editDialogVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref(null)
const currentEditId = ref('')
const editForm = reactive({
  type: '',
  amount: 0,
  balanceBefore: 0,
  balanceAfter: 0,
  relatedOrderId: '',
  remark: '',
  createdAt: '',
  updatedAt: ''
})

// 日志详情（只读展示）
const logDetail = ref({})

// 基础字段列表（不在扩展信息中显示）
const baseFields = ['_id', 'type', 'amount', 'balanceBefore', 'balanceAfter', 'relatedOrderId', 'remark', 'createdAt', 'updatedAt', '__v']

// 计算额外的详情字段
const extraDetails = computed(() => {
  const extra = {}
  for (const key in logDetail.value) {
    if (!baseFields.includes(key)) {
      extra[key] = logDetail.value[key]
    }
  }
  return extra
})

// 是否有额外详情
const hasExtraDetails = computed(() => Object.keys(extraDetails.value).length > 0)

// 编辑表单验证规则
const editFormRules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入变动金额', trigger: 'blur' }],
  balanceBefore: [{ required: true, message: '请输入变动前余额', trigger: 'blur' }],
  balanceAfter: [{ required: true, message: '请输入变动后余额', trigger: 'blur' }],
  createdAt: [{ required: true, message: '请选择创建时间', trigger: 'change' }]
}

// 调整预览文本
const adjustPreviewText = computed(() => {
  const diff = adjustForm.balance - account.balance
  if (diff > 0) {
    return `将增加 ¥${formatMoney(diff)}`
  } else if (diff < 0) {
    return `将减少 ¥${formatMoney(Math.abs(diff))}`
  }
  return ''
})

// 获取账户信息
async function fetchAccount() {
  try {
    const data = await getAccountInfo()
    Object.assign(account, data)
  } catch (e) {
    console.error(e)
  }
}

// 获取余额统计
async function fetchStats() {
  try {
    const data = await getBalanceStats()
    Object.assign(balanceStats, data)
  } catch (e) {
    console.error(e)
  }
}

// 获取余额日志
async function fetchLogs() {
  loading.value = true
  try {
    const data = await getBalanceLogs({
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

// 搜索
function handleSearch() {
  pagination.page = 1
  fetchLogs()
}

// 重置
function handleReset() {
  searchForm.type = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  dateRange.value = []
  handleSearch()
}

// 选择变化
function handleSelectionChange(selection) {
  selectedIds.value = selection.map(item => item._id)
}

// 打开调整对话框
function openAdjustDialog() {
  adjustForm.balance = account.balance
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

// 提交调整
async function submitAdjust() {
  if (adjustForm.balance === account.balance) {
    ElMessage.warning('余额未发生变化')
    return
  }
  
  await setBalance(adjustForm.balance, adjustForm.remark)
  ElMessage.success('余额调整成功')
  adjustDialogVisible.value = false
  fetchAccount()
  fetchStats()
  fetchLogs()
}

// 编辑日志
function handleEdit(row) {
  currentEditId.value = row._id
  // 保存完整的详情数据用于只读展示
  logDetail.value = { ...row }
  // 设置编辑表单数据
  editForm.type = row.type
  editForm.amount = row.amount
  editForm.balanceBefore = row.balanceBefore
  editForm.balanceAfter = row.balanceAfter
  editForm.relatedOrderId = row.relatedOrderId || ''
  editForm.remark = row.remark || ''
  editForm.createdAt = row.createdAt
  editForm.updatedAt = row.updatedAt || ''
  editDialogVisible.value = true
}

// 获取额外字段的中文标签
function getExtraFieldLabel(key) {
  const labels = {
    orderId: '订单号',
    matchId: '比赛ID',
    league: '联赛',
    homeTeam: '主队',
    awayTeam: '客队',
    betType: '投注类型',
    selection: '选择项',
    odds: '赔率',
    potentialWin: '预计可赢',
    actualWin: '实际赢取',
    result: '结算结果',
    status: '状态',
    settledAt: '结算时间',
    userId: '用户ID',
    username: '用户名'
  }
  return labels[key] || key
}

// 判断是否为日期字段
function isDateField(key) {
  const dateFields = ['settledAt', 'betTime', 'matchTime', 'startTime', 'endTime']
  return dateFields.includes(key) || key.toLowerCase().includes('time') || key.toLowerCase().includes('date')
}

// 判断是否为金额字段
function isMoneyField(key) {
  const moneyFields = ['potentialWin', 'actualWin', 'betAmount', 'winAmount', 'balance', 'totalAmount']
  return moneyFields.includes(key) || key.toLowerCase().includes('amount') || key.toLowerCase().includes('win')
}

// 提交编辑
async function submitEdit() {
  await editFormRef.value?.validate()
  
  editLoading.value = true
  try {
    const submitData = {
      type: editForm.type,
      amount: editForm.amount,
      balanceBefore: editForm.balanceBefore,
      balanceAfter: editForm.balanceAfter,
      relatedOrderId: editForm.relatedOrderId || null,
      remark: editForm.remark || '',
      createdAt: editForm.createdAt,
      updatedAt: editForm.updatedAt || null
    }
    
    await updateBalanceLog(currentEditId.value, submitData)
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    fetchLogs()
    fetchStats()
  } catch (e) {
    console.error(e)
  } finally {
    editLoading.value = false
  }
}

// 删除日志
async function handleDelete(row) {
  await ElMessageBox.confirm('确定删除该日志吗？', '提示', { type: 'warning' })
  await deleteBalanceLog(row._id)
  ElMessage.success('删除成功')
  fetchLogs()
}

// 批量删除
async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条日志吗？`, '提示', { type: 'warning' })
  await batchDeleteBalanceLogs(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  fetchLogs()
}

// 格式化金额
function formatMoney(value) {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toFixed(2)
}

// 类型相关
function getTypeTagType(type) {
  const types = {
    bet: 'danger',
    win: 'success',
    deposit: 'primary',
    withdraw: 'warning',
    adjust: 'info'
  }
  return types[type] || 'info'
}

function getTypeText(type) {
  const texts = {
    bet: '投注',
    win: '中奖',
    deposit: '充值',
    withdraw: '提现',
    adjust: '调整'
  }
  return texts[type] || type
}

// 格式化日期
function formatDate(dateStr) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  fetchAccount()
  fetchStats()
  fetchLogs()
})
</script>

<style lang="less" scoped>
.account-manage {
  .account-overview {
    margin-bottom: 16px;
    
    .balance-card {
      .balance-content {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .balance-icon {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #fff;
        }
        
        .balance-info {
          flex: 1;
          
          .balance-label {
            font-size: 14px;
            color: #909399;
          }
          
          .balance-value {
            font-size: 28px;
            font-weight: bold;
            color: #303133;
          }
        }
      }
    }
    
    .stat-item {
      text-align: center;
      padding: 12px 0;
      
      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 20px;
        font-weight: bold;
        
        &.deposit {
          color: #409eff;
        }
        
        &.withdraw {
          color: #e6a23c;
        }
        
        &.bet {
          color: #f56c6c;
        }
        
        &.win {
          color: #67c23a;
        }
      }
    }
  }
  
  .logs-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .search-form {
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .amount-plus {
      color: #67c23a;
      font-weight: bold;
    }
    
    .amount-minus {
      color: #f56c6c;
      font-weight: bold;
    }
    
    .no-data {
      color: #c0c4cc;
    }
    
    .pagination-wrap {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .adjust-preview {
    margin-top: 16px;
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
  
  .detail-section,
  .edit-section {
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ebeef5;
      
      .el-icon {
        color: #409eff;
      }
      
      &.extra-title {
        margin-top: 16px;
        
        .el-icon {
          color: #e6a23c;
        }
      }
    }
  }
  
  .detail-section {
    background: #fafafa;
    padding: 16px;
    border-radius: 8px;
    height: 100%;
    
    :deep(.el-descriptions) {
      .el-descriptions__label {
        width: 90px;
        font-weight: 500;
      }
      
      .el-descriptions__content {
        word-break: break-all;
      }
    }
  }
  
  .edit-section {
    padding: 16px;
    border-left: 1px solid #ebeef5;
    height: 100%;
  }
}
</style>
