import { Button } from '@ruina/ui'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

/** 效果文本右侧功能按钮区：参照书页能力，提供校对模式与校对预览开关。 */
export function EffectTextTools(): JSX.Element {
  const { t } = useI18n()
  const proofOn = useAppStore((s) => Boolean(s.proofMode['effecttext']))
  const setProofMode = useAppStore((s) => s.setProofMode)
  const proofPreviewOn = useAppStore((s) => Boolean(s.proofPreview['effecttext']))
  const setProofPreview = useAppStore((s) => s.setProofPreview)

  return (
    <div className="min-w-0 space-y-3 p-3">
      <Button
        size="sm"
        variant={proofOn ? 'default' : 'outline'}
        className={proofOn ? 'w-full border-emerald-500/60 bg-emerald-500/20 font-medium text-emerald-300' : 'w-full'}
        onClick={() => setProofMode('effecttext', !proofOn)}
      >
        {t('proofMode')}：{proofOn ? 'ON' : 'OFF'}
      </Button>
      <Button
        size="sm"
        variant={proofPreviewOn ? 'default' : 'outline'}
        className={proofPreviewOn ? 'w-full border-primary/60 bg-primary/15 font-medium text-primary' : 'w-full'}
        onClick={() => setProofPreview('effecttext', !proofPreviewOn)}
      >
        {t('proof.preview')}：{proofPreviewOn ? 'ON' : 'OFF'}
      </Button>
    </div>
  )
}