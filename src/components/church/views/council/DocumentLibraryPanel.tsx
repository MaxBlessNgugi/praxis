import React, { useState } from 'react';
import { governanceApi, type DocumentKind, type GovernanceDocumentDto } from '../../../../lib/api';
import { errorMessage, useGovernanceDocuments } from '../../../../hooks/useApi';
import { useFileUrl } from '../../../../hooks/useFileUrl';
import { usePermissions } from '../../../../lib/permissions';
import { useDialog } from '../../dialog';
import { FileUpload } from '../../FileUpload';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { Notice, Pager, RetireDialog } from './CouncilControls';
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABELS, FIELD, LABEL, RECORD_RETIRE_REASONS, dayOf } from './vocabulary';

/**
 * The library: the constitution, the by-laws, the policies and the minutes the church holds.
 *
 * Two things about a library are easy to get wrong and both are handled here. A document has a
 * **version** and a flag for whether it is the version in force, so a superseded policy stays readable
 * without being mistaken for law. And a document can be **the paper the church actually holds** —
 * uploaded through the same file store the church's logo uses — as well as a by-law that lives on the
 * church's own website, which is what the link field is for.
 */

const EMPTY_DRAFT = {
  id: null as string | null,
  title: '',
  kind: 'bylaw' as DocumentKind,
  reference: '',
  version: '1.0',
  adoptedAt: '',
  body: '',
  fileUrl: '',
  fileId: '',
  isActive: true,
};
type Draft = typeof EMPTY_DRAFT;

/** The held copy, fetched through the API client because a link cannot carry the bearer token. */
const HeldCopy: React.FC<{ fileId: string; fileName: string }> = ({ fileId, fileName }) => {
  const { url, loading, error } = useFileUrl(fileId);
  if (loading) return <span className="text-[11px] text-[#57534E]">Opening {fileName}…</span>;
  if (error || !url) return <span className="text-[11px] text-[#B91C1C]">{fileName} could not be opened.</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-bold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
    >
      Open {fileName}
    </a>
  );
};

