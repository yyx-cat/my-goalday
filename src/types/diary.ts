/**
 * 日记数据接口
 * @property date - 日记所属日期，格式 'YYYY-MM-DD'
 * @property content - 日记内容文本
 * @property updatedAt - 最后更新时间 ISO 字符串
 */
export interface Diary {
  date: string
  content: string
  updatedAt: string
}
