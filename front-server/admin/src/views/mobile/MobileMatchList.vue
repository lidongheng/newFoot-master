<template>
  <div class="mobile-page match-mobile-page" :class="{ 'has-batch-bar': manageMode }">
    <div class="mobile-toolbar">
      <van-search
        v-model="searchForm.keyword"
        shape="round"
        placeholder="搜索球队或比赛ID"
        @search="applyFilters"
        @clear="applyFilters"
      />
      <van-button class="toolbar-button" icon="filter-o" @click="filterVisible = true" />
    </div>

    <div class="mobile-action-row">
      <van-button block type="primary" icon="plus" @click="openCreate">新增比赛</van-button>
      <van-button block plain type="primary" @click="toggleManageMode">
        {{ manageMode ? '完成' : '批量管理' }}
      </van-button>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="refresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多比赛了" @load="onLoad">
        <article v-for="item in list" :key="item._id" class="mobile-card">
          <div class="card-main" @click="manageMode && toggleSelection(item._id)">
            <div class="card-title-row">
              <van-checkbox
                v-if="manageMode"
                class="manage-checkbox"
                :model-value="selectedIds.includes(item._id)"
                @click.stop="toggleSelection(item._id)"
              />
              <div class="card-title">{{ item.homeTeam }} vs {{ item.awayTeam }}</div>
              <van-tag :type="statusType(item.status)">{{ statusText(item.status) }}</van-tag>
            </div>
            <div class="card-meta-row card-subtitle">
              <span>{{ item.leagueIcon }} {{ item.league }}</span>
              <span>{{ item.matchId }}</span>
            </div>
            <div class="field-grid">
              <div>
                <div class="field-label">比分</div>
                <div class="field-value score-value">{{ item.homeScore }} - {{ item.awayScore }}</div>
              </div>
              <div>
                <div class="field-label">开赛时间</div>
                <div class="field-value date-value">{{ formatDate(item.startTime) }}</div>
              </div>
              <div>
                <div class="field-label">滚球盘口</div>
                <div class="field-value">
                  <span v-if="item.status === 'live'">{{ item.bettingOpen ? '开盘' : '封盘' }}</span>
                  <span v-else>-</span>
                </div>
              </div>
              <div>
                <div class="field-label">功能</div>
                <div class="field-value feature-tags">
                  <van-tag v-if="item.hasVideo" type="success">视频</van-tag>
                  <van-tag v-if="item.hasCashOut" type="warning">兑现</van-tag>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!manageMode" class="card-actions">
            <van-button plain type="primary" size="small" @click="openEdit(item)">编辑</van-button>
            <van-button plain type="success" size="small" @click="openScore(item)">比分</van-button>
            <van-button plain size="small" @click="openMore(item)">更多</van-button>
          </div>
        </article>
        <van-empty v-if="finished && !list.length" class="empty-state" description="暂无比赛" />
      </van-list>
    </van-pull-refresh>

    <div v-if="manageMode" class="mobile-batch-bar">
      <van-checkbox :model-value="allSelected" @click="toggleSelectAll">全选</van-checkbox>
      <span class="selection-count">已选 {{ selectedIds.length }} 项</span>
      <van-button type="danger" :disabled="!selectedIds.length" @click="batchRemove">删除</van-button>
    </div>

    <van-popup v-model:show="filterVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>筛选比赛</span><van-icon name="cross" @click="filterVisible = false" /></div>
      <div class="sheet-body">
        <van-field name="status" label="状态">
          <template #input>
            <van-radio-group v-model="searchForm.status" direction="horizontal">
              <van-radio name="">全部</van-radio>
              <van-radio name="upcoming">未开始</van-radio>
              <van-radio name="live">进行中</van-radio>
              <van-radio name="finished">已结束</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-model="searchForm.league" label="联赛" placeholder="输入联赛名称" clearable />
      </div>
      <div class="sheet-footer">
        <van-button block @click="resetFilters">重置</van-button>
        <van-button block type="primary" @click="applyFilters">确定</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="formVisible" position="right" class="mobile-full-popup">
      <van-nav-bar :title="isEdit ? '编辑比赛' : '新增比赛'" left-arrow @click-left="formVisible = false" />
      <div class="popup-body">
        <van-form ref="formRef">
          <section class="form-section">
            <div class="form-section-title">基础信息</div>
            <van-field v-model="formData.matchId" label="比赛ID" :disabled="isEdit" :rules="[{ required: true, message: '请输入比赛ID' }]" />
            <van-field v-model="formData.league" is-link readonly label="联赛" placeholder="请选择联赛" :rules="[{ required: true, message: '请选择联赛' }]" @click="leaguePickerVisible = true" />
            <van-field v-model="formData.homeTeam" label="主队" :rules="[{ required: true, message: '请输入主队名称' }]" />
            <van-field v-model="formData.awayTeam" label="客队" :rules="[{ required: true, message: '请输入客队名称' }]" />
            <van-field v-model="formData.startTime" label="开赛时间" type="datetime-local" :rules="[{ required: true, message: '请选择开赛时间' }]" />
            <van-field label="状态">
              <template #input>
                <van-radio-group v-model="formData.status" direction="horizontal">
                  <van-radio name="upcoming">未开始</van-radio>
                  <van-radio name="live">进行中</van-radio>
                  <van-radio name="finished">已结束</van-radio>
                </van-radio-group>
              </template>
            </van-field>
          </section>
          <section class="form-section switch-section">
            <van-cell title="视频"><template #right-icon><van-switch v-model="formData.hasVideo" size="22" /></template></van-cell>
            <van-cell title="兑现"><template #right-icon><van-switch v-model="formData.hasCashOut" size="22" /></template></van-cell>
            <van-cell title="滚球"><template #right-icon><van-switch v-model="formData.isLive" size="22" /></template></van-cell>
          </section>
          <OddsFields v-model="formData.odds" />
        </van-form>
      </div>
      <div class="popup-footer">
        <van-button block @click="formVisible = false">取消</van-button>
        <van-button block type="primary" :loading="submitLoading" @click="submitForm">提交</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="leaguePickerVisible" position="bottom" round>
      <van-picker
        title="选择联赛"
        :columns="leagueOptions.map(item => ({ text: item.name, value: item.name }))"
        @cancel="leaguePickerVisible = false"
        @confirm="confirmLeague"
      />
    </van-popup>

    <van-popup v-model:show="scoreVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>更新比分</span><van-icon name="cross" @click="scoreVisible = false" /></div>
      <div class="sheet-body stepper-sheet">
        <van-field label="主队比分"><template #input><van-stepper v-model="scoreForm.homeScore" min="0" integer /></template></van-field>
        <van-field label="客队比分"><template #input><van-stepper v-model="scoreForm.awayScore" min="0" integer /></template></van-field>
      </div>
      <div class="sheet-footer"><van-button block @click="scoreVisible = false">取消</van-button><van-button block type="primary" @click="submitScore">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="statusVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>更新状态</span><van-icon name="cross" @click="statusVisible = false" /></div>
      <div class="sheet-body">
        <van-radio-group v-model="statusForm.status">
          <van-cell-group inset>
            <van-cell title="未开始" clickable @click="statusForm.status = 'upcoming'"><template #right-icon><van-radio name="upcoming" /></template></van-cell>
            <van-cell title="进行中" clickable @click="statusForm.status = 'live'"><template #right-icon><van-radio name="live" /></template></van-cell>
            <van-cell title="已结束" clickable @click="statusForm.status = 'finished'"><template #right-icon><van-radio name="finished" /></template></van-cell>
          </van-cell-group>
        </van-radio-group>
      </div>
      <div class="sheet-footer"><van-button block @click="statusVisible = false">取消</van-button><van-button block type="primary" @click="submitStatus">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="liveVisible" position="right" class="mobile-full-popup">
      <van-nav-bar title="更新滚球数据" left-arrow @click-left="liveVisible = false" />
      <div class="popup-body">
        <section class="form-section">
          <div class="form-section-title">比赛状态</div>
          <van-field label="主队比分"><template #input><van-stepper v-model="liveForm.homeScore" min="0" integer /></template></van-field>
          <van-field label="客队比分"><template #input><van-stepper v-model="liveForm.awayScore" min="0" integer /></template></van-field>
          <van-field label="比赛分钟"><template #input><van-stepper v-model="liveForm.minute" min="0" integer /></template></van-field>
          <van-field v-model="liveForm.period" is-link readonly label="比赛阶段" placeholder="请选择比赛阶段" @click="periodPickerVisible = true" />
          <van-cell title="投注状态" :value="liveForm.bettingOpen ? '开盘' : '封盘'"><template #right-icon><van-switch v-model="liveForm.bettingOpen" size="22" /></template></van-cell>
        </section>
        <OddsFields v-model="liveForm.odds" />
      </div>
      <div class="popup-footer"><van-button block @click="liveVisible = false">取消</van-button><van-button block type="primary" :loading="liveSubmitLoading" @click="submitLive">提交</van-button></div>
    </van-popup>

    <van-popup v-model:show="periodPickerVisible" position="bottom" round>
      <van-picker
        title="选择比赛阶段"
        :columns="[
          { text: '上半场', value: '上半场' },
          { text: '中场', value: '中场' },
          { text: '下半场', value: '下半场' },
          { text: '加时赛', value: '加时赛' },
          { text: '点球大战', value: '点球大战' },
        ]"
        @cancel="periodPickerVisible = false"
        @confirm="confirmPeriod"
      />
    </van-popup>

    <van-action-sheet v-model:show="moreVisible" :actions="moreActions" cancel-text="取消" close-on-click-action @select="selectMore" />
  </div>
