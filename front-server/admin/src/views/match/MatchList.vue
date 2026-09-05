<template>
  <div class="match-list">
    <!-- 搜索卡片 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="未开始" value="upcoming" />
            <el-option label="进行中" value="live" />
            <el-option label="已结束" value="finished" />
          </el-select>
        </el-form-item>
        <el-form-item label="联赛">
          <el-input v-model="searchForm.league" placeholder="联赛名称" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="球队/比赛ID" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增比赛</el-button>
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
        <el-table-column prop="matchId" label="比赛ID" width="160" show-overflow-tooltip />
        <el-table-column label="联赛" width="180">
          <template #default="{ row }">
            <span>{{ row.leagueIcon }} {{ row.league }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="homeTeam" label="主队" width="120" />
        <el-table-column prop="awayTeam" label="客队" width="120" />
        <el-table-column label="比分" width="80" align="center">
          <template #default="{ row }">
            <span class="score">{{ row.homeScore }} - {{ row.awayScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="滚球盘口" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'live'" :type="row.bettingOpen ? 'success' : 'info'" size="small">
              {{ row.bettingOpen ? '开盘' : '封盘' }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="开赛时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="功能" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.hasVideo" type="success" size="small" class="func-tag">视频</el-tag>
            <el-tag v-if="row.hasCashOut" type="warning" size="small" class="func-tag">兑现</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="success" link @click="handleUpdateScore(row)">比分</el-button>
            <el-button size="small" type="warning" link @click="handleUpdateStatus(row)">状态</el-button>
            <el-button
              size="small"
              type="success"
              link
              :disabled="row.status !== 'live'"
              @click="handleUpdateLive(row)"
            >
              滚球
            </el-button>
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
      :title="isEdit ? '编辑比赛' : '新增比赛'"
      width="800px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="比赛ID" prop="matchId">
              <el-input v-model="formData.matchId" placeholder="如: EPL_2026_01_20_001" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联赛" prop="league">
              <el-select v-model="formData.league" placeholder="选择联赛" style="width: 100%" @change="handleLeagueChange">
                <el-option
                  v-for="item in leagueOptions"
                  :key="item.leagueId"
                  :label="item.flag + ' ' + item.name"
                  :value="item.name"
                />
              </el-select>
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
            <el-form-item label="开赛时间" prop="startTime">
              <el-date-picker
                v-model="formData.startTime"
                type="datetime"
                placeholder="选择开赛时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" style="width: 100%">
                <el-option label="未开始" value="upcoming" />
                <el-option label="进行中" value="live" />
                <el-option label="已结束" value="finished" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="视频">
              <el-switch v-model="formData.hasVideo" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="兑现">
              <el-switch v-model="formData.hasCashOut" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="滚球">
              <el-switch v-model="formData.isLive" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 赔率设置 -->
        <el-divider content-position="left">赔率设置</el-divider>
        
        <el-form-item label="让球水位">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="6">
              <el-input v-model="formData.odds.handicap.home.value" placeholder="主队盘口">
                <template #prepend>主</template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="formData.odds.handicap.home.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
            <el-col :span="6">
              <el-input v-model="formData.odds.handicap.away.value" placeholder="客队盘口">
                <template #prepend>客</template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="formData.odds.handicap.away.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
          </el-row>
        </el-form-item>
        
        <el-form-item label="大小球水位">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="6">
              <el-input v-model="formData.odds.overUnder.over.value" placeholder="如: 大 2.5">
                <template #prepend>大</template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="formData.odds.overUnder.over.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
            <el-col :span="6">
              <el-input v-model="formData.odds.overUnder.under.value" placeholder="如: 小 2.5">
                <template #prepend>小</template>
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="formData.odds.overUnder.under.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
          </el-row>
        </el-form-item>
        
        <el-form-item label="独赢盘">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="8">
              <el-input-number v-model="formData.odds.moneyline.home.odds" :precision="2" :step="0.01" :min="0.01">
                <template #prepend>主胜</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="formData.odds.moneyline.draw.odds" :precision="2" :step="0.01" :min="0.01">
                <template #prepend>平局</template>
              </el-input-number>
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="formData.odds.moneyline.away.odds" :precision="2" :step="0.01" :min="0.01">
                <template #prepend>客胜</template>
              </el-input-number>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 更新比分对话框 -->
    <el-dialog v-model="scoreDialogVisible" title="更新比分" width="400px">
      <el-form label-width="80px">
        <el-form-item label="主队比分">
          <el-input-number v-model="scoreForm.homeScore" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="客队比分">
          <el-input-number v-model="scoreForm.awayScore" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitScore">确定</el-button>
      </template>
    </el-dialog>

    <!-- 更新状态对话框 -->
    <el-dialog v-model="statusDialogVisible" title="更新状态" width="400px">
      <el-form label-width="80px">
        <el-form-item label="状态">
          <el-select v-model="statusForm.status" style="width: 100%">
            <el-option label="未开始" value="upcoming" />
            <el-option label="进行中" value="live" />
            <el-option label="已结束" value="finished" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatus">确定</el-button>
      </template>
    </el-dialog>

    <!-- 滚球数据必须一次提交，确保比分和盘口使用同一版本 -->
    <el-dialog v-model="liveDialogVisible" title="更新滚球数据" width="800px" destroy-on-close>
      <el-form label-width="90px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="主队比分">
              <el-input-number v-model="liveForm.homeScore" :min="0" :step="1" step-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="客队比分">
              <el-input-number v-model="liveForm.awayScore" :min="0" :step="1" step-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="比赛分钟">
              <el-input-number v-model="liveForm.minute" :min="0" :step="1" step-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="比赛阶段">
              <el-select v-model="liveForm.period" style="width: 100%">
                <el-option label="上半场" value="上半场" />
                <el-option label="中场" value="中场" />
                <el-option label="下半场" value="下半场" />
                <el-option label="加时赛" value="加时赛" />
                <el-option label="点球大战" value="点球大战" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="投注状态">
          <el-switch
            v-model="liveForm.bettingOpen"
            active-text="开盘"
            inactive-text="封盘"
          />
        </el-form-item>

        <el-divider content-position="left">滚球赔率</el-divider>

        <el-form-item label="让球水位">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="6">
              <el-input v-model="liveForm.odds.handicap.home.value" placeholder="主队盘口" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="liveForm.odds.handicap.home.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
            <el-col :span="6">
              <el-input v-model="liveForm.odds.handicap.away.value" placeholder="客队盘口" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="liveForm.odds.handicap.away.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item label="大小球水位">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="6">
              <el-input v-model="liveForm.odds.overUnder.over.value" placeholder="大球盘口" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="liveForm.odds.overUnder.over.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
            <el-col :span="6">
              <el-input v-model="liveForm.odds.overUnder.under.value" placeholder="小球盘口" />
            </el-col>
            <el-col :span="6">
              <el-input-number v-model="liveForm.odds.overUnder.under.odds" :precision="2" :step="0.01" :min="0.01" />
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item label="独赢盘">
          <el-row :gutter="20" style="width: 100%">
            <el-col :span="8">
              <el-input-number v-model="liveForm.odds.moneyline.home.odds" :precision="2" :step="0.01" :min="0.01" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="liveForm.odds.moneyline.draw.odds" :precision="2" :step="0.01" :min="0.01" style="width: 100%" />
            </el-col>
            <el-col :span="8">
              <el-input-number v-model="liveForm.odds.moneyline.away.odds" :precision="2" :step="0.01" :min="0.01" style="width: 100%" />
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="liveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="liveSubmitLoading" @click="submitLiveData">确定</el-button>
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
  getMatchList,
  createMatch,
  updateMatch,
  deleteMatch,
  batchDeleteMatches,
  updateMatchStatus,
  updateMatchScore,
  updateLiveMatch
} from '@/api/match'
import { getAllLeagues } from '@/api/league'

const loading = ref(false)
const tableData = ref([])
const selectedIds = ref([])
const leagueOptions = ref([])

// 搜索表单
const searchForm = reactive({
  status: '',
  league: '',
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

// 默认赔率数据
const defaultOdds = {
  handicap: {
    home: { value: '-0.5', odds: 0.90 },
    away: { value: '+0.5', odds: 0.90 }
  },
  overUnder: {
    over: { value: '大 2.5', odds: 0.90 },
    under: { value: '小 2.5', odds: 0.90 }
  },
  moneyline: {
    home: { label: '主', odds: 2.00 },
    draw: { label: '和', odds: 3.20 },
    away: { label: '客', odds: 3.50 }
  }
}

// 表单数据
const formData = reactive({
  matchId: '',
  league: '',
  leagueIcon: '',
  homeTeam: '',
  awayTeam: '',
  startTime: '',
  status: 'upcoming',
  hasVideo: true,
  hasCashOut: true,
  isLive: false,
  odds: JSON.parse(JSON.stringify(defaultOdds))
})

// 专用滚球更新表单
const liveDialogVisible = ref(false)
const liveSubmitLoading = ref(false)
const liveForm = reactive({
  id: '',
  homeScore: 0,
  awayScore: 0,
  minute: 0,
  period: '',
  bettingOpen: false,
  odds: JSON.parse(JSON.stringify(defaultOdds))
})

// 表单验证规则
const formRules = {
  matchId: [{ required: true, message: '请输入比赛ID', trigger: 'blur' }],
  league: [{ required: true, message: '请选择联赛', trigger: 'change' }],
  homeTeam: [{ required: true, message: '请输入主队名称', trigger: 'blur' }],
  awayTeam: [{ required: true, message: '请输入客队名称', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开赛时间', trigger: 'change' }]
}

// 比分对话框
const scoreDialogVisible = ref(false)
const scoreForm = reactive({
  id: '',
  homeScore: 0,
  awayScore: 0
})

// 状态对话框
const statusDialogVisible = ref(false)
const statusForm = reactive({
  id: '',
  status: ''
})

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    const data = await getMatchList({
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

// 获取联赛选项
async function fetchLeagues() {
  try {
    const data = await getAllLeagues()
    leagueOptions.value = data || []
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
  searchForm.status = ''
  searchForm.league = ''
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
    matchId: row.matchId,
    league: row.league,
    leagueIcon: row.leagueIcon,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    startTime: row.startTime,
    status: row.status,
    hasVideo: row.hasVideo,
    hasCashOut: row.hasCashOut,
    isLive: row.isLive,
    odds: row.odds ? JSON.parse(JSON.stringify(row.odds)) : JSON.parse(JSON.stringify(defaultOdds))
  })
}

// 重置表单
function resetForm() {
  formData.matchId = ''
  formData.league = ''
  formData.leagueIcon = ''
  formData.homeTeam = ''
  formData.awayTeam = ''
  formData.startTime = ''
  formData.status = 'upcoming'
  formData.hasVideo = true
  formData.hasCashOut = true
  formData.isLive = false
  formData.odds = JSON.parse(JSON.stringify(defaultOdds))
}

// 联赛选择变化
function handleLeagueChange(val) {
  const league = leagueOptions.value.find(item => item.name === val)
  if (league) {
    formData.leagueIcon = league.flag
  }
}

// 提交表单
async function handleSubmit() {
  await formRef.value?.validate()
  
  submitLoading.value = true
  try {
    const submitData = {
      ...formData,
      startTime: new Date(formData.startTime).toISOString()
    }
    
    if (isEdit.value) {
      await updateMatch(currentEditId.value, submitData)
      ElMessage.success('更新成功')
    } else {
      await createMatch(submitData)
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
  await ElMessageBox.confirm('确定删除该比赛吗？', '提示', { type: 'warning' })
  await deleteMatch(row._id)
  ElMessage.success('删除成功')
  fetchData()
}

// 批量删除
async function handleBatchDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 场比赛吗？`, '提示', { type: 'warning' })
  await batchDeleteMatches(selectedIds.value)
  ElMessage.success('批量删除成功')
  selectedIds.value = []
  fetchData()
}

// 更新比分
function handleUpdateScore(row) {
  scoreForm.id = row._id
  scoreForm.homeScore = row.homeScore || 0
  scoreForm.awayScore = row.awayScore || 0
  scoreDialogVisible.value = true
}

async function submitScore() {
  await updateMatchScore(scoreForm.id, scoreForm.homeScore, scoreForm.awayScore)
  ElMessage.success('比分更新成功')
  scoreDialogVisible.value = false
  fetchData()
}

// 更新状态
function handleUpdateStatus(row) {
  statusForm.id = row._id
  statusForm.status = row.status
  statusDialogVisible.value = true
}

async function submitStatus() {
  await updateMatchStatus(statusForm.id, statusForm.status)
  ElMessage.success('状态更新成功')
  statusDialogVisible.value = false
  fetchData()
}

function handleUpdateLive(row) {
  liveForm.id = row._id
  liveForm.homeScore = row.homeScore
  liveForm.awayScore = row.awayScore
  liveForm.minute = row.minute
  liveForm.period = row.period
  liveForm.bettingOpen = row.bettingOpen
  liveForm.odds = JSON.parse(JSON.stringify(row.odds))
  liveDialogVisible.value = true
}

function validateLiveForm() {
  if (
    !Number.isInteger(liveForm.homeScore) ||
    liveForm.homeScore < 0 ||
    !Number.isInteger(liveForm.awayScore) ||
    liveForm.awayScore < 0 ||
    !Number.isInteger(liveForm.minute) ||
    liveForm.minute < 0
  ) {
    ElMessage.error('比分和比赛分钟必须为非负整数')
    return false
  }

  if (!liveForm.period) {
    ElMessage.error('请选择比赛阶段')
    return false
  }

  const quotes = [
    liveForm.odds.handicap.home,
    liveForm.odds.handicap.away,
    liveForm.odds.overUnder.over,
    liveForm.odds.overUnder.under,
    liveForm.odds.moneyline.home,
    liveForm.odds.moneyline.draw,
    liveForm.odds.moneyline.away
  ]
  if (quotes.some(quote => !Number.isFinite(quote.odds) || quote.odds <= 0)) {
    ElMessage.error('所有赔率必须为有效正数')
    return false
  }

  const marketValues = [
    liveForm.odds.handicap.home.value,
    liveForm.odds.handicap.away.value,
    liveForm.odds.overUnder.over.value,
    liveForm.odds.overUnder.under.value
  ]
  if (marketValues.some(value => !value.trim())) {
    ElMessage.error('让球和大小球盘口不能为空')
    return false
  }

  return true
}

async function submitLiveData() {
  if (!validateLiveForm()) return

  liveSubmitLoading.value = true
  try {
    await updateLiveMatch(liveForm.id, {
      homeScore: liveForm.homeScore,
      awayScore: liveForm.awayScore,
      minute: liveForm.minute,
      period: liveForm.period,
      bettingOpen: liveForm.bettingOpen,
      odds: JSON.parse(JSON.stringify(liveForm.odds))
    })
    ElMessage.success('滚球数据更新成功')
    liveDialogVisible.value = false
    fetchData()
  } catch (e) {
    console.error(e)
  } finally {
    liveSubmitLoading.value = false
  }
}

// 状态相关
function getStatusType(status) {
  const types = {
    upcoming: 'info',
    live: 'success',
    finished: 'warning'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    upcoming: '未开始',
    live: '进行中',
    finished: '已结束'
  }
  return texts[status] || status
}

// 格式化日期
function formatDate(dateStr) {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  fetchData()
  fetchLeagues()
})
</script>

<style lang="less" scoped>
.match-list {
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
  
  .score {
    font-weight: bold;
    color: #409eff;
  }
  
  .func-tag {
    margin-right: 4px;
  }
  
  .pagination-wrap {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
