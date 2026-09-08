function getDateParts(value) {
  const date = new Date(value);

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
  };
}

/**
 * admin 中的时间输入始终解释为北京时间，避免操作电脑的系统时区改变入库时间。
 */
export function beijingInputToIso(value) {
  const parts = getDateParts(value);
  const utcTime = Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    parts.hours - 8,
    parts.minutes,
    parts.seconds,
  );

  return new Date(utcTime).toISOString();
}

/**
 * 将数据库 UTC 时间转换成日期控件需要显示的北京时间墙上时间。
 */
export function utcToBeijingInputDate(value) {
  const date = new Date(value);
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  return new Date(
    beijingDate.getUTCFullYear(),
    beijingDate.getUTCMonth(),
    beijingDate.getUTCDate(),
    beijingDate.getUTCHours(),
    beijingDate.getUTCMinutes(),
    beijingDate.getUTCSeconds(),
  );
}

export function utcToBeijingInputText(value) {
  const inputDate = utcToBeijingInputDate(value);
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  const hours = String(inputDate.getHours()).padStart(2, '0');
  const minutes = String(inputDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatBeijingTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value)).replaceAll('/', '-');
}
