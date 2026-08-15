/** 基于序列化快照的撤销/重做栈 */
export class SnapshotHistory {
  private past: string[] = []
  private future: string[] = []
  constructor(private limit = 100) {}

  /** 在即将发生新修改前调用，把当前快照推入撤销栈 */
  push(snapshot: string): void {
    this.past.push(snapshot)
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  /** 撤销：传入当前快照，返回要恢复到的快照；无可撤销时返回 null */
  undo(current: string): string | null {
    const prev = this.past.pop()
    if (prev === undefined) return null
    this.future.push(current)
    return prev
  }

  redo(current: string): string | null {
    const next = this.future.pop()
    if (next === undefined) return null
    this.past.push(current)
    return next
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
