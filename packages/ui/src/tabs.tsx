import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import { cn } from './cn'

const Root = TabsPrimitive.Root
const List = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  )
)
List.displayName = 'TabsList'
const Trigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className
      )}
      {...props}
    />
  )
)
Trigger.displayName = 'TabsTrigger'
const Content = forwardRef<ElementRef<typeof TabsPrimitive.Content>, ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('mt-2 focus-visible:outline-none', className)}
      {...props}
    />
  )
)
Content.displayName = 'TabsContent'

export const Tabs = { Root, List, Trigger, Content }
