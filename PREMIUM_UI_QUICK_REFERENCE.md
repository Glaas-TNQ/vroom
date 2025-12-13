# Premium UI/UX Quick Reference Guide

A quick reference for using the new premium design system in Vroom.

---

## Color Palette

### Primary Colors (Tailwind)
```tsx
bg-primary          // Deep Indigo (#5D4FE3)
bg-secondary        // Electric Violet (#A855F7)
bg-accent           // Cyan/Teal (#03DAC6)
bg-destructive      // Error Red
bg-muted            // Subtle backgrounds
```

### Gradients
```tsx
className="gradient-bg-primary"      // Indigo → Violet
className="gradient-bg-accent"       // Cyan → Indigo
className="gradient-text-primary"    // Text gradient
className="gradient-text-accent"     // Accent text gradient
```

---

## Typography

### Heading Classes
```tsx
<h1 className="text-h1 font-bold tracking-tight">
  // 36px, bold, tight spacing
</h1>

<h2 className="text-h2 font-semibold tracking-tight">
  // 30px, semibold
</h2>

<h3 className="text-h3 font-semibold tracking-tight">
  // 24px, semibold
</h3>
```

### Body Text
```tsx
<p className="text-body-lg leading-relaxed">
  // 18px for descriptions
</p>

<p className="text-body leading-base">
  // 16px standard text
</p>

<label className="text-label uppercase tracking-wide">
  // 14px labels
</label>
```

---

## Buttons

### Variants
```tsx
// Primary - Deep indigo with shadow lift
<Button variant="default">Action</Button>

// Premium Gradient - For main CTAs
<Button variant="gradient" size="lg">
  Start Now
</Button>

// Accent - Cyan for special actions
<Button variant="accent">Quick Action</Button>

// Secondary - Violet
<Button variant="secondary">Secondary</Button>

// Outline - Border with hover
<Button variant="outline">Learn More</Button>

// Ghost - Minimal
<Button variant="ghost">Cancel</Button>
```

### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconName /></Button>
```

---

## Cards

### Elevation System
```tsx
// Subtle - For secondary content
<Card elevation="sm">
  <CardContent>...</CardContent>
</Card>

// Default - Standard cards
<Card elevation="md">
  <CardContent>...</CardContent>
</Card>

// Prominent - Important cards
<Card elevation="lg">
  <CardContent>...</CardContent>
</Card>

// Maximum - Hero cards
<Card elevation="xl">
  <CardContent>...</CardContent>
</Card>
```

### Interactive Cards
```tsx
<Card elevation="lg" interactive onClick={handleClick}>
  // Adds hover scale + border accent
</Card>
```

---

## Badges

### Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="gradient">Premium</Badge>
<Badge variant="accent">New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="outline">Tag</Badge>
<Badge variant="destructive">Error</Badge>
```

---

## Form Components

### Inputs
```tsx
// All inputs now have:
// - 2px borders with hover/focus states
// - 11px height (44px)
// - Premium transitions
<Input
  type="text"
  placeholder="Enter text..."
  className="..." // Additional classes if needed
/>
```

### Textareas
```tsx
<Textarea
  placeholder="Enter description..."
  rows={4}
/>
```

---

## Modals/Dialogs

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="gradient">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Now has 16-24px border radius, enhanced shadows */}
    <DialogHeader>
      <DialogTitle>Premium Modal</DialogTitle>
      <DialogDescription>
        Enhanced typography and spacing
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="gradient">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Shadows

### Using Shadow Utilities
```tsx
className="shadow-sm"    // Subtle
className="shadow-md"    // Default cards
className="shadow-lg"    // Elevated
className="shadow-xl"    // Prominent
className="shadow-2xl"   // Maximum
```

### Glow Effects
```tsx
className="shadow-glow-primary"  // Indigo glow
className="shadow-glow-accent"   // Cyan glow
```

---

## Border Radius

```tsx
className="rounded-lg"    // 8px - Buttons, inputs
className="rounded-xl"    // 12px - Cards
className="rounded-2xl"   // 16px - Modals
className="rounded-3xl"   // 24px - Large modals
className="rounded-full"  // Full - Avatars, badges
```

---

## Animations & Transitions

