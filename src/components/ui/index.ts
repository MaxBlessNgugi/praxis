/**
 * Warm Ember UI kit.
 *
 * Every colour here comes from the tokens declared in `src/index.css`, and two components reuse
 * behaviour the app already had rather than restating it: `Card` spreads `interactiveCard` for
 * keyboard activation, and `Modal` is built on `useDialog` for dialog semantics. The point of the
 * kit is that a screen built from it cannot drift from the design system or lose a focus ring, a
 * dialog boundary or an accessible name without the change being visible here.
 *
 * See `docs/frontend-blueprint.md` §2 for how adoption is meant to proceed: build a screen on the
 * kit as it is visited, rather than rewriting the whole app's class strings in one pass.
 */
export { Icon, type IconProps } from './Icon';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Input, Textarea, Select, type InputProps, type TextareaProps, type SelectProps } from './Field';
export { Card, type CardProps } from './Card';
export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from './Table';
export { Modal, type ModalProps } from './Modal';
export { Tabs, type TabItem, type TabsProps } from './Tabs';
export { EmptyState, Skeleton, type EmptyStateProps } from './EmptyState';
