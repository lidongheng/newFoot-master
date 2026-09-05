import { showConfirmDialog } from 'vant';

export function useMobileConfirm() {
  async function confirm(options) {
    try {
      await showConfirmDialog(options);
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    confirm,
  };
}
