<template>
  <div class="mobile-page account-mobile-page" :class="{ 'has-batch-bar': manageMode }">
    <section class="balance-panel">
      <div><div class="balance-label">当前余额</div><div class="balance-value">¥{{ formatMoney(account.balance) }}</div></div>
      <van-button type="primary" @click="openAdjust">调整余额</van-button>
    </section>
    <div class="stats-grid">
      <div><span>总充值</span><strong class="deposit">¥{{ formatMoney(balanceStats.totalDeposit) }}</strong></div>
      <div><span>总提现</span><strong class="withdraw">¥{{ formatMoney(balanceStats.totalWithdraw) }}</strong></div>
      <div><span>总投注</span><strong class="bet">¥{{ formatMoney(balanceStats.totalBet) }}</strong></div>
      <div><span>总赢取</span><strong class="win">¥{{ formatMoney(balanceStats.totalWin) }}</strong></div>
    </div>

    <div class="section-heading"><strong>余额变动日志</strong><van-button plain type="primary" size="small" @click="toggleManageMode">{{ manageMode ? '完成' : '批量管理' }}</van-button></div>
    <div class="mobile-toolbar"><div class="filter-summary">{{ searchForm.type ? typeText(searchForm.type) : '全部类型' }}</div><van-button class="toolbar-button" icon="filter-o" @click="filterVisible = true">筛选</van-button></div>

    <van-pull-refresh v-model="refreshing" @refresh="refreshAll">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多日志了" @load="onLoad">
        <article v-for="item in list" :key="item._id" class="mobile-card">
          <div class="card-main" @click="manageMode && toggleSelection(item._id)">
            <div class="card-title-row">
              <van-checkbox v-if="manageMode" class="manage-checkbox" :model-value="selectedIds.includes(item._id)" @click.stop="toggleSelection(item._id)" />
              <van-tag :type="typeTag(item.type)">{{ typeText(item.type) }}</van-tag>
              <div class="amount-value" :class="item.amount >= 0 ? 'amount-plus' : 'amount-minus'">{{ item.amount >= 0 ? '+' : '' }}¥{{ formatMoney(item.amount) }}</div>
            </div>
            <div class="field-grid">
              <div><div class="field-label">变动前余额</div><div class="field-value">¥{{ formatMoney(item.balanceBefore) }}</div></div>
              <div><div class="field-label">变动后余额</div><div class="field-value">¥{{ formatMoney(item.balanceAfter) }}</div></div>
              <div><div class="field-label">关联订单</div><div class="field-value">{{ item.relatedOrderId || '-' }}</div></div>
              <div><div class="field-label">备注</div><div class="field-value">{{ item.remark || '-' }}</div></div>
            </div>
            <div class="card-time">{{ formatDate(item.createdAt) }}</div>
          </div>
          <div v-if="!manageMode" class="card-actions"><van-button plain type="primary" size="small" @click="openMore(item)">管理</van-button></div>
        </article>
        <van-empty v-if="finished && !list.length" class="empty-state" description="暂无余额日志" />
      </van-list>
    </van-pull-refresh>

    <div v-if="manageMode" class="mobile-batch-bar"><van-checkbox :model-value="allSelected" @click="toggleSelectAll">全选</van-checkbox><span class="selection-count">已选 {{ selectedIds.length }} 项</span><van-button type="danger" :disabled="!selectedIds.length" @click="batchRemove">删除</van-button></div>

    <van-popup v-model:show="filterVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>筛选日志</span><van-icon name="cross" @click="filterVisible = false" /></div>
      <div class="sheet-body">
        <van-field label="类型"><template #input><van-radio-group v-model="searchForm.type" direction="horizontal"><van-radio name="">全部</van-radio><van-radio name="bet">投注</van-radio><van-radio name="win">中奖</van-radio><van-radio name="deposit">充值</van-radio><van-radio name="withdraw">提现</van-radio><van-radio name="adjust">调整</van-radio></van-radio-group></template></van-field>
        <van-field v-model="searchForm.startDate" type="date" label="开始日期" />
        <van-field v-model="searchForm.endDate" type="date" label="结束日期" />
      </div>
      <div class="sheet-footer"><van-button block @click="resetFilters">重置</van-button><van-button block type="primary" @click="applyFilters">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="adjustVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>调整余额</span><van-icon name="cross" @click="adjustVisible = false" /></div>
      <div class="sheet-body">
        <van-cell title="当前余额" :value="`¥${formatMoney(account.balance)}`" />
        <van-field label="新余额"><template #input><van-stepper v-model="adjustForm.balance" min="0" :step="1" :decimal-length="2" /></template></van-field>
        <van-field v-model="adjustForm.remark" label="备注" placeholder="请输入调整原因" />
        <van-notice-bar v-if="adjustPreviewText" wrapable :scrollable="false">{{ adjustPreviewText }}</van-notice-bar>
      </div>
      <div class="sheet-footer"><van-button block @click="adjustVisible = false">取消</van-button><van-button block type="primary" :loading="adjustLoading" @click="submitAdjust">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="editVisible" position="right" class="mobile-full-popup">
      <van-nav-bar title="编辑余额日志" left-arrow @click-left="editVisible = false" />
      <div class="popup-body">
        <section class="form-section detail-section">
          <div class="form-section-title">日志详情</div>
          <van-cell title="日志ID" :value="logDetail._id" />
          <van-cell title="类型" :value="typeText(logDetail.type)" />
          <van-cell title="创建时间" :value="formatDate(logDetail.createdAt)" />
          <van-cell v-for="(value, key) in extraDetails" :key="key" :title="extraFieldLabel(key)" :value="formatExtraValue(key, value)" />
        </section>
        <van-form ref="editFormRef">
          <section class="form-section">
            <div class="form-section-title">编辑信息</div>
            <van-field label="类型"><template #input><van-radio-group v-model="editForm.type" direction="horizontal"><van-radio name="bet">投注</van-radio><van-radio name="win">中奖</van-radio><van-radio name="deposit">充值</van-radio><van-radio name="withdraw">提现</van-radio><van-radio name="adjust">调整</van-radio></van-radio-group></template></van-field>
            <van-field v-model="editForm.amount" label="变动金额" type="number" />
            <van-field label="变动前"><template #input><van-stepper v-model="editForm.balanceBefore" min="0" :step="1" :decimal-length="2" /></template></van-field>
            <van-field label="变动后"><template #input><van-stepper v-model="editForm.balanceAfter" min="0" :step="1" :decimal-length="2" /></template></van-field>
            <van-field v-model="editForm.relatedOrderId" label="关联订单" />
            <van-field v-model="editForm.remark" label="备注" type="textarea" rows="2" autosize />
            <van-field v-model="editForm.createdAt" label="创建时间" type="datetime-local" :rules="[{ required: true, message: '请选择创建时间' }]" />
            <van-field v-model="editForm.updatedAt" label="更新时间" type="datetime-local" />
          </section>
        </van-form>
      </div>
      <div class="popup-footer"><van-button block @click="editVisible = false">取消</van-button><van-button block type="primary" :loading="editLoading" @click="submitEdit">提交</van-button></div>
    </van-popup>

    <van-action-sheet v-model:show="moreVisible" :actions="moreActions" cancel-text="取消" close-on-click-action @select="selectMore" />
  </div>