### Utility Classes
```tsx
className="transition-premium"     // 250ms smooth
className="transition-lift"        // Transform + shadow
className="scale-on-hover"        // Scale 1.02
className="scale-card-hover"      // Scale 1.01

className="animate-shimmer"       // Loading shimmer
className="animate-fade-in"       // Fade in effect
className="animate-slide-in"      // Slide from right
className="animate-pulse-glow"    // Pulsing glow
```

---

## Loading States

### Skeleton with Shimmer
```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-12 w-full" />
<Skeleton className="h-4 w-3/4 mt-2" />
<Skeleton className="h-4 w-1/2 mt-2" />
```

---

## Common Patterns

### Hero Section
```tsx
<div className="text-center space-y-4">
  <h1 className="text-h1 font-bold gradient-text-primary">
    Welcome to Vroom
  </h1>
  <p className="text-body-lg text-muted-foreground leading-relaxed">
    Your executive AI assistant
  </p>
  <div className="flex gap-4 justify-center">
    <Button variant="gradient" size="lg">
      Get Started
    </Button>
    <Button variant="outline" size="lg">
      Learn More
    </Button>
  </div>
</div>
```

### Feature Card
```tsx
<Card elevation="lg" interactive>
  <CardHeader>
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-primary" strokeWidth={2.5} />
    </div>
    <CardTitle className="text-h3">Feature Title</CardTitle>
    <CardDescription>
      Enhanced description with better typography
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button variant="ghost" className="w-full">
      Explore →
    </Button>
  </CardContent>
</Card>
```

### Status Badge
```tsx
<div className="flex items-center gap-2">
  <Badge variant="accent">Active</Badge>
  <Badge variant="outline">Pro User</Badge>
  <Badge variant="gradient">Premium</Badge>
</div>
```

### Form Group
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <label className="text-label font-medium">
      Email Address
    </label>
    <Input type="email" placeholder="you@example.com" />
  </div>
  <div className="space-y-2">
    <label className="text-label font-medium">
      Message
    </label>
    <Textarea placeholder="Your message..." />
  </div>
  <Button variant="gradient" className="w-full">
    Submit
  </Button>
</div>
```

---

## Dark Mode

All components automatically adapt to dark mode. To toggle:

```tsx
import { useTheme } from "next-themes"

const { theme, setTheme } = useTheme()

<Button
  variant="ghost"
  size="icon"
  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
>
  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
</Button>
```

---

## Best Practices

### DO:
- Use `variant="gradient"` for primary CTAs
- Apply elevation to important cards
- Use gradient text for hero headlines
- Maintain minimum 44px touch targets
- Use semantic text sizes (text-h1, text-body, etc.)
- Apply interactive prop to clickable cards

### DON'T:
- Mix too many gradients on one page
- Use glow effects excessively
- Ignore hover states on interactive elements
- Use hard-coded colors instead of design tokens
- Forget to test dark mode
- Use emojis (replace with Lucide icons)

---

## Icon Guidelines

All icons should use Lucide React with these settings:

```tsx
import { IconName } from "lucide-react"

<IconName
  className="w-5 h-5"
  strokeWidth={2.5}  // Standard weight
/>

// For primary actions
<IconName
  className="w-6 h-6 text-primary"
  strokeWidth={2.5}
/>

// For accent actions
<IconName
  className="w-5 h-5 text-accent"
  strokeWidth={2.5}
/>
```

---

## Spacing Scale

Use Tailwind spacing for consistency:
```
space-y-2   // 0.5rem (8px)  - Tight spacing
space-y-4   // 1rem (16px)   - Default spacing
space-y-6   // 1.5rem (24px) - Section spacing
space-y-8   // 2rem (32px)   - Large sections
```

---

## Quick Start Checklist

When creating a new page/component:

1. [ ] Use semantic heading sizes (text-h1, text-h2, text-h3)
2. [ ] Apply appropriate card elevation
3. [ ] Use gradient variant for primary CTAs
4. [ ] Add hover states to interactive elements
5. [ ] Test in both light and dark mode
6. [ ] Ensure all touch targets are 44px+
7. [ ] Use Lucide icons with strokeWidth={2.5}
8. [ ] Apply proper spacing (space-y-4, space-y-6)
9. [ ] Use muted-foreground for secondary text
10. [ ] Test animations respect prefers-reduced-motion

---

## Support

For questions or issues with the design system:
- Review: `PREMIUM_UI_REDESIGN_SUMMARY.md`
- Check: `src/index.css` for all CSS variables
- Inspect: `tailwind.config.ts` for extended utilities

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-12-13