</template>

<script setup>
import OddsFields from '@/components/mobile/OddsFields.vue';
import { useMobileMatch } from '@/composables/mobile/useMobileMatch';

const state = useMobileMatch();
const {
  list, loading, refreshing, finished, onLoad, refresh, searchForm, filterVisible,
  manageMode, selectedIds, allSelected, leagueOptions, leaguePickerVisible, periodPickerVisible, formVisible, formRef, formData,
  isEdit, submitLoading, scoreVisible, scoreForm, statusVisible, statusForm, liveVisible,
  liveForm, liveSubmitLoading, moreVisible, moreActions, applyFilters, resetFilters,
  toggleManageMode, toggleSelection, toggleSelectAll, openCreate, openEdit, handleLeagueChange, confirmLeague, confirmPeriod,
  submitForm, openScore, submitScore, submitStatus, submitLive, batchRemove, openMore,
  selectMore, formatDate, statusText, statusType,
} = state;
</script>

<style lang="less" scoped>
.match-mobile-page {
  .score-value {
    color: #1989fa;
    font-size: 18px;
    font-weight: 700;
  }

  .feature-tags {
    display: flex;
    gap: 4px;
  }

  .date-value {
    max-width: 10ch;
  }

  .card-meta-row {
    margin-top: 6px;
  }
}
</style>
