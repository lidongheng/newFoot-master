import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { showToast } from 'vant';
import {
  batchDeleteMatches,
  createMatch,
  deleteMatch,
  getMatchList,
  updateLiveMatch,
  updateMatch,
  updateMatchScore,
  updateMatchStatus,
} from '@/api/match';
import { getAllLeagues } from '@/api/league';
import { useMobilePagedList } from './useMobilePagedList';
import { useMobileConfirm } from './useMobileConfirm';

// 亚盘和大小球使用不含本金的水位，独赢使用含本金赔率。
const defaultOdds = {
  handicap: {
    home: { value: '-0.5', odds: 0.90 },
    away: { value: '+0.5', odds: 0.90 },
  },
  overUnder: {
    over: { value: '大 2.5', odds: 0.90 },
    under: { value: '小 2.5', odds: 0.90 },
  },
  moneyline: {
    home: { label: '主', odds: 2.00 },
    draw: { label: '和', odds: 3.20 },
    away: { label: '客', odds: 3.50 },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function useMobileMatch() {
  const { confirm } = useMobileConfirm();
  const searchForm = reactive({ status: '', league: '', keyword: '' });
  const filterVisible = ref(false);
  const manageMode = ref(false);
  const selectedIds = ref([]);
  const leagueOptions = ref([]);
  const formVisible = ref(false);
  const formRef = ref(null);
  const isEdit = ref(false);
  const submitLoading = ref(false);
  const currentEditId = ref('');
  const scoreVisible = ref(false);
  const statusVisible = ref(false);
  const liveVisible = ref(false);
  const liveSubmitLoading = ref(false);
  const moreVisible = ref(false);
  const currentRow = ref(null);
  const leaguePickerVisible = ref(false);
  const periodPickerVisible = ref(false);

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
    odds: clone(defaultOdds),
  });
  const scoreForm = reactive({ id: '', homeScore: 0, awayScore: 0 });
  const statusForm = reactive({ id: '', status: '' });
  const liveForm = reactive({
    id: '',
    homeScore: 0,
    awayScore: 0,
    minute: 0,
    period: '',
    bettingOpen: false,
    odds: clone(defaultOdds),
  });

  const pagedList = useMobilePagedList(({ page, pageSize }) => getMatchList({
    ...searchForm,
    page,
    pageSize,
  }));

  const allSelected = computed(() => {
    return pagedList.list.value.length > 0 && selectedIds.value.length === pagedList.list.value.length;
  });
  const moreActions = computed(() => [
    { name: '状态' },
    { name: '滚球', disabled: currentRow.value?.status !== 'live' },
    { name: '删除', color: '#ee0a24' },
  ]);

  async function fetchLeagues() {
    try {
      leagueOptions.value = await getAllLeagues();
    } catch (error) {
      // 请求层已统一展示错误信息，此处仅阻止初始化 Promise 外溢。
    }
  }

  function applyFilters() {
    filterVisible.value = false;
    pagedList.reload();
  }

  function resetFilters() {
    searchForm.status = '';
    searchForm.league = '';
    searchForm.keyword = '';
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

  function resetForm() {
    formData.matchId = '';
    formData.league = '';
    formData.leagueIcon = '';
    formData.homeTeam = '';
    formData.awayTeam = '';
    formData.startTime = '';
    formData.status = 'upcoming';
    formData.hasVideo = true;
    formData.hasCashOut = true;
    formData.isLive = false;
    formData.odds = clone(defaultOdds);
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
      leagueIcon: row.leagueIcon,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      startTime: dayjs(row.startTime).format('YYYY-MM-DDTHH:mm'),
      status: row.status,
      hasVideo: row.hasVideo,
      hasCashOut: row.hasCashOut,
      isLive: row.isLive,
      odds: row.odds ? clone(row.odds) : clone(defaultOdds),
    });
    formVisible.value = true;
  }

  function handleLeagueChange() {
    const league = leagueOptions.value.find(item => item.name === formData.league);
    if (league) {
      formData.leagueIcon = league.flag;
    }
  }

  function confirmLeague({ selectedValues }) {
    formData.league = selectedValues[0];
    handleLeagueChange();
    leaguePickerVisible.value = false;
  }

  function confirmPeriod({ selectedValues }) {
    liveForm.period = selectedValues[0];
    periodPickerVisible.value = false;
  }

  async function submitForm() {
    try {
      await formRef.value.validate();
    } catch (error) {
      return;
    }
    submitLoading.value = true;
    try {
      const data = {
        ...clone(formData),
        startTime: new Date(formData.startTime).toISOString(),
      };
      if (isEdit.value) {
        await updateMatch(currentEditId.value, data);
      } else {
        await createMatch(data);
      }
      showToast(isEdit.value ? '更新成功' : '创建成功');
      formVisible.value = false;
      await pagedList.reload();
    } finally {
      submitLoading.value = false;
    }
  }

  function openScore(row) {
    scoreForm.id = row._id;
    scoreForm.homeScore = row.homeScore || 0;
    scoreForm.awayScore = row.awayScore || 0;
    scoreVisible.value = true;
  }

  async function submitScore() {
    await updateMatchScore(scoreForm.id, scoreForm.homeScore, scoreForm.awayScore);
    showToast('比分更新成功');
    scoreVisible.value = false;
    await pagedList.reload();
  }

  function openStatus(row) {
    statusForm.id = row._id;
    statusForm.status = row.status;
    statusVisible.value = true;
  }

  async function submitStatus() {
    await updateMatchStatus(statusForm.id, statusForm.status);
    showToast('状态更新成功');
    statusVisible.value = false;
    await pagedList.reload();
  }

  function openLive(row) {
    Object.assign(liveForm, {
      id: row._id,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      minute: row.minute,
      period: row.period,
      bettingOpen: row.bettingOpen,
      odds: clone(row.odds),
    });
    liveVisible.value = true;
  }

  function validateLiveForm() {
    const scores = [liveForm.homeScore, liveForm.awayScore, liveForm.minute];
    if (scores.some(value => !Number.isInteger(value) || value < 0)) {
      showToast('比分和比赛分钟必须为非负整数');
      return false;
    }
    if (!liveForm.period) {
      showToast('请选择比赛阶段');
      return false;
    }
    const quotes = [
      liveForm.odds.handicap.home,
      liveForm.odds.handicap.away,
      liveForm.odds.overUnder.over,
      liveForm.odds.overUnder.under,
      liveForm.odds.moneyline.home,
      liveForm.odds.moneyline.draw,
      liveForm.odds.moneyline.away,
    ];
    if (quotes.some(quote => !Number.isFinite(Number(quote.odds)) || Number(quote.odds) <= 0)) {
      showToast('所有赔率必须为有效正数');
      return false;
    }
    const marketValues = [
      liveForm.odds.handicap.home.value,
      liveForm.odds.handicap.away.value,
      liveForm.odds.overUnder.over.value,
      liveForm.odds.overUnder.under.value,
    ];
    if (marketValues.some(value => !value.trim())) {
      showToast('让球和大小球盘口不能为空');
      return false;
    }
    return true;
  }

  async function submitLive() {
    if (!validateLiveForm()) {
      return;
    }
    liveSubmitLoading.value = true;
    try {
      await updateLiveMatch(liveForm.id, clone({
        homeScore: liveForm.homeScore,
        awayScore: liveForm.awayScore,
        minute: liveForm.minute,
        period: liveForm.period,
        bettingOpen: liveForm.bettingOpen,
        odds: liveForm.odds,
      }));
      showToast('滚球数据更新成功');
      liveVisible.value = false;
      await pagedList.reload();
    } finally {
      liveSubmitLoading.value = false;
    }
  }

  async function remove(row) {
    const confirmed = await confirm({ title: '删除比赛', message: `确定删除 ${row.homeTeam} vs ${row.awayTeam} 吗？` });
    if (!confirmed) {
      return;
    }
    await deleteMatch(row._id);
    showToast('删除成功');
    await pagedList.reload();
  }

  async function batchRemove() {
    const confirmed = await confirm({ title: '批量删除', message: `确定删除选中的 ${selectedIds.value.length} 场比赛吗？` });
    if (!confirmed) {
      return;
    }
    await batchDeleteMatches(selectedIds.value);
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
    if (action.name === '状态') {
      openStatus(currentRow.value);
      return;
    }
    if (action.name === '滚球') {
      openLive(currentRow.value);
      return;
    }
    remove(currentRow.value);
  }

  function formatDate(value) {
    return dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  function statusText(status) {
    return { upcoming: '未开始', live: '进行中', finished: '已结束' }[status];
  }

  function statusType(status) {
    return { upcoming: 'default', live: 'success', finished: 'warning' }[status];
  }

  fetchLeagues();

  return {
    ...pagedList,
    searchForm,
    filterVisible,
    manageMode,
    selectedIds,
    allSelected,
    leagueOptions,
    leaguePickerVisible,
    periodPickerVisible,
    formVisible,
    formRef,
    formData,
    isEdit,
    submitLoading,
    scoreVisible,
    scoreForm,
    statusVisible,
    statusForm,
    liveVisible,
    liveForm,
    liveSubmitLoading,
    moreVisible,
    currentRow,
    moreActions,
    applyFilters,
    resetFilters,
    toggleManageMode,
    toggleSelection,
    toggleSelectAll,
    openCreate,
    openEdit,
    handleLeagueChange,
    confirmLeague,
    confirmPeriod,
    submitForm,
    openScore,
    submitScore,
    submitStatus,
    submitLive,
    batchRemove,
    openMore,
    selectMore,
    formatDate,
    statusText,
    statusType,
  };
}
