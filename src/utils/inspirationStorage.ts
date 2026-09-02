import type {
  InspirationData,
  InspirationItem,
  InspirationModule,
} from '@/types/inspiration'

/** localStorage 存储键（与项目硬约束命名风格一致） */
const STORAGE_KEY = 'my-goalday-inspiration'

/**
 * 生成唯一 ID（时间戳 + 随机串）
 * @returns 唯一标识字符串
 */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 内置预设灵感模块与条目（首次使用时初始化）
 * @returns 初始化灵感数据
 */
function buildBuiltInData(): InspirationData {
  const now = Date.now()
  const m1: InspirationModule = { id: 'builtin-100-things', name: '一个人可以做的100件小事', builtIn: true, createdAt: now }
  const m2: InspirationModule = { id: 'builtin-30day', name: '30天自我提升挑战', builtIn: true, createdAt: now }
  const m3: InspirationModule = { id: 'builtin-week-happy', name: '一周快乐生活指南', builtIn: true, createdAt: now }
  const m4: InspirationModule = { id: 'builtin-21sport', name: '21天运动习惯养成', builtIn: true, createdAt: now }
  const m5: InspirationModule = { id: 'builtin-seasons', name: '一年四季的仪式感', builtIn: true, createdAt: now }
  const m6: InspirationModule = { id: 'builtin-books', name: '值得读的几本推荐的书', builtIn: true, createdAt: now }
  // 文本数组 → 条目数组的辅助函数（保持条目创建逻辑统一）
  const toItems = (moduleId: string, texts: string[]): InspirationItem[] =>
    texts.map(t => ({ id: genId(), moduleId, text: t, createdAt: now }))
  const items: InspirationItem[] = [
    // 模块一：一个人可以做的100件小事
    ...toItems(m1.id, [
      '看一场日出', '看一场日落', '去海边散步', '在公园长椅上发呆30分钟', '写一封信给未来的自己',
      '读完一本买了很久的书', '看一部老电影', '去一次博物馆', '逛一次菜市场', '做一顿丰盛的早餐',
      '学做一道新菜', '烤一次饼干或蛋糕', '去一家没去过的咖啡店', '坐一趟没有目的地的公交', '去一次图书馆（安静看书）',
      '写一篇日记', '整理手机相册', '给老朋友发一条消息', '去一次花市买一束花', '在阳台种一盆植物',
      '看一部高分纪录片', '听一张完整的音乐专辑', '去一次美术馆', '骑自行车去兜风', '去河边或湖边散步',
      '看一场话剧或音乐剧', '去一次游乐园', '坐一次摩天轮', '去寺庙或教堂安静坐一会', '写一首诗（哪怕很短）',
      '画一幅画（不管好不好看）', '做一次手工（折纸/编织等）', '去一次旧货市场淘宝', '看一场烟火表演', '去山上徒步',
      '在雨中散步（不打伞）', '泡一次温泉或泡脚', '做一次全身拉伸', '早起一次看清晨的城市', '去一次24小时便利店吃夜宵',
      '写一封感谢信给某人', '整理衣柜并捐掉不穿的衣服', '去一次动物园', '看一次星星（找个光污染少的地方）', '去一次天文馆',
      '学一首简单的钢琴曲或尤克里里曲', '抄写一段喜欢的文字', '去一次老街区散步', '尝试一种没吃过的新水果', '看一部动漫电影',
      '去一次海洋馆', '做一次断舍离（扔一件不用的东西）', '给家里的植物浇水并观察生长', '听一场线上讲座或TED', '学一句外语并大声说三遍',
      '去一次独立书店', '看一场体育比赛（直播或现场）', '去一次音乐节（哪怕只是逛）', '做一次冥想（至少10分钟）', '写一份愿望清单（列10件事）',
      '去一次科技馆', '看一场相声或脱口秀', '去一次宠物咖啡店撸猫/狗', '做一次手工皂或蜡烛', '去一次陶艺体验店',
      '看一场杂技或马戏表演', '去一次周边的古镇', '坐一次轮渡或渡船', '看一次升旗或降旗仪式', '去一次大学校园走走',
      '写一篇读书笔记', '学一首新歌并唱出来', '去一次花卉市场买盆栽', '做一次义工或志愿者（哪怕一天）', '看一场摄影展',
      '看一场儿童剧（找回童真）', '去一次游乐场玩项目', '学做一次蛋糕裱花', '去一次植物园', '看一场魔术表演',
      '去一次科技展览', '做一次全身按摩（自己或去店里）', '去一次美术馆的夜间开放', '写一封手写信寄给朋友', '去一次湿地公园观鸟',
      '看一场露天的老电影', '学一种新的手语或手势', '去一次寺庙抄经', '做一次水果拼盘', '去一次创意市集',
      '看一场流星雨（关注天象预报）', '去一次无人便利店体验', '学一种新的舞蹈（跟视频跳一支舞）', '去一次录音棚录一首歌', '看一场现场的乐队演出',
      '去一次古老的街巷探访历史', '做一次湿拓画或水彩画', '去一次农场采摘水果', '看一次完整的月出过程', '对自己说"谢谢你，辛苦了"',
    ]),
    // 模块二：30天自我提升挑战
    ...toItems(m2.id, [
      '第1天：早起1小时', '第2天：读20页书', '第3天：写感恩日记（3件事）', '第4天：运动30分钟', '第5天：冥想10分钟',
      '第6天：学习新知识1小时', '第7天：整理房间', '第8天：戒掉社交媒体1天', '第9天：学做一道新菜', '第10天：写一份本周复盘',
      '第11天：散步30分钟', '第12天：给家人打电话', '第13天：早睡1小时', '第14天：看一部励志电影', '第15天：做一份下周计划',
      '第16天：多喝水2L', '第17天：练字30分钟', '第18天：学习一首新诗', '第19天：整理手机相册', '第20天：做一次拉伸',
      '第21天：写一篇日记', '第22天：学一句外语', '第23天：看一场日落', '第24天：做一次大扫除', '第25天：记10个单词',
      '第26天：听一节播客', '第27天：整理衣柜', '第28天：做一次深呼吸练习', '第29天：写一份本月总结', '第30天：为自己庆祝',
    ]),
    // 模块三：一周快乐生活指南
    ...toItems(m3.id, [
      '周一：给自己买一束花', '周二：吃一顿好吃的', '周三：看一部喜欢的电影', '周四：给朋友发一个有趣的表情包',
      '周五：去一家新餐厅', '周六：睡个懒觉', '周日：做一件一直想做但没做的事',
    ]),
    // 模块四：21天运动习惯养成
    ...toItems(m4.id, [
      '第1天：慢跑15分钟', '第2天：拉伸10分钟', '第3天：跳绳5分钟', '第4天：快走30分钟', '第5天：深蹲30个',
      '第6天：仰卧起坐20个', '第7天：休息（散步10分钟）', '第8天：慢跑20分钟', '第9天：深蹲40个', '第10天：开合跳50个',
      '第11天：快走30分钟', '第12天：拉伸15分钟', '第13天：慢跑25分钟', '第14天：休息（散步10分钟）', '第15天：深蹲50个',
      '第16天：跳绳10分钟', '第17天：快走40分钟', '第18天：仰卧起坐30个', '第19天：慢跑30分钟', '第20天：开合跳60个',
      '第21天：全身拉伸15分钟',
    ]),
    // 模块五：一年四季的仪式感
    ...toItems(m5.id, [
      '春天：去公园看花', '春天：放一次风筝', '春天：整理一次衣柜', '春天：种一盆花', '春天：去郊游野餐',
      '夏天：吃一次西瓜', '夏天：去海边玩水', '夏天：看一次日落', '夏天：吃一支冰淇淋', '夏天：去一次水上乐园',
      '秋天：捡一片好看的落叶做书签', '秋天：看一场秋天的银杏', '秋天：喝一杯热奶茶', '秋天：去一次农场采摘', '秋天：在公园长椅上看书',
      '冬天：看一场雪', '冬天：堆一次雪人', '冬天：泡一次热水澡', '冬天：煮一锅热红酒/热巧克力', '冬天：裹着毯子看一部电影',
    ]),
    ...toItems(m6.id, [
      '《百年孤独》','《巴黎圣母院》','《蓝莓季节》','《阁楼里的密码》','《鱼不存在》','《白夜行》','《云边有个小卖部》',
      '',
    ]),
  ]
  return { modules: [m1, m2, m3, m4, m5, m6], items }
}

