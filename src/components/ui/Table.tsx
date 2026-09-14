import React from 'react';

/**
 * Table structure, without an opinion about the data.
 *
 * Composed rather than configured: a caller with a sortable column says so on the header cell, and
 * a caller with no rows renders `EmptyState` inside the body instead of a bare table. That keeps
 * the sorting and empty decisions where the data is, which is where they have to be made.
 */
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`w-full overflow-x-auto rounded-[14px] border border-border-default bg-warm-surface ${className}`}>
    <table className="w-full border-collapse text-left">{children}</table>
  </div>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-warm-sidebar border-b border-border-default">{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-border-default">{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...rest }) => (
  <tr className={`hover:bg-warm-surface-hover transition-colors ${className}`} {...rest}>
    {children}
  </tr>
);

export const TableHeaderCell: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement> & { /** Set to enable click-to-sort on this column. */ onSort?: () => void }
> = ({ onSort, className = '', children, ...rest }) => (
  <th
    scope="col"
    aria-sort={onSort ? 'none' : undefined}
    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary ${className}`}
    {...rest}
  >
    {onSort ? (
      <button type="button" onClick={onSort} className="inline-flex items-center gap-1 cursor-pointer hover:text-text-primary">
        {children}
        <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: 14 }}>
          unfold_more
        </span>
      </button>
    ) : (
      children
    )}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <td className={`px-4 py-2.5 text-xs text-text-primary ${className}`} {...rest}>
    {children}
  </td>
);
