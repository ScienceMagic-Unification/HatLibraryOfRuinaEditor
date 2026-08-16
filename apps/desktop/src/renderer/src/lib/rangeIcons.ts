import nearUrl from '../assets/images/range/Range_Near.png'
import farUrl from '../assets/images/range/Range_Far.png'
import specialUrl from '../assets/images/range/Range_Special.png'
import instanceUrl from '../assets/images/range/Range_Instance.png'
import farAreaUrl from '../assets/images/range/Range_FarArea.png'

/** 内置射程图标（FarArea 与 FarAreaEach 共用群体攻击图） */
export const rangeIconUrls: Record<string, string> = {
  near: nearUrl,
  far: farUrl,
  special: specialUrl,
  instance: instanceUrl,
  aoe: farAreaUrl
}

export const rangeIconKey: Record<string, string> = {
  Near: 'near',
  Far: 'far',
  Special: 'special',
  Instance: 'instance',
  FarArea: 'aoe',
  FarAreaEach: 'aoe'
}
const chapterModules = import.meta.glob('../assets/images/chapter/*.png', { eager: true, import: 'default' }) as Record<string, string>

/** 章节图标：Ch1 ~ Ch7（自定义无图标） */
export const chapterIconUrls: Record<string, string> = {
  ch1: chapterModules['../assets/images/chapter/Icon_Ch1.png'],
  ch2: chapterModules['../assets/images/chapter/Icon_Ch2.png'],
  ch3: chapterModules['../assets/images/chapter/Icon_Ch3.png'],
  ch4: chapterModules['../assets/images/chapter/Icon_Ch4.png'],
  ch5: chapterModules['../assets/images/chapter/Icon_Ch5.png'],
  ch6: chapterModules['../assets/images/chapter/Icon_Ch6.png'],
  ch7: chapterModules['../assets/images/chapter/Icon_Ch7.png']
}

export function resolveIconUrl(key?: string): string | undefined {
  if (!key) return undefined
  return rangeIconUrls[key] ?? chapterIconUrls[key]
}