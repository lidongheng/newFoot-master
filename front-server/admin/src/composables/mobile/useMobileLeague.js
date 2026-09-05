import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { showToast } from 'vant';
import {
  batchDeleteLeagues,
  createLeague,
  deleteLeague,
  getCountries,
  getLeagueList,
  updateLeague,
} from '@/api/league';
import { useMobilePagedList } from './useMobilePagedList';
import { useMobileConfirm } from './useMobileConfirm';

export function useMobileLeague() {
  const { confirm } = useMobileConfirm();
  const searchForm = reactive({ country: '', keyword: '' });
  const filterVisible = ref(false);
  const manageMode = ref(false);
  const selectedIds = ref([]);
  const countryOptions = ref([]);
  const formVisible = ref(false);
  const formRef = ref(null);
  const isEdit = ref(false);
  const submitLoading = ref(false);
  const currentEditId = ref('');
  const moreVisible = ref(false);
  const currentRow = ref(null);
  const countryPickerVisible = ref(false);
  const formData = reactive({
    leagueId: '',
    name: '',
    country: '',
    flag: '',
    matchCount: 0,
  });

  const pagedList = useMobilePagedList(({ page, pageSize }) => getLeagueList({
    ...searchForm,
    page,
    pageSize,
  }));
  const allSelected = computed(() => {
    return pagedList.list.value.length > 0 && selectedIds.value.length === pagedList.list.value.length;
  });
  const moreActions = [
    { name: '编辑' },
    { name: '删除', color: '#ee0a24' },
  ];

  async function fetchCountries() {
    try {
      countryOptions.value = await getCountries();
    } catch (error) {
      // 请求层已统一展示错误信息，此处仅阻止初始化 Promise 外溢。
    }
  }

  function applyFilters() {
    filterVisible.value = false;
    pagedList.reload();
  }

  function resetFilters() {
    searchForm.country = '';
    searchForm.keyword = '';
    applyFilters();
  }

  function confirmCountry({ selectedValues }) {
    searchForm.country = selectedValues[0];
    countryPickerVisible.value = false;
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
    formData.leagueId = '';
    formData.name = '';
    formData.country = '';
    formData.flag = '';
    formData.matchCount = 0;
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
      leagueId: row.leagueId,
      name: row.name,
      country: row.country,
      flag: row.flag,
      matchCount: row.matchCount || 0,
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
        await updateLeague(currentEditId.value, formData);
      } else {
        await createLeague(formData);
      }
      showToast(isEdit.value ? '更新成功' : '创建成功');
      formVisible.value = false;
      await pagedList.reload();
      await fetchCountries();
    } finally {
      submitLoading.value = false;
    }
  }

  async function remove(row) {
    const confirmed = await confirm({ title: '删除联赛', message: `确定删除 ${row.name} 吗？` });
    if (!confirmed) {
      return;
    }
    await deleteLeague(row._id);
    showToast('删除成功');
    await pagedList.reload();
    await fetchCountries();
  }

  async function batchRemove() {
    const confirmed = await confirm({ title: '批量删除', message: `确定删除选中的 ${selectedIds.value.length} 个联赛吗？` });
    if (!confirmed) {
      return;
    }
    await batchDeleteLeagues(selectedIds.value);
    selectedIds.value = [];
    manageMode.value = false;
    showToast('批量删除成功');
    await pagedList.reload();
    await fetchCountries();
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

  function formatDate(value) {
    return dayjs(value).format('YYYY-MM-DD HH:mm');
  }

  fetchCountries();

  return {
    ...pagedList,
    searchForm,
    filterVisible,
    manageMode,
    selectedIds,
    allSelected,
    countryOptions,
    countryPickerVisible,
    formVisible,
    formRef,
    formData,
    isEdit,
    submitLoading,
    moreVisible,
    moreActions,
    applyFilters,
    resetFilters,
    confirmCountry,
    toggleManageMode,
    toggleSelection,
    toggleSelectAll,
    openCreate,
    submitForm,
    batchRemove,
    openMore,
    selectMore,
    formatDate,
  };
}