export const DocumentLibraryPanel: React.FC = () => {
  const { canEdit, canDelete } = usePermissions();

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<DocumentKind | ''>('');
  const [inForceOnly, setInForceOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const documents = useGovernanceDocuments({
    q: query || undefined,
    kind: kind || undefined,
    isActive: inForceOnly ? true : undefined,
    page,
    pageSize,
  });

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [reading, setReading] = useState<GovernanceDocumentDto | null>(null);
  const [retiring, setRetiring] = useState<GovernanceDocumentDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const formDialog = useDialog(() => setFormOpen(false), draft.id ? 'Amend the document' : 'File a document');
  const readingDialog = useDialog(() => setReading(null), 'The document');

  const rows = documents.items;
  const total = documents.meta?.total ?? rows.length;
  /** The whole library, so the chip beside "Everything" counts the library rather than the current filter. */
  const census = Object.values(documents.counts).reduce((sum, count) => sum + count, 0);
  const announce = (message: string) => {
    setError(null);
    setNotice(message);
  };

  const openForm = (document?: GovernanceDocumentDto) => {
    setError(null);
    setDraft(
      document
        ? {
            id: document.id,
            title: document.title,
            kind: document.kind,
            reference: document.reference,
            version: document.version,
            adoptedAt: document.adoptedAt ? document.adoptedAt.slice(0, 10) : '',
            body: document.body ?? '',
            fileUrl: document.fileUrl ?? '',
            fileId: document.fileId ?? '',
            isActive: document.isActive,
          }
        : EMPTY_DRAFT,
    );
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: draft.title.trim(),
      kind: draft.kind,
      reference: draft.reference.trim(),
      version: draft.version.trim(),
      isActive: draft.isActive,
      ...(draft.adoptedAt ? { adoptedAt: draft.adoptedAt } : {}),
      ...(draft.body.trim() ? { body: draft.body.trim() } : {}),
      ...(draft.fileUrl.trim() ? { fileUrl: draft.fileUrl.trim() } : {}),
      ...(draft.fileId ? { fileId: draft.fileId } : {}),
    };
    try {
      if (draft.id) {
        const { data } = await governanceApi.updateDocument(draft.id, body);
        announce(
          data.isActive
            ? `${data.reference} is in force at version ${data.version}.`
            : `${data.reference} is kept on file, out of force.`,
        );
      } else {
        const { data } = await governanceApi.createDocument(body);
        announce(`${data.reference} is filed under ${DOCUMENT_KIND_LABELS[data.kind].toLowerCase()}.`);
      }
      setFormOpen(false);
      await documents.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const retire = async (reason: string, reasonLabel: string) => {
    if (!retiring) return;
    setBusy(true);
    setError(null);
    try {
      await governanceApi.retireDocument(retiring.id, { reason, reasonLabel });
      setRetiring(null);
      setReading(null);
      announce('The document is in the Trash, where an administrator can restore it.');
      await documents.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <Notice tone="bad">{error}</Notice>}
      {notice && <Notice tone="ok">{notice}</Notice>}

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">menu_book</span>
              Policy, Constitution &amp; By-laws
            </h2>
            <p className="mt-0.5 text-xs text-[#57534E]">
              The papers the council works from — what is in force, what version, and the copy the church holds.
            </p>
          </div>
          {canEdit('council') && (
            <button
              type="button"
              onClick={() => openForm()}
              className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C2410C] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">upload_file</span>
              File a document
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="doc-q">Search the library</label>
            <input
              id="doc-q"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by title, reference or the text itself"
              className={`${FIELD} sm:w-72`}
            />
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by kind">
              {(['', ...DOCUMENT_KINDS] as Array<DocumentKind | ''>).map((option) => {
                const count = option === '' ? census : (documents.counts[option] ?? 0);
                return (
                  <button
                    key={option || 'all'}
                    type="button"
                    aria-pressed={kind === option}
                    onClick={() => {
                      setKind(option);
                      setPage(1);
                    }}
                    className={`rounded-[9px] border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      kind === option
                        ? 'border-[#C2410C] bg-[#C2410C] text-white'
                        : 'border-[#E7E5E4] bg-[#FFFFFF] text-[#57534E] hover:bg-[#F5EDE4]'
                    }`}
                  >
                    {option === '' ? 'Everything' : DOCUMENT_KIND_LABELS[option]} · {count}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
            <input
              type="checkbox"
              checked={inForceOnly}
              onChange={(event) => {
                setInForceOnly(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-[#C2410C]"
            />
            In force only
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {documents.loading && <LoadingBlock label="Reading the library…" />}
          {documents.error && <ErrorBlock message={documents.error} onRetry={() => void documents.refetch()} />}
          {!documents.loading && !documents.error && rows.length === 0 && (
            <EmptyBlock
              icon="description"
              title="Nothing in the library"
              hint="The constitution and the policies the council works from belong here, so a minute can cite the paper it decided under."
            />
          )}

          {rows.map((document) => (
            <div key={document.id} className="rounded-[12px] border border-[#E7E5E4] bg-[#FFFFFF] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-headline text-xs font-bold text-[#C2410C]">{document.reference}</span>
                    <span className="rounded-md bg-[#F5EDE4] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#57534E]">
                      {DOCUMENT_KIND_LABELS[document.kind]}
                    </span>
                    <span className="text-[11px] font-semibold text-[#57534E]">Version {document.version}</span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        document.isActive
                          ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
                          : 'border-[#E7E5E4] bg-[#FDF8F3] text-[#57534E]'
                      }`}
                    >
                      {document.isActive ? 'In force' : 'Superseded'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-[#1C1917]">{document.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#57534E]">
                    {document.adoptedAt ? `Adopted ${dayOf(document.adoptedAt)}` : 'No adoption date recorded'}
                    {document.file ? ` · Holds ${document.file.fileName}` : ''}
                    {document.fileUrl ? ' · Linked copy' : ''}
                  </p>
                  {document.body && <p className="mt-1 line-clamp-2 text-xs text-[#57534E]">{document.body}</p>}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {(document.body || document.file || document.fileUrl) && (
                    <button
                      type="button"
                      onClick={() => setReading(document)}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
                      Read it
                    </button>
                  )}
                  {canEdit('council') && (
                    <button
                      type="button"
                      onClick={() => openForm(document)}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                      Amend
                    </button>
                  )}
                  {canDelete('council') && (
                    <button
                      type="button"
                      onClick={() => setRetiring(document)}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                      Retire
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {rows.length > 0 && (
            <Pager
              page={documents.meta?.page ?? page}
              pageSize={pageSize}
              total={total}
              noun="documents"
              onPage={setPage}
            />
          )}
        </div>
      </div>

      {reading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...readingDialog}>
          <div className="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <p className="font-headline text-xs font-bold text-[#C2410C]">
              {reading.reference} · Version {reading.version}
            </p>
            <h3 className="mt-1 font-headline text-lg font-bold text-[#1C1917]">{reading.title}</h3>
            <p className="mt-0.5 text-[11px] text-[#57534E]">
              {DOCUMENT_KIND_LABELS[reading.kind]} ·{' '}
              {reading.adoptedAt ? `adopted ${dayOf(reading.adoptedAt)}` : 'no adoption date recorded'} ·{' '}
              {reading.isActive ? 'in force' : 'superseded'}
            </p>

            {reading.body && <p className="mt-4 whitespace-pre-line text-xs leading-relaxed text-[#1C1917]">{reading.body}</p>}
            {reading.file && (
              <p className="mt-4">
                <HeldCopy fileId={reading.file.id} fileName={reading.file.fileName} />
              </p>
            )}
            {reading.fileUrl && (
              <p className="mt-2 text-[11px]">
                <a
                  href={reading.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]"
                >
                  The church keeps a copy here
                </a>
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setReading(null)}
                className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...formDialog}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">
              {draft.id ? 'Amend the document' : 'File a document'}
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              A new version of a policy keeps its reference and takes a new number, so the one it replaces stays readable.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="doc-title">What is it called?</label>
                <input
                  id="doc-title"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Financial Management Policy"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="doc-kind">What kind of paper</label>
                <select
                  id="doc-kind"
                  value={draft.kind}
                  onChange={(event) => setDraft({ ...draft, kind: event.target.value as DocumentKind })}
                  className={FIELD}
                >
                  {DOCUMENT_KINDS.map((option) => (
                    <option key={option} value={option}>
                      {DOCUMENT_KIND_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="doc-reference">Its reference in the register</label>
                <input
                  id="doc-reference"
                  required
                  value={draft.reference}
                  onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
                  placeholder="GC-FIN-004"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="doc-version">Version</label>
                <input
                  id="doc-version"
                  required
                  value={draft.version}
                  onChange={(event) => setDraft({ ...draft, version: event.target.value })}
                  placeholder="2.1"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="doc-adopted">When it was adopted</label>
                <input
                  id="doc-adopted"
                  type="date"
                  value={draft.adoptedAt}
                  onChange={(event) => setDraft({ ...draft, adoptedAt: event.target.value })}
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="doc-body">The text, or a summary of it</label>
                <textarea
                  id="doc-body"
                  rows={5}
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  placeholder="What the paper requires of the office."
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="doc-link">A link to a copy held elsewhere</label>
                <input
                  id="doc-link"
                  type="url"
                  value={draft.fileUrl}
                  onChange={(event) => setDraft({ ...draft, fileUrl: event.target.value })}
                  placeholder="https://…"
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <FileUpload
                  purpose="document"
                  label="The copy the church holds"
                  hint="A scan or a PDF. Attaching one makes the minute's reference openable."
                  accept="application/pdf,image/png,image/jpeg,text/plain"
                  currentFileId={draft.fileId || null}
                  preview={false}
                  onUploaded={(file) => setDraft((previous) => ({ ...previous, fileId: file.id }))}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                  className="h-4 w-4 accent-[#C2410C]"
                />
                This is the version in force
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Saving…' : draft.id ? 'Save the amendment' : 'File it'}
              </button>
            </div>
          </form>
        </div>
      )}

      {retiring && (
        <RetireDialog
          what={retiring.reference}
          caption={`${retiring.title}, version ${retiring.version}.`}
          reasons={RECORD_RETIRE_REASONS}
          busy={busy}
          onClose={() => setRetiring(null)}
          onConfirm={(reason, reasonLabel) => void retire(reason, reasonLabel)}
        />
      )}
    </div>
  );
};
