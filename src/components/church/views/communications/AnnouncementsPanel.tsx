import React, { useState } from 'react';
import { AnnouncementItem, AnnouncementAudience } from '../../../../types';
import { dialogProps } from '../../dialog';
import { INITIAL_ANNOUNCEMENTS } from '../../../../data/churchMockData'
;

export const AnnouncementsPanel: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('everyone');
  const [priority, setPriority] = useState<AnnouncementItem['priority']>('normal');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [category, setCategory] = useState<AnnouncementItem['category']>('worship');
  const [expiryDate, setExpiryDate] = useState('Mar 09, 2025');
  const [author, setAuthor] = useState('Church Office Staff');

  const filteredAnnouncements = announcements.filter((ann) => {
    if (selectedAudience !== 'all' && ann.audience !== selectedAudience) return false;
    return true;
  });

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const audienceLabels: Record<AnnouncementAudience, string> = {
      everyone: 'All Members & Guests',
      'members-only': 'Members & Baptized Believers',
      'ministry-leaders': 'Group Leaders & Deacons',
      'youth-roll': 'Youth & Discipleship Class',
      'church-council': 'Church Council Only',
    };

    const newAnn: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title,
      content,
      audience,
      audienceLabel: audienceLabels[audience] || 'Congregation',
      isPinned,
      priority,
      publishDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      expiryDate,
      author,
      category,
      status: 'active',
    };

    setAnnouncements([newAnn, ...announcements]);
    setIsCreating(false);
    setTitle('');
    setContent('');
  };

  const handleTogglePin = (id: string) => {
    setAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, isPinned: !a.isPinned } : a))
    );
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Active Bulletins</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{announcements.length} Published</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">check_circle</span>
              All channels synchronized
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">campaign</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Pinned Notices</span>
            <div className="text-2xl font-black text-[#C2410C] mt-0.5">
              {announcements.filter((a) => a.isPinned).length} Featured
            </div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">push_pin</span>
              Promoted on Church Notice Board
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">push_pin</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Urgent Priority</span>
            <div className="text-2xl font-black text-[#DC2626] mt-0.5">
              {announcements.filter((a) => a.priority === 'urgent').length} Alerts
            </div>
            <span className="text-xs text-[#DC2626] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">priority_high</span>
              Top-of-bulletin placement
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#DC2626]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">notification_important</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Audience Segments</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">5 Cohorts</div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">shield</span>
              RBAC Role Filtered
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">supervised_user_circle</span>
          </div>
        </div>
      </div>

      {/* Announcements Directory */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">newspaper</span>
              Church Bulletin & Announcement Hub
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Draft, schedule, and broadcast official news notices to targeted rolls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Target audience"
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">All Audiences</option>
              <option value="everyone">Public / Everyone</option>
              <option value="members-only">Members Only</option>
              <option value="ministry-leaders">Ministry Leaders</option>
              <option value="youth-roll">Youth & Discipleship Class</option>
              <option value="church-council">Church Council</option>
            </select>

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
              New Announcement
            </button>
          </div>
        </div>

        {/* Announcements Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-[12px] border transition-all flex flex-col justify-between ${
                ann.isPinned
                  ? 'bg-[#FDF8F3] border-[#C2410C]/40 ring-1 ring-[#C2410C]/20 shadow-sm'
                  : 'bg-[#FFFFFF] border-[#E7E5E4] hover:bg-[#FDF8F3]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ann.priority === 'urgent'
                          ? 'bg-[#DC2626]/10 text-[#DC2626]'
                          : ann.priority === 'high'
                          ? 'bg-[#D97706]/10 text-[#D97706]'
                          : 'bg-[#57534E]/10 text-[#57534E]'
                      }`}
                    >
                      {ann.priority}
                    </span>

                    <span className="px-2 py-0.2 rounded-full bg-[#E7E5E4]/80 text-[#1C1917] text-[10px] font-bold uppercase tracking-wider">
                      {ann.category}
                    </span>

                    <span className="px-2 py-0.2 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[10px] font-bold">
                      {ann.audienceLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(ann.id)}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      ann.isPinned ? 'text-[#C2410C] bg-[#C2410C]/10' : 'text-[#A8A29E] hover:text-[#1C1917]'
                    }`}
                    title={ann.isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">push_pin</span>
                  </button>
                </div>

                <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-1.5 leading-snug">
                  {ann.title}
                </h4>

                <p className="text-xs text-[#57534E] leading-relaxed line-clamp-3 mb-3">
                  {ann.content}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E7E5E4]/80 flex items-center justify-between text-[11px] text-[#A8A29E]">
                <div>
                  By <strong className="text-[#1C1917]">{ann.author}</strong> · <span className="font-mono">{ann.publishDate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="text-[#DC2626] hover:text-[#B91C1C] p-1 rounded transition-colors cursor-pointer"
                  title="Remove Bulletin"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Publish Announcement */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...dialogProps(() => setIsCreating(false), "Publish Announcement")}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Publish Announcement</h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="mt-4 space-y-4">
              <div>
                <label htmlFor="announcement-title" className="block text-xs font-bold text-[#1C1917] mb-1">Headline / Title *</label>
                <input id="announcement-title" aria-label="Headline / Title"
                  type="text"
                  required
                  placeholder="e.g. Reformation Heritage Dinner & Hymn Sing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="announcement-audience" className="block text-xs font-bold text-[#1C1917] mb-1">Target Audience</label>
                  <select id="announcement-audience" aria-label="Target Audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="everyone">Everyone (Public)</option>
                    <option value="members-only">Members Only</option>
                    <option value="ministry-leaders">Ministry Leaders</option>
                    <option value="youth-roll">Youth Roll</option>
                    <option value="church-council">Church Council</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="announcement-priority" className="block text-xs font-bold text-[#1C1917] mb-1">Priority</label>
                  <select id="announcement-priority" aria-label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="announcement-content" className="block text-xs font-bold text-[#1C1917] mb-1">Notice Content *</label>
                <textarea id="announcement-content" aria-label="Notice Content"
                  rows={4}
                  required
                  placeholder="Full bulletin notice body..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="announcement-category" className="block text-xs font-bold text-[#1C1917] mb-1">Category</label>
                  <select id="announcement-category" aria-label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="worship">Worship & Service</option>
                    <option value="ministry">Ministries & Classes</option>
                    <option value="stewardship">Stewardship & Mercy</option>
                    <option value="governance">Church Council</option>
                    <option value="community">Community Fellowship</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="announcement-author" className="block text-xs font-bold text-[#1C1917] mb-1">Author / Sign-off</label>
                  <input id="announcement-author" aria-label="Author / Sign-off"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                  Pin announcement to top of church notice board & mobile portal
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
