import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { showToast } from 'vant';
import {
  batchDeleteBalanceLogs,
  deleteBalanceLog,
  getAccountInfo,
  getBalanceLogs,
  getBalanceStats,
  setBalance,
  updateBalanceLog,
} from '@/api/account';
import { useMobilePagedList } from './useMobilePagedList';
import { useMobileConfirm } from './useMobileConfirm';

const baseFields = [
  '_id', 'type', 'amount', 'balanceBefore', 'balanceAfter', 'relatedOrderId',
  'remark', 'createdAt', 'updatedAt', '__v',
];

export function useMobileAccount() {
  const { confirm } = useMobileConfirm();
  const account = reactive({ balance: 0, currency: 'CNY', updatedAt: '' });
  const balanceStats = reactive({ totalDeposit: 0, totalWithdraw: 0, totalBet: 0, totalWin: 0 });
  const searchForm = reactive({ type: '', startDate: '', endDate: '' });
  const filterVisible = ref(false);
  const manageMode = ref(false);
  const selectedIds = ref([]);
  const adjustVisible = ref(false);
  const adjustLoading = ref(false);
  const adjustForm = reactive({ balance: 0, remark: '' });
  const editVisible = ref(false);
  const editLoading = ref(false);
  const editFormRef = ref(null);
  const currentEditId = ref('');
  const logDetail = ref({});
  const moreVisible = ref(false);
  const currentRow = ref(null);
  const editForm = reactive({
    type: '',
    amount: 0,
    balanceBefore: 0,
    balanceAfter: 0,
    relatedOrderId: '',
    remark: '',
    createdAt: '',
    updatedAt: '',
  });

  const pagedList = useMobilePagedList(({ page, pageSize }) => getBalanceLogs({
    ...searchForm,
    page,
    pageSize,
  }));
  const allSelected = computed(() => {
    return pagedList.list.value.length > 0 && selectedIds.value.length === pagedList.list.value.length;
  });
  const adjustPreviewText = computed(() => {
    const difference = adjustForm.balance - account.balance;
    if (difference > 0) {
      return `将增加 ¥${formatMoney(difference)}`;
    }
    if (difference < 0) {
      return `将减少 ¥${formatMoney(Math.abs(difference))}`;
    }
    return '';
  });
  const extraDetails = computed(() => {
    const details = {};
    Object.keys(logDetail.value).forEach((key) => {
      if (!baseFields.includes(key)) {
        details[key] = logDetail.value[key];
      }
    });
    return details;
  });
  const moreActions = [
    { name: '编辑' },
    { name: '删除', color: '#ee0a24' },
  ];

  async function fetchOverview() {
    try {
      const [accountData, statsData] = await Promise.all([getAccountInfo(), getBalanceStats()]);
      Object.assign(account, accountData);
      Object.assign(balanceStats, statsData);
    } catch (error) {
      // 请求层已统一展示错误信息，此处仅阻止初始化 Promise 外溢。
    }
  }

  async function refreshAll() {
    await Promise.all([fetchOverview(), pagedList.refresh()]);
  }

  function applyFilters() {
    filterVisible.value = false;
    pagedList.reload();
  }

  function resetFilters() {
    Object.assign(searchForm, { type: '', startDate: '', endDate: '' });
    applyFilters();
  }

  function toggleManageMode() {
    manageMode.value = !manageMode.value;
    selectedIds.value = [];
  }

  function toggleSelection(id) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(item => item !== id);
      return;
    }
    selectedIds.value.push(id);
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedIds.value = [];
      return;
    }
    selectedIds.value = pagedList.list.value.map(item => item._id);
  }

  function openAdjust() {
    adjustForm.balance = account.balance;
    adjustForm.remark = '';
    adjustVisible.value = true;
  }

  async function submitAdjust() {
    if (adjustForm.balance === account.balance) {
      showToast('余额未发生变化');
      return;
    }
    adjustLoading.value = true;
    try {
      await setBalance(adjustForm.balance, adjustForm.remark);
      showToast('余额调整成功');
      adjustVisible.value = false;
      await Promise.all([fetchOverview(), pagedList.reload()]);
    } finally {
      adjustLoading.value = false;
    }
  }

  function openEdit(row) {
    currentEditId.value = row._id;
    logDetail.value = { ...row };
    Object.assign(editForm, {
      type: row.type,
      amount: row.amount,
      balanceBefore: row.balanceBefore,
      balanceAfter: row.balanceAfter,
      relatedOrderId: row.relatedOrderId || '',
      remark: row.remark || '',
      createdAt: dayjs(row.createdAt).format('YYYY-MM-DDTHH:mm'),
      updatedAt: row.updatedAt ? dayjs(row.updatedAt).format('YYYY-MM-DDTHH:mm') : '',
    });
    editVisible.value = true;
  }

  async function submitEdit() {
    try {
      await editFormRef.value.validate();
    } catch (error) {
      return;
    }
    editLoading.value = true;
    try {
      await updateBalanceLog(currentEditId.value, {
        type: editForm.type,
        amount: Number(editForm.amount),
        balanceBefore: editForm.balanceBefore,
        balanceAfter: editForm.balanceAfter,
        relatedOrderId: editForm.relatedOrderId || null,
        remark: editForm.remark || '',
        createdAt: new Date(editForm.createdAt).toISOString(),
        updatedAt: editForm.updatedAt ? new Date(editForm.updatedAt).toISOString() : null,
      });
      showToast('更新成功');
      editVisible.value = false;
      await Promise.all([fetchOverview(), pagedList.reload()]);
    } finally {
      editLoading.value = false;
    }
  }

  async function remove(row) {
    const confirmed = await confirm({ title: '删除日志', message: '确定删除该余额变动日志吗？' });
    if (!confirmed) {
      return;
    }
    await deleteBalanceLog(row._id);
    showToast('删除成功');
    await pagedList.reload();
  }

  async function batchRemove() {
    const confirmed = await confirm({ title: '批量删除', message: `确定删除选中的 ${selectedIds.value.length} 条日志吗？` });
    if (!confirmed) {
      return;
    }
    await batchDeleteBalanceLogs(selectedIds.value);
    selectedIds.value = [];
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
    remove(currentRow.value);
  }

  function formatMoney(value) {
    return Number(value).toFixed(2);
  }

  function formatDate(value) {
    return dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  function typeText(type) {
    return { bet: '投注', win: '中奖', deposit: '充值', withdraw: '提现', adjust: '调整' }[type];
  }

  function typeTag(type) {
    return { bet: 'warning', win: 'success', deposit: 'primary', withdraw: 'danger', adjust: 'default' }[type];
  }

  function extraFieldLabel(key) {
    return {
      orderId: '订单号', matchId: '比赛ID', league: '联赛', homeTeam: '主队', awayTeam: '客队',
      betType: '投注类型', selection: '选择项', odds: '赔率', potentialWin: '预计可赢',
      actualWin: '实际赢取', result: '结算结果', status: '状态', settledAt: '结算时间',
      userId: '用户ID', username: '用户名',
    }[key] || key;
  }

  function formatExtraValue(key, value) {
    const dateFields = ['settledAt', 'betTime', 'matchTime', 'startTime', 'endTime'];
    const moneyFields = ['potentialWin', 'actualWin', 'betAmount', 'winAmount', 'balance', 'totalAmount'];
    if (dateFields.includes(key) || key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) {
      return formatDate(value);
    }
    if (moneyFields.includes(key) || key.toLowerCase().includes('amount') || key.toLowerCase().includes('win')) {
      return `¥${formatMoney(value)}`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  fetchOverview();

  return {
    ...pagedList,
    account,
    balanceStats,
    searchForm,
    filterVisible,
    manageMode,
    selectedIds,
    allSelected,
    adjustVisible,
    adjustLoading,
    adjustForm,
    adjustPreviewText,
    editVisible,
    editLoading,
    editFormRef,
    editForm,
    logDetail,
    extraDetails,
    moreVisible,
    moreActions,
    refreshAll,
    applyFilters,
    resetFilters,
    toggleManageMode,
    toggleSelection,
    toggleSelectAll,
    openAdjust,
    submitAdjust,
    submitEdit,
    batchRemove,
    openMore,
    selectMore,
    formatMoney,
    formatDate,
    typeText,
    typeTag,
    extraFieldLabel,
    formatExtraValue,
  };
}