</template>

<script setup>
import { useMobileAccount } from '@/composables/mobile/useMobileAccount';

const {
  list, loading, refreshing, finished, onLoad, account, balanceStats, searchForm,
  filterVisible, manageMode, selectedIds, allSelected, adjustVisible, adjustLoading,
  adjustForm, adjustPreviewText, editVisible, editLoading, editFormRef, editForm,
  logDetail, extraDetails, moreVisible, moreActions, refreshAll, applyFilters, resetFilters,
  toggleManageMode, toggleSelection, toggleSelectAll, openAdjust, submitAdjust, submitEdit,
  batchRemove, openMore, selectMore, formatMoney, formatDate, typeText, typeTag,
  extraFieldLabel, formatExtraValue,
} = useMobileAccount();
</script>

<style lang="less" scoped>
.account-mobile-page {
  .balance-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 18px;
    border-radius: 14px;
    color: #fff;
    background: linear-gradient(135deg, #276ef1, #6c5ce7);

    > div {
      min-width: 0;
    }

    .van-button {
      flex: none;
      height: 36px;
      padding: 0 14px;
      border-color: #fff;
      border-radius: 8px;
      color: #276ef1;
      background: #fff;
      white-space: nowrap;
    }
  }

  .balance-label {
    margin-bottom: 6px;
    font-size: 13px;
    opacity: 0.8;
  }

  .balance-value {
    overflow-wrap: anywhere;
    font-size: 26px;
    font-weight: 700;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 16px;

    > div {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      padding: 14px;
      border-radius: 10px;
      background: #fff;
    }

    span {
      color: #86909c;
      font-size: 12px;
    }

    strong {
      font-size: clamp(13px, 4vw, 16px);
      white-space: nowrap;
    }
  }

  .deposit { color: #1989fa; }
  .withdraw { color: #ff976a; }
  .bet { color: #ee0a24; }
  .win { color: #07c160; }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .section-heading .van-button {
    flex: none;
    height: 32px;
    padding: 0 12px;
    border-radius: 7px;
    white-space: nowrap;
  }

  .filter-summary {
    flex: 1;
    color: #646a73;
    font-size: 14px;
  }

  .amount-value {
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
    margin-left: auto;
    font-size: 17px;
    font-weight: 700;
  }

  .amount-plus { color: #07c160; }
  .amount-minus { color: #ee0a24; }
  .card-time { margin-top: 12px; }

  @media (max-width: 359px) {
    .balance-panel {
      align-items: stretch;
      flex-direction: column;
      gap: 14px;

      .van-button {
        align-self: flex-start;
      }
    }
  }
}
</style>
