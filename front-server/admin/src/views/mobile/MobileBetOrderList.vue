<template>
  <div class="mobile-page bet-order-mobile-page" :class="{ 'has-batch-bar': manageMode }">
    <div class="stats-grid">
      <div class="stat-box"><span class="stat-label">总投注金额</span><strong>¥{{ formatMoney(stats.totalAmount) }}</strong></div>
      <div class="stat-box"><span class="stat-label">总预计可赢</span><strong>¥{{ formatMoney(stats.totalPotentialWin) }}</strong></div>
      <div class="stat-box"><span class="stat-label">总实际赢取</span><strong>¥{{ formatMoney(stats.totalActualWin) }}</strong></div>
      <div class="stat-box"><span class="stat-label">待结算</span><strong>{{ stats.pendingCount }} 单</strong></div>
    </div>

    <div class="mobile-toolbar">
      <van-search v-model="searchForm.keyword" shape="round" placeholder="搜索订单号、球队或联赛" @search="applyFilters" @clear="applyFilters" />
      <van-button class="toolbar-button" icon="filter-o" @click="filterVisible = true" />
    </div>
    <div class="mobile-action-row">
      <van-button block type="primary" icon="plus" @click="openCreate">新增订单</van-button>
      <van-button block plain type="primary" @click="toggleManageMode">{{ manageMode ? '完成' : '批量管理' }}</van-button>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="refresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多订单了" @load="onLoad">
        <article v-for="item in list" :key="item._id" class="mobile-card">
          <div class="card-main" @click="manageMode && toggleSelection(item)">
            <div class="card-title-row">
              <van-checkbox v-if="manageMode" class="manage-checkbox" :model-value="selectedIds.includes(item._id)" @click.stop="toggleSelection(item)" />
              <div class="card-title">{{ item.homeTeam }} vs {{ item.awayTeam }}</div>
              <van-tag :type="statusType(item.status)">{{ statusText(item.status) }}</van-tag>
            </div>
            <div class="card-meta-row card-subtitle"><span>{{ item.league }}</span><span>{{ item.orderId }}</span></div>
            <div class="bet-summary">
              <span>{{ item.betType }}</span>
              <strong>{{ item.selection }} <small v-if="item.value">({{ item.value }})</small></strong>
              <span class="odds-text">@ {{ item.odds }}</span>
            </div>
            <div class="field-grid">
              <div><div class="field-label">投注金额</div><div class="field-value">¥{{ formatMoney(item.amount) }}</div></div>
              <div><div class="field-label">预计可赢</div><div class="field-value potential-text">¥{{ formatMoney(item.potentialWin) }}</div></div>
              <div><div class="field-label">结算结果</div><div class="field-value"><van-tag v-if="item.result" :type="resultType(item.result)">{{ resultText(item.result) }}</van-tag><span v-else>-</span></div></div>
              <div><div class="field-label">实际赢取</div><div class="field-value"><span v-if="item.actualWin !== null">¥{{ formatMoney(item.actualWin) }}</span><span v-else>-</span></div></div>
            </div>
            <div class="card-time">下注于 {{ formatDate(item.createdAt) }}</div>
          </div>
          <div v-if="!manageMode" class="card-actions">
            <van-button v-if="item.status === 'pending'" plain type="success" size="small" @click="openMore(item)">结算/管理</van-button>
            <van-button v-else plain type="primary" size="small" @click="openMore(item)">管理</van-button>
          </div>
        </article>
        <van-empty v-if="finished && !list.length" class="empty-state" description="暂无投注订单" />
      </van-list>
    </van-pull-refresh>

    <div v-if="manageMode" class="mobile-batch-bar order-batch-bar">
      <van-checkbox :model-value="allSelected" @click="toggleSelectAll">全选</van-checkbox>
      <span class="selection-count">已选 {{ selectedIds.length }} 项</span>
      <van-button type="success" :disabled="!selectedPendingIds.length" @click="openBatchSettle">结算 {{ selectedPendingIds.length }}</van-button>
      <van-button type="danger" :disabled="!selectedIds.length" @click="batchRemove">删除</van-button>
    </div>

    <van-popup v-model:show="filterVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>筛选订单</span><van-icon name="cross" @click="filterVisible = false" /></div>
      <div class="sheet-body">
        <van-field label="状态"><template #input><van-radio-group v-model="searchForm.status" direction="horizontal"><van-radio name="">全部</van-radio><van-radio name="pending">待结算</van-radio><van-radio name="settled">已结算</van-radio><van-radio name="cancelled">已取消</van-radio></van-radio-group></template></van-field>
        <van-field label="结果"><template #input><van-radio-group v-model="searchForm.result" direction="horizontal"><van-radio name="">全部</van-radio><van-radio name="win">赢</van-radio><van-radio name="lose">输</van-radio><van-radio name="push">走水</van-radio><van-radio name="half_win">赢半</van-radio><van-radio name="half_lose">输半</van-radio></van-radio-group></template></van-field>
        <van-field v-model="searchForm.startDate" type="date" label="开始日期" />
        <van-field v-model="searchForm.endDate" type="date" label="结束日期" />
      </div>
      <div class="sheet-footer"><van-button block @click="resetFilters">重置</van-button><van-button block type="primary" @click="applyFilters">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="formVisible" position="right" class="mobile-full-popup">
      <van-nav-bar :title="isEdit ? '编辑订单' : '新增订单'" left-arrow @click-left="formVisible = false" />
      <div class="popup-body">
        <van-form ref="formRef">
          <section class="form-section">
            <div class="form-section-title">比赛信息</div>
            <van-field v-model="formData.matchId" label="比赛ID" :rules="[{ required: true, message: '请输入比赛ID' }]" />
            <van-field v-model="formData.league" label="联赛" :rules="[{ required: true, message: '请输入联赛' }]" />
            <van-field v-model="formData.homeTeam" label="主队" :rules="[{ required: true, message: '请输入主队' }]" />
            <van-field v-model="formData.awayTeam" label="客队" :rules="[{ required: true, message: '请输入客队' }]" />
            <van-field label="主队比分"><template #input><van-stepper v-model="formData.homeScore" min="0" integer /></template></van-field>
            <van-field label="客队比分"><template #input><van-stepper v-model="formData.awayScore" min="0" integer /></template></van-field>
          </section>
          <section class="form-section">
            <div class="form-section-title">投注信息</div>
            <van-field label="投注阶段"><template #input><van-radio-group v-model="formData.betMode" direction="horizontal"><van-radio name="early">早盘</van-radio><van-radio name="live">滚球</van-radio></van-radio-group></template></van-field>
            <van-field label="玩法"><template #input><van-radio-group v-model="formData.marketType" direction="horizontal"><van-radio name="handicap">让球</van-radio><van-radio name="overUnder">大小球</van-radio><van-radio name="moneyline">独赢</van-radio></van-radio-group></template></van-field>
            <van-field label="选项键"><template #input><van-radio-group v-model="formData.selectionKey" direction="horizontal"><van-radio name="home">主队</van-radio><van-radio name="away">客队</van-radio><van-radio name="over">大</van-radio><van-radio name="under">小</van-radio><van-radio name="draw">平局</van-radio></van-radio-group></template></van-field>
            <van-field label="盘口版本"><template #input><van-stepper v-model="formData.marketVersion" min="1" integer /></template></van-field>
            <van-field v-model="formData.betPeriod" label="投注时段" />
            <van-field label="投注分钟"><template #input><van-stepper v-model="formData.betMinute" min="0" integer /></template></van-field>
            <van-field v-model="formData.betType" label="投注类型" :rules="[{ required: true, message: '请输入投注类型' }]" />
            <van-field v-model="formData.selection" label="选择项" :rules="[{ required: true, message: '请输入选择项' }]" />
            <van-field v-model="formData.value" label="盘口值" />
            <van-field label="赔率"><template #input><van-stepper v-model="formData.odds" :min="1" :step="0.01" :decimal-length="2" /></template></van-field>
            <van-field label="投注金额"><template #input><van-stepper v-model="formData.amount" min="0" /></template></van-field>
            <van-field label="状态"><template #input><van-radio-group v-model="formData.status" direction="horizontal"><van-radio name="pending">待结算</van-radio><van-radio name="settled">已结算</van-radio><van-radio name="cancelled">已取消</van-radio></van-radio-group></template></van-field>
          </section>
        </van-form>
      </div>
      <div class="popup-footer"><van-button block @click="formVisible = false">取消</van-button><van-button block type="primary" :loading="submitLoading" @click="submitForm">提交</van-button></div>
    </van-popup>

    <van-popup v-model:show="settleVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>订单结算</span><van-icon name="cross" @click="settleVisible = false" /></div>
      <div class="sheet-body">
        <van-field label="结算结果"><template #input><van-radio-group v-model="settleForm.result"><van-radio name="win">赢</van-radio><van-radio name="half_win">赢半</van-radio><van-radio name="push">走水</van-radio><van-radio name="half_lose">输半</van-radio><van-radio name="lose">输</van-radio></van-radio-group></template></van-field>
        <van-field label="最终主队比分"><template #input><van-stepper v-model="settleForm.finalHomeScore" min="0" integer /></template></van-field>
        <van-field label="最终客队比分"><template #input><van-stepper v-model="settleForm.finalAwayScore" min="0" integer /></template></van-field>
      </div>
      <div class="sheet-footer"><van-button block @click="settleVisible = false">取消</van-button><van-button block type="primary" :loading="settleLoading" @click="submitSettle">确定</van-button></div>
    </van-popup>

    <van-popup v-model:show="reSettleVisible" position="bottom" round class="mobile-sheet">
      <div class="sheet-header"><span>修改结算</span><van-icon name="cross" @click="reSettleVisible = false" /></div>
      <div class="sheet-body">
        <van-notice-bar wrapable :scrollable="false">修改后将重新计算实际赢取和账户余额。</van-notice-bar>
        <van-cell title="订单号" :value="reSettleOrder.orderId" />
        <van-cell title="比赛" :value="`${reSettleOrder.homeTeam} vs ${reSettleOrder.awayTeam}`" />
        <van-field label="新结算结果"><template #input><van-radio-group v-model="reSettleForm.result"><van-radio name="win">赢</van-radio><van-radio name="half_win">赢半</van-radio><van-radio name="push">走水</van-radio><van-radio name="half_lose">输半</van-radio><van-radio name="lose">输</van-radio></van-radio-group></template></van-field>
        <van-field label="最终主队比分"><template #input><van-stepper v-model="reSettleForm.finalHomeScore" min="0" integer /></template></van-field>
        <van-field label="最终客队比分"><template #input><van-stepper v-model="reSettleForm.finalAwayScore" min="0" integer /></template></van-field>
      </div>
      <div class="sheet-footer"><van-button block @click="reSettleVisible = false">取消</van-button><van-button block type="primary" :loading="reSettleLoading" @click="submitReSettle">确认修改</van-button></div>
    </van-popup>

    <van-action-sheet v-model:show="moreVisible" :actions="moreActions" cancel-text="取消" close-on-click-action @select="selectMore" />
  </div>
