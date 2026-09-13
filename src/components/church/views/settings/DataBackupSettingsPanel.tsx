import React, { useState } from 'react';
import { DataBackupSnapshot } from '../../../../types';
import { dialogProps } from '../../dialog';
import { INITIAL_BACKUP_SNAPSHOTS } from '../../../../data/churchMockData'
;

export const DataBackupSettingsPanel: React.FC = () => {
  const [backups, setBackups] = useState<DataBackupSnapshot[]>(INITIAL_BACKUP_SNAPSHOTS);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState<boolean>(false);
  const [backupLabel, setBackupLabel] = useState<string>('Pre-Council Audit Snapshot');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<DataBackupSnapshot | null>(null);

  const handleCreateBackup = (e: React.FormEvent) => {
    e.preventDefault();
    const newSnapshot: DataBackupSnapshot = {
      id: `bk-${Date.now()}`,
      snapshotDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileSizeMb: 14.8,
      recordsCount: 342,
      backupType: 'manual',
      status: 'verified',
      description: backupLabel || 'Manual Church Census & Ledger Backup',
    };

    setBackups([newSnapshot, ...backups]);
    setIsCreatingSnapshot(false);
    setSuccessMessage('Church dataset snapshot created and checksum verified!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backups, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "grace_valley_parish_census_canonical.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreSnapshot = () => {
    if (!isRestoring) return;
    setSuccessMessage(`Dataset restored successfully from snapshot #${isRestoring.id.toUpperCase()}`);
    setTimeout(() => setSuccessMessage(null), 4000);
    setIsRestoring(null);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">backup</span>
            Church Data Sovereignty, Backup & Archival
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Automated midnight snapshots, local JSON exports, and encrypted members register archives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-[8px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#1C1917] text-xs font-bold border border-[#E7E5E4] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingSnapshot(true)}
            className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
            Create Snapshot
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-[12px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Snapshot List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">
          Archived Snapshots (SHA-256 Verified)
        </h4>

        <div className="space-y-2.5">
          {backups.map((snap) => (
            <div
              key={snap.id}
              className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1C1917]">{snap.description}</span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      snap.backupType === 'automated-nightly'
                        ? 'bg-[#2563EB]/10 text-[#2563EB]'
                        : 'bg-[#C2410C]/10 text-[#C2410C]'
                    }`}
                  >
                    {snap.backupType}
                  </span>
                  <span className="text-[10px] font-bold text-[#059669] flex items-center gap-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[12px]">verified</span>
                    Verified
                  </span>
                </div>

                <div className="text-xs text-[#57534E] flex items-center gap-3">
                  <span>Timestamp: <strong className="text-[#1C1917] font-mono">{snap.snapshotDate}</strong></span>
                  <span>Size: <strong className="text-[#1C1917] font-mono">{snap.fileSizeMb} MB</strong></span>
                  <span>Records: <strong className="text-[#1C1917] font-mono">{snap.recordsCount} Rows</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1 rounded-[6px] bg-[#FFFFFF] hover:bg-[#E7E5E4] text-[#1C1917] text-xs font-bold border border-[#E7E5E4] transition-colors cursor-pointer"
                >
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => setIsRestoring(snap)}
                  className="px-2.5 py-1 rounded-[6px] bg-[#F8F1E9] hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#57534E] text-xs font-bold border border-[#E7E5E4] transition-colors cursor-pointer"
                >
                  Restore Snapshot
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Create Snapshot */}
      {isCreatingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setIsCreatingSnapshot(false), "Create Instant Data Snapshot")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Create Instant Data Snapshot</h3>
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="mt-4 space-y-4">
              <div>
                <label htmlFor="backup-snapshot-label" className="block text-xs font-bold text-[#1C1917] mb-1">Snapshot Label / Reason *</label>
                <input id="backup-snapshot-label" aria-label="Snapshot Label / Reason"
                  type="text"
                  required
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <p className="text-xs text-[#57534E] leading-relaxed">
                This will bundle all active church registers, finance ledgers, service reports, and volunteer rosters into an immutable snapshot.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsCreatingSnapshot(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Generate Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Restore Snapshot Confirm */}
      {isRestoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setIsRestoring(null), "Confirm Snapshot Restoration")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#DC2626]/40 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E5E4] text-[#DC2626]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">warning</span>
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Confirm Snapshot Restoration</h3>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#57534E] leading-relaxed">
                Are you sure you want to restore the system state to the snapshot taken on <strong>{isRestoring.snapshotDate}</strong> ({isRestoring.description})?
              </p>

              <div className="p-3 rounded-[8px] bg-[#FEE2E2] text-[#991B1B] text-xs font-semibold">
                Any modifications made after this snapshot timestamp will be superseded.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsRestoring(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreSnapshot}
                  className="px-4 py-2 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Proceed with Restoration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
