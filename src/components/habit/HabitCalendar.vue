<script setup lang="ts">
import { computed } from 'vue'
import { parseDate } from '@/utils/date'

/**
 * 月历单元格数据结构
 * @property date - 日期字符串 'YYYY-MM-DD'，空字符串表示占位
 * @property day - 日期数字
 * @property inMonth - 是否属于当月
 * @property isToday - 是否今天
 */
interface CalendarCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
}

const props = defineProps<{
  /** 当月所有日期字符串数组 */
  monthDates: string[]
  /** 已打卡日期集合（字符串数组） */
  checkIns: string[]
  /** 今天日期字符串 */
  today: string
  /** 打卡圆圈颜色（可选，空则用默认墨色） */
  color?: string
}>()

const emit = defineEmits<{
  /** 点击日期触发，传入日期字符串 */
  (e: 'toggle-date', date: string): void
}>()

/** 打卡圆圈填充色（未选颜色时回退为默认墨色） */
const circleColor = computed<string>(() => props.color || 'var(--color-text-primary)')

/** 周一~周日 表头 */
const weekHeaders = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 月历单元格二维数组（按周分行）
 * 以当月第一天所在周的周一为起点，铺满整月
 */
const cells = computed<CalendarCell[][]>(() => {
  const dates = props.monthDates
  if (dates.length === 0) return []
  // 当月1号是周几（0=周日,1=周一）
  const firstDate = parseDate(dates[0])
  const firstDay = firstDate.getDay()
  // 把周日(0)转为7，使周一为1
  const offset = firstDay === 0 ? 6 : firstDay - 1
  // 前面占位个数
  const blanks = offset
  // 总单元格数（包含占位）
  const total = blanks + dates.length
  // 补齐到7的倍数
  const rows = Math.ceil(total / 7)
  const cellsFlat: CalendarCell[] = []
  for (let i = 0; i < rows * 7; i++) {
    const dateIndex = i - blanks
    if (dateIndex < 0 || dateIndex >= dates.length) {
      // 占位
      cellsFlat.push({ date: '', day: 0, inMonth: false, isToday: false })
    } else {
      const date = dates[dateIndex]
      const day = parseDate(date).getDate()
      cellsFlat.push({
        date,
        day,
        inMonth: true,
        isToday: date === props.today,
      })
    }
  }
  // 拆分为二维
  const rowsArr: CalendarCell[][] = []
  for (let r = 0; r < rows; r++) {
    rowsArr.push(cellsFlat.slice(r * 7, (r + 1) * 7))
  }
  return rowsArr
})

/**
 * 判断某日是否已打卡
 * @param date - 日期字符串
 * @returns 是否已打卡
 */
function isCheckedIn(date: string): boolean {
  return props.checkIns.includes(date)
}
</script>

<template>
  <div class="habit-calendar">
    <!-- 星期表头 -->
    <div class="cal-header">
      <span
        v-for="(h, i) in weekHeaders"
        :key="i"
        class="cal-h-cell"
      >{{ h }}</span>
    </div>

    <!-- 日期网格 -->
    <div class="cal-grid">
      <div
        v-for="(row, ri) in cells"
        :key="ri"
        class="cal-row"
      >
        <div
          v-for="(cell, ci) in row"
          :key="ri + '-' + ci"
          class="cal-cell"
          :class="{
            blank: !cell.inMonth,
            today: cell.isToday,
            checked: cell.inMonth && isCheckedIn(cell.date),
          }"
          @click="cell.inMonth && emit('toggle-date', cell.date)"
        >
          <!-- 打卡日：日期数字带涂色实心圆背景（数字仍可见） -->
          <span
            v-if="cell.inMonth"
            class="cal-day"
            :class="{ filled: isCheckedIn(cell.date) }"
          >{{ cell.day }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 月历容器 */
.habit-calendar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 星期表头行 */
.cal-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 4px;
}

.cal-h-cell {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 6px 0;
}

/* 日期网格行 */
.cal-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 4px;
}

/* 单个日期格子 */
.cal-cell {
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  border-radius: 8px;
  position: relative;
  transition: background 0.15s;
}

.cal-cell.blank {
  cursor: default;
  background: transparent;
}

.cal-cell:not(.blank):hover {
  background: var(--color-bg-surface);
}

.cal-cell.today {
  background: #fff;
  box-shadow: inset 0 0 0 1.5px var(--color-text-primary);
}

.cal-cell.checked {
  background: transparent;
}

.cal-cell.checked.today {
  background: #fff;
  box-shadow: inset 0 0 0 1.5px var(--color-text-primary);
}

.cal-day {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  line-height: 1;
}

/* 打卡日：日期数字带涂色实心圆背景，数字白色仍可见 */
.cal-day.filled {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: v-bind(circleColor);
  color: #0e0d0d;
  font-weight: var(--font-weight-bold);
  box-shadow: 0 1px 3px rgba(78, 63, 55, 0.2);
}
</style>
