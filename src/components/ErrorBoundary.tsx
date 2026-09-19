import React from 'react';
import { clearToken } from '../lib/api';
import { EmptyBlock } from './church/DataState';

/**
 * The last line between a bug and a white screen.
 *
 * Without one, a single `undefined` in a render — a field the API did not send, a list that arrived
 * empty — unmounts the entire tree and the office is left staring at a blank page with no way back.
 * A boundary does not fix the bug; it keeps the console acknowledging that something went wrong,
 * which is the difference between "the system is broken" and "this screen is broken".
 *
 * Two recovery paths, because they fail for different reasons. **Reload** is for a transient render
 * crash. **Sign out and reload** is for the other common cause: a session that the server has since
 * rejected or a stored token from an older schema, which a plain reload would only replay — so this
 * one clears the token first and returns the visitor to the gate.
 *
 * Must be a class: React only calls `getDerivedStateFromError` and `componentDidCatch` on class
 * components. There is no hook equivalent, deliberately.
 */
/**
 * The section-scoped sibling of the app boundary.
 *
 * The app-level boundary turns a render crash into a full-screen stop; for a bug confined to one
 * section that is more than the situation warrants. The shell wraps each section in one of these,
 * so a crashed panel still leaves the sidebar, the header and every other section working, and the
 * recovery is "try this screen again" rather than "reload everything". Details stay collapsed here
 * too — a user never sees a stack trace as content.
 */
export class PanelErrorBoundary extends React.Component<
  { children: React.ReactNode; section: string },
  ErrorBoundaryState
> {
  props: { children: React.ReactNode; section: string };

  /** Declared for the same reason as the app boundary's `props`: the project builds without
   *  @types/react, so the base class's re-render methods are invisible to the compiler. React
   *  still owns the real one — this stays type-only and emits nothing. */
  declare setState: (state: Partial<ErrorBoundaryState>) => void;

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[Praxis] The ${this.props.section} panel crashed while rendering:`, error, info.componentStack);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="w-full px-6 sm:px-8 py-12">
        <div className="max-w-md mx-auto rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
          <EmptyBlock
            icon="report"
            title="This panel hit an unexpected error"
            hint="Nothing outside this panel was affected and no data was changed. Trying again usually clears it."
            action={
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="mt-2 px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
              >
                Try again
              </button>
            }
          />
        </div>
      </div>
    );
  }
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /** Declared explicitly because the project builds without `@types/react`, so the base class's
   *  own `props` is not visible to the compiler. React still owns and assigns it. */
  props: ErrorBoundaryProps;

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Kept as a console error rather than swallowed: the message and component stack are what turns
    // "it crashed" into a bug report somebody can act on.
    console.error('[Praxis] The console crashed while rendering:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleSignOut = (): void => {
    clearToken();
    window.location.replace(window.location.pathname);
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="w-screen h-screen flex items-center justify-center bg-[#FDF8F3] text-[#1C1917] p-6"
      >
        <div className="w-full max-w-xl bg-white rounded-[16px] border border-[#E7E5E4] shadow-warm-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-[#B91C1C]">
              report
            </span>
            <div>
              <h1 className="font-headline text-lg font-bold">Something went wrong on this screen</h1>
              <p className="text-sm text-[#57534E] mt-1 leading-relaxed">
                The console hit an unexpected error and stopped rendering it. Your data has not been
                changed. Reloading usually clears it; if it keeps happening, sign out and back in.
              </p>
            </div>
          </div>

          <details className="rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2">
            <summary className="text-xs font-bold text-[#57534E] cursor-pointer">
              Technical detail (for whoever fixes this)
            </summary>
            <pre className="mt-2 text-[11px] font-mono text-[#57534E] whitespace-pre-wrap break-words">
              {error.name}: {error.message}
            </pre>
          </details>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
            <button
              type="button"
              onClick={this.handleSignOut}
              className="px-4 py-2 rounded-[10px] border border-[#E7E5E4] bg-white text-xs font-bold text-[#57534E] hover:bg-[#FDF8F3] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
            >
              Sign out and reload
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-[10px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
            >
              Reload the console
            </button>
          </div>
        </div>
      </div>
    );
  }
}