</template>

<script setup>
import { useMobileBetOrder } from '@/composables/mobile/useMobileBetOrder';

const {
  list, loading, refreshing, finished, onLoad, refresh, stats, searchForm, filterVisible,
  manageMode, selectedIds, selectedPendingIds, allSelected, formVisible, formRef, formData,
  isEdit, submitLoading, settleVisible, settleForm, settleLoading, reSettleVisible,
  reSettleOrder, reSettleForm, reSettleLoading, moreVisible, moreActions, applyFilters,
  resetFilters, toggleManageMode, toggleSelection, toggleSelectAll, openCreate, submitForm,
  openBatchSettle, submitSettle, submitReSettle, batchRemove, openMore, selectMore,
  formatMoney, formatDate, statusText, statusType, resultText, resultType,
} = useMobileBetOrder();
</script>

<style lang="less" scoped>
.bet-order-mobile-page {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    border-radius: 10px;
    background: #fff;

    strong {
      color: #1f2329;
      font-size: clamp(13px, 4vw, 16px);
      white-space: nowrap;
    }
  }

  .stat-label,
  .card-time {
    color: #86909c;
    font-size: 12px;
  }

  .card-meta-row,
  .card-time {
    margin-top: 7px;
  }

  .card-meta-row > span:last-child {
    flex-basis: 100%;
    margin-left: 0;
  }

  .bet-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 10px;
    border-radius: 8px;
    background: #f7f8fa;

    small {
      color: #86909c;
    }
  }

  .odds-text,
  .potential-text {
    color: #1989fa;
  }


  @media (max-width: 359px) {
    .order-batch-bar {
      .selection-count {
        min-width: 0;
      }

      .van-checkbox {
        width: 100%;
      }
    }
  }
}
</style>