/**
 * 读取本地灵感数据
 * 首次使用（无数据）时初始化内置预设模块
 * @returns 灵感数据对象
 */
export function getInspirationData(): InspirationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const init = buildBuiltInData()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
      return init
    }
    const parsed = JSON.parse(raw) as Partial<InspirationData>
    return {
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch (e) {
    console.error('读取灵感数据失败:', e)
    return buildBuiltInData()
  }
}

/**
 * 保存灵感数据到 localStorage
 * @param data - 待保存的灵感数据对象
 */
export function saveInspirationData(data: InspirationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('写入灵感数据失败:', e)
  }
}

/**
 * 新增自定义灵感模块
 * @param name - 模块名称
 * @returns 新生成的模块对象
 */
export function addInspirationModule(name: string): InspirationModule {
  const data = getInspirationData()
  const module: InspirationModule = {
    id: genId(),
    name,
    builtIn: false,
    createdAt: Date.now(),
  }
  data.modules.push(module)
  saveInspirationData(data)
  return module
}

/**
 * 删除灵感模块（同时删除其下所有条目）
 * 内置模块不可删除
 * @param id - 模块唯一标识
 */
export function deleteInspirationModule(id: string): void {
  const data = getInspirationData()
  const target = data.modules.find(m => m.id === id)
  if (!target || target.builtIn) return
  data.modules = data.modules.filter(m => m.id !== id)
  data.items = data.items.filter(i => i.moduleId !== id)
  saveInspirationData(data)
}

/**
 * 新增一条灵感条目
 * @param moduleId - 所属模块 ID
 * @param text - 灵感文本
 * @returns 新生成的条目对象
 */
export function addInspirationItem(moduleId: string, text: string): InspirationItem {
  const data = getInspirationData()
  const item: InspirationItem = {
    id: genId(),
    moduleId,
    text,
    createdAt: Date.now(),
  }
  data.items.push(item)
  saveInspirationData(data)
  return item
}

/**
 * 删除一条灵感条目
 * @param id - 条目唯一标识
 */
export function deleteInspirationItem(id: string): void {
  const data = getInspirationData()
  data.items = data.items.filter(i => i.id !== id)
  saveInspirationData(data)
}
