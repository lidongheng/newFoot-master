import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { showToast } from 'vant';
import {
  batchDeleteBetOrders,
  batchSettleBetOrders,
  cancelBetOrder,
  createBetOrder,
  deleteBetOrder,
  getBetOrderList,
  reSettleBetOrder,
  updateBetOrder,
} from '@/api/betOrder';
import { useMobilePagedList } from './useMobilePagedList';
import { useMobileConfirm } from './useMobileConfirm';

export function useMobileBetOrder() {
  const { confirm } = useMobileConfirm();
  const stats = reactive({
    totalAmount: 0,
    totalPotentialWin: 0,
    totalActualWin: 0,
    pendingCount: 0,
    settledCount: 0,
    totalCount: 0,
  });
  const searchForm = reactive({ status: '', result: '', keyword: '', startDate: '', endDate: '' });
  const filterVisible = ref(false);
  const manageMode = ref(false);
  const selectedRows = ref([]);
  const formVisible = ref(false);
  const formRef = ref(null);
  const isEdit = ref(false);
  const currentEditId = ref('');
  const submitLoading = ref(false);
  const settleVisible = ref(false);
  const settleLoading = ref(false);
  const reSettleVisible = ref(false);
  const reSettleLoading = ref(false);
  const moreVisible = ref(false);
  const currentRow = ref(null);

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
    status: 'pending',
  });
  const settleForm = reactive({ ids: [], result: 'win', finalHomeScore: 0, finalAwayScore: 0 });
  const reSettleOrder = reactive({
    _id: '',
    orderId: '',
    homeTeam: '',
    awayTeam: '',
    amount: 0,
    odds: 0,
    result: null,
    actualWin: null,
  });
  const reSettleForm = reactive({ result: 'win', finalHomeScore: 0, finalAwayScore: 0 });

  const pagedList = useMobilePagedList(async ({ page, pageSize }) => {
    const data = await getBetOrderList({ ...searchForm, page, pageSize });
    if (data.stats) {
      Object.assign(stats, data.stats);
    }
    return data;
  });
  const selectedIds = computed(() => selectedRows.value.map(item => item._id));
  const selectedPendingIds = computed(() => {
    return selectedRows.value.filter(item => item.status === 'pending').map(item => item._id);
  });
  const allSelected = computed(() => {
    return pagedList.list.value.length > 0 && selectedRows.value.length === pagedList.list.value.length;
  });
  const moreActions = computed(() => {
    const actions = [{ name: '编辑' }];
    if (currentRow.value?.status === 'pending') {
      actions.push({ name: '结算' }, { name: '取消订单' });
    }
    if (currentRow.value?.status === 'settled') {
      actions.push({ name: '修改结算' });
    }
    actions.push({ name: '删除', color: '#ee0a24' });
    return actions;
  });

  function applyFilters() {
    filterVisible.value = false;
    pagedList.reload();
  }

  function resetFilters() {
    Object.assign(searchForm, { status: '', result: '', keyword: '', startDate: '', endDate: '' });
    applyFilters();
  }

  function toggleManageMode() {
    manageMode.value = !manageMode.value;
    selectedRows.value = [];
  }

  function toggleSelection(row) {
    const index = selectedRows.value.findIndex(item => item._id === row._id);
    if (index >= 0) {
      selectedRows.value.splice(index, 1);
      return;
    }
    selectedRows.value.push(row);
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedRows.value = [];
      return;
    }
    selectedRows.value = [...pagedList.list.value];
  }

  function resetForm() {
    Object.assign(formData, {
      matchId: '', league: '', homeTeam: '', awayTeam: '', homeScore: 0, awayScore: 0,
      betMode: 'early', marketType: 'handicap', selectionKey: 'home', betPeriod: '',
      betMinute: 0, marketVersion: 1, betType: '', selection: '', value: '', odds: 1.90,
      amount: 100, status: 'pending',
    });
  }

  function openCreate() {
    isEdit.value = false;
    resetForm();
    formVisible.value = true;
  }

  function openEdit(row) {
    isEdit.value = true;
    currentEditId.value = row._id;
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
      status: row.status,
    });
    formVisible.value = true;
  }

  async function submitForm() {
    try {
      await formRef.value.validate();
    } catch (error) {
      return;
    }
    submitLoading.value = true;
    try {
      if (isEdit.value) {
        await updateBetOrder(currentEditId.value, formData);
      } else {
        await createBetOrder(formData);
      }
      showToast(isEdit.value ? '更新成功' : '创建成功');
      formVisible.value = false;
      await pagedList.reload();
    } finally {
      submitLoading.value = false;
    }
  }

  function openSettle(row) {
    settleForm.ids = [row._id];
    settleForm.result = 'win';
    settleForm.finalHomeScore = row.finalHomeScore || 0;
    settleForm.finalAwayScore = row.finalAwayScore || 0;
    settleVisible.value = true;
  }

  function openBatchSettle() {
    settleForm.ids = selectedPendingIds.value;
    settleForm.result = 'win';
    settleForm.finalHomeScore = 0;
    settleForm.finalAwayScore = 0;
    settleVisible.value = true;
  }

  async function submitSettle() {
    settleLoading.value = true;
    try {
      await batchSettleBetOrders(settleForm);
      showToast('结算成功');
      settleVisible.value = false;
      selectedRows.value = [];
      manageMode.value = false;
      await pagedList.reload();
    } finally {
      settleLoading.value = false;
    }
  }

  function openReSettle(row) {
    Object.assign(reSettleOrder, {
      _id: row._id,
      orderId: row.orderId,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      amount: row.amount,
      odds: row.odds,
      result: row.result,
      actualWin: row.actualWin,
    });
    reSettleForm.result = row.result || 'win';
    reSettleForm.finalHomeScore = row.finalHomeScore || 0;
    reSettleForm.finalAwayScore = row.finalAwayScore || 0;
    reSettleVisible.value = true;
  }

  async function submitReSettle() {
    const confirmed = await confirm({
      title: '确认修改结算',
      message: `确定将结算结果从“${resultText(reSettleOrder.result)}”修改为“${resultText(reSettleForm.result)}”吗？此操作将重新计算账户余额。`,
    });
    if (!confirmed) {
      return;
    }
    reSettleLoading.value = true;
    try {
      await reSettleBetOrder(reSettleOrder._id, reSettleForm);
      showToast('修改结算成功');
      reSettleVisible.value = false;
      await pagedList.reload();
    } finally {
      reSettleLoading.value = false;
    }
  }

  async function cancel(row) {
    const confirmed = await confirm({ title: '取消订单', message: '确定取消该订单吗？取消后会退还投注金额。' });
    if (!confirmed) {
      return;
    }
    await cancelBetOrder(row._id);
    showToast('取消成功');
    await pagedList.reload();
  }

  async function remove(row) {
    const confirmed = await confirm({ title: '删除订单', message: '确定删除该订单吗？待结算订单删除会自动退还金额。' });
    if (!confirmed) {
      return;
    }
    await deleteBetOrder(row._id);
    showToast('删除成功');
    await pagedList.reload();
  }

  async function batchRemove() {
    const confirmed = await confirm({ title: '批量删除', message: `确定删除选中的 ${selectedIds.value.length} 个订单吗？` });
    if (!confirmed) {
      return;
    }
    await batchDeleteBetOrders(selectedIds.value);
    selectedRows.value = [];
    manageMode.value = false;
    showToast('批量删除成功');
    await pagedList.reload();
  }

  function openMore(row) {
    currentRow.value = row;
    moreVisible.value = true;
  }

  function selectMore(action) {
    moreVisible.value = false;
    if (action.name === '编辑') {
      openEdit(currentRow.value);
      return;
    }
    if (action.name === '结算') {
      openSettle(currentRow.value);
      return;
    }
    if (action.name === '修改结算') {
      openReSettle(currentRow.value);
      return;
    }
    if (action.name === '取消订单') {
      cancel(currentRow.value);
      return;
    }
    remove(currentRow.value);
  }

  function formatMoney(value) {
    return Number(value).toFixed(2);
  }

  function formatDate(value) {
    return dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  function statusText(status) {
    return { pending: '待结算', settled: '已结算', cancelled: '已取消' }[status];
  }

  function statusType(status) {
    return { pending: 'warning', settled: 'success', cancelled: 'default' }[status];
  }

  function resultText(result) {
    return { win: '赢', lose: '输', push: '走水', half_win: '赢半', half_lose: '输半' }[result];
  }

  function resultType(result) {
    return { win: 'success', lose: 'danger', push: 'default', half_win: 'success', half_lose: 'warning' }[result];
  }

  return {
    ...pagedList,
    stats,
    searchForm,
    filterVisible,
    manageMode,
    selectedRows,
    selectedIds,
    selectedPendingIds,
    allSelected,
    formVisible,
    formRef,
    formData,
    isEdit,
    submitLoading,
    settleVisible,
    settleForm,
    settleLoading,
    reSettleVisible,
    reSettleOrder,
    reSettleForm,
    reSettleLoading,
    moreVisible,
    moreActions,
    applyFilters,
    resetFilters,
    toggleManageMode,
    toggleSelection,
    toggleSelectAll,
    openCreate,
    submitForm,
    openBatchSettle,
    submitSettle,
    submitReSettle,
    batchRemove,
    openMore,
    selectMore,
    formatMoney,
    formatDate,
    statusText,
    statusType,
    resultText,
    resultType,
  };
}
