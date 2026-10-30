const messages: Record<string, [string, string, string]> = {
  'workspace.preview': ['预览', 'Preview', 'プレビュー'],
  'id.duplicate': ['ID {id} 已存在', 'ID {id} already exists', 'ID {id} は既に存在します'],
  'graph.reception': ['接待', 'Receptions', '接待'], 'graph.rewards': ['掉落与饰品', 'Drops and gifts', 'ドロップと装飾品'],
  'graph.emotion': ['异想体', 'Abnormalities', '幻想体'], 'graph.dialogue': ['战斗对白', 'Battle dialogue', '戦闘台詞'],
  'module.stage': ['接待', 'Receptions', '接待'], 'module.deck': ['卡组', 'Decks', 'デッキ'],
  'module.dropbook': ['掉落书籍', 'Drop books', 'ドロップ本'], 'module.carddrops': ['书页掉落表', 'Card drop tables', 'ページドロップ表'],
  'module.emotioncard': ['异想体书页', 'Abnormality pages', '幻想体ページ'], 'module.emotionego': ['楼层 E.G.O', 'Floor E.G.O', '階の E.G.O'],
  'module.gift': ['饰品', 'Gifts', '装飾品'], 'module.formation': ['阵型', 'Formations', '陣形'],
  'module.character-stage-names': ['角色与接待名称', 'Character and reception names', 'キャラクター・接待名'],
  'module.abnormalitytext': ['异想体书页文本', 'Abnormality page text', '幻想体ページ説明'],
  'module.abnormalityability': ['异想体能力文本', 'Abnormality ability text', '幻想体能力説明'],
  'module.gifttext': ['饰品文本', 'Gift text', '装飾品説明'], 'module.battledialog': ['战斗对白', 'Battle dialogue', '戦闘台詞'],
  'module.dialogrelation': ['核心书页对白关联', 'Key page dialogue links', 'コアページ台詞関連']
}
const labels: Record<string, [string, string]> = {
  '固定普通邀请': ['Fixed general invitation', '通常招待に固定'], '锁定': ['Locked', 'ロック'],
  '战斗中锁定': ['Locked in battle', '戦闘中ロック'], '原版文本 ID': ['Original text ID', '原作テキスト ID'],
  '情感书页': ['Emotion pages', '感情ページ'], '异想体书页 ID': ['Abnormality page ID', '幻想体ページ ID'],
  '核心书页': ['Key pages', 'コアページ'], '被动能力': ['Passive abilities', 'パッシブ能力'],
  'Malkuth': ['Malkuth', 'マルクト'], 'Yesod': ['Yesod', 'イェソド'], 'Hod': ['Hod', 'ホド'], 'Netzach': ['Netzach', 'ネツァク'],
  'Tiphereth': ['Tiphereth', 'ティファレト'], 'Gebura': ['Gebura', 'ゲブラー'], 'Chesed': ['Chesed', 'ケセド'],
  'Binah': ['Binah', 'ビナー'], 'Hokma': ['Hokma', 'ホクマー'], 'Keter': ['Keter', 'ケテル'],
  '可用楼层数': ['Available floors', '使用可能な階数'], '接待类型': ['Reception type', '接待タイプ'],
  '剧情类型': ['Story type', 'ストーリータイプ'], '邀请类型': ['Invitation type', '招待タイプ'],
  '波次': ['Waves', '舞台'], '阵型 ID': ['Formation ID', '陣形 ID'], '排列方式': ['Formation order', '配置順'],
  '出战人数': ['Available units', '出撃人数'], '战斗脚本': ['Battle script', '戦闘スクリプト'], '仇恨脚本': ['Aggro script', '敵対スクリプト'],
  '敌人单位': ['Enemy units', '敵ユニット'], '邀请条件': ['Invitation', '招待条件'], '组合方式': ['Combination', '組み合わせ'],
  '邀请书籍数量': ['Invitation book count', '招待本の数'], '邀请书籍价值': ['Invitation book value', '招待本の価値'],
  '邀请书籍': ['Invitation books', '招待本'], '书籍 ID': ['Book ID', '本 ID'], '前置接待': ['Prerequisite receptions', '前提接待'],
  '接待 ID': ['Reception ID', '接待 ID'], '剧情': ['Stories', 'ストーリー'], '剧情 ID': ['Story ID', 'ストーリー ID'],
  '触发条件': ['Trigger', '発動条件'], '奖励': ['Rewards', '報酬'], '奖励类型': ['Reward type', '報酬タイプ'],
  '限定楼层': ['Restricted floor', '限定階'], '排除楼层': ['Excluded floors', '除外階'], '章节终战': ['Chapter finale', 'チャプター最終戦'],
  '楼层': ['Floor', '階'], '文本 ID': ['Text ID', 'テキスト ID'], '书籍图标': ['Book icon', '本のアイコン'],
  '核心书页概率': ['Key page probability', 'コアページ確率'], '书籍价值': ['Book value', '本の価値'],
  '掉落数量': ['Drop count', 'ドロップ数'], '掉落状态': ['Drop state', 'ドロップ状態'], '掉落项目': ['Drops', 'ドロップ項目'],
  '掉落类型': ['Drop type', 'ドロップタイプ'], '情感类型': ['Emotion type', '感情タイプ'], '情感状态': ['Emotion state', '感情状態'],
  '层级': ['Tier', '段階'], '情感比率': ['Emotion rate', '感情比率'], '目标类型': ['Target type', '対象タイプ'],
  '能力脚本': ['Ability script', '能力スクリプト'], '仅司书': ['Librarians only', '司書のみ'],
  '战斗书页 ID': ['Combat page ID', 'バトルページ ID'], '资源': ['Resource', 'リソース'], '佩戴位置': ['Equip position', '装着位置'],
  '被动 ID': ['Passive ID', 'パッシブ ID'], '生命加成': ['HP bonus', '体力補正'], '混乱加成': ['Stagger bonus', '混乱補正'],
  '隐藏外观': ['Hide appearance', '外観を非表示'], '解锁条件': ['Unlock condition', '解放条件'], '站位': ['Positions', '立ち位置'], '坐标': ['Coordinates', '座標'],
  '异想体书页': ['Abnormality pages', '幻想体ページ'], '异想体': ['Abnormality', '幻想体'], '背景文本': ['Flavor text', 'フレーバーテキスト'],
  '对白': ['Dialogue', '台詞'], '文本': ['Text', 'テキスト'], '前缀': ['Prefix', '接頭辞'], '后缀': ['Suffix', '接尾辞'],
  '获取条件': ['Acquire condition', '獲得条件'], '触发事件': ['Events', 'イベント'], '事件 ID': ['Event ID', 'イベント ID'],
  '对白组': ['Dialogue group', '台詞グループ'], '角色 ID': ['Character ID', 'キャラクター ID'], '卡组 ID': ['Deck ID', 'デッキ ID'],
  '初始情感': ['Initial emotion', '初期感情'], '掉落表': ['Drop tables', 'ドロップ表'], '权重': ['Weight', '重み'],
  '可撤退': ['Can retreat', '撤退可能'], '未知身份': ['Unknown identity', '正体不明'],
  '模组 ID': ['Mod ID', 'Mod ID']
}
export const workspaceMessages = {
  zh: Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[0]])),
  en: Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[1]])),
  jp: Object.fromEntries(Object.entries(messages).map(([key, values]) => [key, values[2]]))
}
export const workspaceLabels = {
  zh: { ...Object.fromEntries(Object.keys(labels).map((key) => [key, key])), Malkuth: '历史层', Yesod: '科技层', Hod: '文学层', Netzach: '艺术层', Tiphereth: '自然科学层', Gebura: '语言层', Chesed: '社会科学层', Binah: '哲学层', Hokma: '宗教层', Keter: '总类层' },
  en: Object.fromEntries(Object.entries(labels).map(([key, values]) => [key, values[0]])),
  jp: Object.fromEntries(Object.entries(labels).map(([key, values]) => [key, values[1]]))
}
