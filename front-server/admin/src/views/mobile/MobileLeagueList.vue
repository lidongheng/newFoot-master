<template>
  <div class="mobile-page league-mobile-page" :class="{ 'has-batch-bar': manageMode }">
    <div class="mobile-toolbar">
      <van-search v-model="searchForm.keyword" shape="round" placeholder="搜索联赛名称或ID" @search="applyFilters" @clear="applyFilters" />
      <van-button class="toolbar-button" icon="filter-o" @click="filterVisible = true" />
    </div>
    <div class="mobile-action-row">
      <van-button block type="primary" icon="plus" @click="openCreate">新增联赛</van-button>
      <van-button block plain type="primary" @click="toggleManageMode">{{ manageMode ? '完成' : '批量管理' }}</van-button>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="refresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多联赛了" @load="onLoad">
        <article v-for="item in list" :key="item._id" class="mobile-card">
          <div class="card-main" @click="manageMode && toggleSelection(item._id)">
            <div class="card-title-row">
              <van-checkbox v-if="manageMode" class="manage-checkbox" :model-value="selectedIds.includes(item._id)" @click.stop="toggleSelection(item._id)" />
              <span class="league-flag">{{ item.flag }}</span>
              <div class="card-title">{{ item.name }}</div>
              <van-tag type="primary">{{ item.matchCount }} 场</van-tag>
            </div>
            <div class="field-grid">
              <div><div class="field-label">联赛ID</div><div class="field-value">{{ item.leagueId }}</div></div>
              <div><div class="field-label">国家</div><div class="field-value">{{ item.country }}</div></div>
            </div>
            <div class="card-time">创建于 {{ formatDate(item.createdAt) }}</div>
          </div>
          <div v-if="!manageMode" class="card-actions"><van-button plain type="primary" size="small" @click="openMore(item)">管理</van-button></div>
        </article>
        <van-empty v-if="finished && !list.length" class="empty-state" description="暂无联赛" />
      </van-list>
    </van-pull-refresh>

    <div v-if="manageMode" class="mobile-batch-bar">
      <van-checkbox :model-value="allSelected" @click="toggleSelectAll">全选</van-checkbox>
      <span class="selection-count">已选 {{ selectedIds.length }} 项</span>
      <van-button type="danger" :disabled="!selectedIds.length" @click="batchRemove">删除</van-button>
    </div>

    <van-popup v-model:show="filterVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>筛选联赛</span><van-icon name="cross" @click="filterVisible = false" /></div>
      <div class="sheet-body">
        <van-field v-model="searchForm.country" is-link readonly label="国家" placeholder="全部国家" @click="countryPickerVisible = true" />
      </div>
      <div class="sheet-footer"><van-button block @click="resetFilters">重置</van-button><van-button block type="primary" @click="applyFilters">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="countryPickerVisible" position="bottom" round>
      <van-picker :columns="[{ text: '全部国家', value: '' }, ...countryOptions.map(item => ({ text: item, value: item }))]" @cancel="countryPickerVisible = false" @confirm="confirmCountry" />
    </van-popup>

    <van-popup v-model:show="formVisible" position="right" class="mobile-full-popup">
      <van-nav-bar :title="isEdit ? '编辑联赛' : '新增联赛'" left-arrow @click-left="formVisible = false" />
      <div class="popup-body">
        <van-form ref="formRef">
          <section class="form-section">
            <van-field v-model="formData.leagueId" label="联赛ID" :disabled="isEdit" :rules="[{ required: true, message: '请输入联赛ID' }]" />
            <van-field v-model="formData.name" label="联赛名称" :rules="[{ required: true, message: '请输入联赛名称' }]" />
            <van-field v-model="formData.country" label="国家" :rules="[{ required: true, message: '请输入国家' }]" />
            <van-field v-model="formData.flag" label="国旗" placeholder="国旗 emoji" />
            <van-cell v-if="formData.flag" title="国旗预览"><span class="flag-preview">{{ formData.flag }}</span></van-cell>
            <van-field label="比赛数量"><template #input><van-stepper v-model="formData.matchCount" min="0" integer /></template></van-field>
          </section>
        </van-form>
      </div>
      <div class="popup-footer"><van-button block @click="formVisible = false">取消</van-button><van-button block type="primary" :loading="submitLoading" @click="submitForm">提交</van-button></div>
    </van-popup>

    <van-action-sheet v-model:show="moreVisible" :actions="moreActions" cancel-text="取消" close-on-click-action @select="selectMore" />
  </div>
</template>

<script setup>
import { useMobileLeague } from '@/composables/mobile/useMobileLeague';

const state = useMobileLeague();
const {
  list, loading, refreshing, finished, onLoad, refresh, searchForm, filterVisible,
  manageMode, selectedIds, allSelected, countryOptions, countryPickerVisible, formVisible, formRef, formData,
  isEdit, submitLoading, moreVisible, moreActions, applyFilters, resetFilters,
  toggleManageMode, toggleSelection, toggleSelectAll, openCreate, submitForm, batchRemove, confirmCountry,
  openMore, selectMore, formatDate,
} = state;
</script>

<style lang="less" scoped>
.league-mobile-page {
  .league-flag {
    flex: none;
    font-size: 26px;
  }

  .card-time {
    margin-top: 14px;
  }

  .flag-preview {
    font-size: 28px;
  }
}
</style>
